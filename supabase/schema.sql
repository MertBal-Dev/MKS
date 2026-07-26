-- ============================================================================
--  MKS Çalışma Odası — veritabanı şeması
--  Supabase SQL Editor'da tek seferde çalıştırılır. Tekrar çalıştırılabilir.
-- ============================================================================
--
--  KİMLİK DOĞRULAMA YAKLAŞIMI
--  Kullanıcı yalnızca KULLANICI ADI + ŞİFRE ile kayıt olur; e-posta sorulmaz,
--  doğrulama kodu gönderilmez. Bunu Supabase Auth üzerine kuruyoruz: kayıt
--  sırasında arka planda "<kullaniciadi>@mks.local" biçiminde sentetik bir
--  e-posta üretilir. Kullanıcı bunu ne görür ne yazar.
--
--  Neden kendi auth tablomuzu yazmıyoruz: Supabase Auth şifreyi bcrypt ile
--  saklar, JWT ve oturum yenilemeyi yönetir, RLS ile doğrudan çalışır.
--  Bunları elle yazmak, şifre saklama hatası yapma riskini boşuna alır.
--
--  ŞİFRE UNUTULURSA: en alttaki sifre_sifirla() fonksiyonuna bak.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Profil ──────────────────────────────────────────────────────────────────
-- auth.users'a 1-1 bağlanır; kullanıcı adı burada tutulur.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text,
  created_at   timestamptz not null default now(),
  constraint username_bicim check (username ~ '^[a-zA-Z0-9_]{3,24}$')
);

comment on table public.profiles is 'Kullanıcı adı ve görünen ad. Şifre auth.users içinde bcrypt ile saklanır.';

-- ── Ayarlar ─────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       text not null default 'dark'  check (theme in ('dark','light','system')),
  countdown   text not null default 'soft'  check (countdown in ('soft','full','hidden')),
  last_backup date,
  updated_at  timestamptz not null default now()
);

-- ── Soru denemeleri ─────────────────────────────────────────────────────────
-- Her kullanıcı-soru çifti tek satır; doğru/yanlış sayaçları birikir.
create table if not exists public.attempts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  correct     integer not null default 0 check (correct >= 0),
  wrong       integer not null default 0 check (wrong >= 0),
  last_result text    not null check (last_result in ('correct','wrong')),
  last_at     timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists attempts_user_last_at_idx on public.attempts (user_id, last_at desc);

-- ── Yanlış havuzu ───────────────────────────────────────────────────────────
-- Üst üste doğru bilinince havuzdan düşer; consecutive_correct onu sayar.
create table if not exists public.wrong_pool (
  user_id             uuid not null references auth.users(id) on delete cascade,
  question_id         text not null,
  added_at            timestamptz not null default now(),
  consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
  primary key (user_id, question_id)
);

-- ── İşaretli sorular ────────────────────────────────────────────────────────
create table if not exists public.flagged (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ── Aralıklı tekrar kartları (Leitner) ──────────────────────────────────────
create table if not exists public.srs_cards (
  user_id  uuid not null references auth.users(id) on delete cascade,
  card_id  text not null,
  box      smallint not null default 1 check (box between 1 and 5),
  due_at   timestamptz not null,
  primary key (user_id, card_id)
);

create index if not exists srs_due_idx on public.srs_cards (user_id, due_at);

-- ── Deneme sonuçları ────────────────────────────────────────────────────────
-- Aynı sınav birden çok kez çözülebilir; bu yüzden id ayrı bir sütun.
create table if not exists public.exam_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exam_id     text not null,
  finished_at timestamptz not null default now(),
  score       numeric(5,2) not null check (score >= 0 and score <= 100),
  correct     integer not null default 0,
  wrong       integer not null default 0,
  blank       integer not null default 0,
  by_topic    jsonb not null default '{}'::jsonb,
  answers     jsonb not null default '{}'::jsonb
);

create index if not exists exam_results_user_idx on public.exam_results (user_id, finished_at desc);
create index if not exists exam_results_exam_idx on public.exam_results (user_id, exam_id);

-- ── Çalışma planı ilerlemesi ────────────────────────────────────────────────
create table if not exists public.plan_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,          -- 'gun-2026-07-27:1' biçiminde
  done    boolean not null default false,
  primary key (user_id, goal_id)
);

-- ── Çalışma serisi ──────────────────────────────────────────────────────────
create table if not exists public.streak (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  last_study_day date,
  current        integer not null default 0 check (current >= 0),
  best           integer not null default 0 check (best >= 0)
);

-- ── Kendi yüklediği soru setleri ────────────────────────────────────────────
create table if not exists public.custom_sets (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  source_name text default '',
  created_at  timestamptz not null default now(),
  questions   jsonb not null default '[]'::jsonb,
  primary key (user_id, id)
);

-- ============================================================================
--  SATIR DÜZEYİ GÜVENLİK (RLS)
--  Herkes YALNIZCA kendi satırını görür ve değiştirebilir.
--  Bu olmadan anon anahtarını eline geçiren biri tüm veriyi okuyabilir.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','attempts','wrong_pool','flagged',
    'srs_cards','exam_results','plan_progress','streak','custom_sets'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    -- Tekrar çalıştırılabilirlik için önce düşür
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);

    if t = 'profiles' then
      execute format($f$create policy "%s_select" on public.%I for select using (auth.uid() = id)$f$, t, t);
      execute format($f$create policy "%s_insert" on public.%I for insert with check (auth.uid() = id)$f$, t, t);
      execute format($f$create policy "%s_update" on public.%I for update using (auth.uid() = id)$f$, t, t);
      execute format($f$create policy "%s_delete" on public.%I for delete using (auth.uid() = id)$f$, t, t);
    else
      execute format($f$create policy "%s_select" on public.%I for select using (auth.uid() = user_id)$f$, t, t);
      execute format($f$create policy "%s_insert" on public.%I for insert with check (auth.uid() = user_id)$f$, t, t);
      execute format($f$create policy "%s_update" on public.%I for update using (auth.uid() = user_id)$f$, t, t);
      execute format($f$create policy "%s_delete" on public.%I for delete using (auth.uid() = user_id)$f$, t, t);
    end if;
  end loop;
end $$;

-- ============================================================================
--  KAYIT: kullanıcı adı benzersizliği ve profil oluşturma
-- ============================================================================

-- Kullanıcı adı boşta mı? İstemci kayıt öncesi bunu çağırır (anon erişebilir).
create or replace function public.kullanici_adi_bos_mu(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

grant execute on function public.kullanici_adi_bos_mu(text) to anon, authenticated;

-- auth.users'a yeni kayıt düşünce profili otomatik kur.
-- Kullanıcı adı, kayıt sırasında raw_user_meta_data içinde gelir.
create or replace function public.yeni_kullanici_kur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;

  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  insert into public.streak  (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.yeni_kullanici_kur();

-- ============================================================================
--  YÖNETİCİ: ŞİFRE SIFIRLAMA
--
--  Şifre bcrypt ile saklanır, geri okunamaz — ve okunmaması doğrusudur:
--  veritabanı bir gün sızarsa düz metin şifre de sızar. Kullanıcı şifresini
--  unutursa SQL Editor'dan yenisini ATAYABİLİRSİN, ihtiyacın olan bu.
--
--    select public.sifre_sifirla('duygu', 'yeniSifre123');
-- ============================================================================

create or replace function public.sifre_sifirla(p_username text, p_yeni_sifre text)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles where lower(username) = lower(p_username);
  if v_id is null then
    return format('Kullanıcı bulunamadı: %s', p_username);
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_yeni_sifre, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_id;

  return format('%s kullanıcısının şifresi güncellendi.', p_username);
end $$;

-- Bu fonksiyon YALNIZCA SQL Editor'dan (postgres rolüyle) çağrılmalıdır.
revoke execute on function public.sifre_sifirla(text, text) from anon, authenticated;

-- ============================================================================
--  KULLANIŞLI GÖRÜNÜM: kimin ne kadar çalıştığı
-- ============================================================================

create or replace view public.calisma_ozeti as
select
  p.id                                              as user_id,
  p.username,
  coalesce(sum(a.correct), 0)::int                  as dogru,
  coalesce(sum(a.wrong), 0)::int                    as yanlis,
  count(distinct a.question_id)::int                as goruldugu_soru,
  (select count(*) from public.exam_results e where e.user_id = p.id)::int as deneme_sayisi,
  s.current                                         as guncel_seri,
  s.best                                            as en_uzun_seri
from public.profiles p
left join public.attempts a on a.user_id = p.id
left join public.streak   s on s.user_id = p.id
group by p.id, p.username, s.current, s.best;

-- Görünüm de RLS'e tabi olsun (çağıranın haklarıyla çalışır)
alter view public.calisma_ozeti set (security_invoker = true);

-- ============================================================================
--  BİTTİ
--  Sonraki adım: Supabase panelinde Authentication → Providers → Email
--  bölümünde "Confirm email" seçeneğini KAPAT. Sentetik e-posta kullandığımız
--  için doğrulama maili gönderilmemeli.
-- ============================================================================
