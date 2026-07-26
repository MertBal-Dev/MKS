import { createClient, type Session } from '@supabase/supabase-js';

/**
 * Supabase istemcisi ve kullanıcı adı tabanlı kimlik doğrulama.
 *
 * Kullanıcı yalnızca KULLANICI ADI + ŞİFRE girer. E-posta sorulmaz, doğrulama
 * kodu gönderilmez. Arka planda "<kullaniciadi>@mks.local" biçiminde sentetik
 * bir e-posta üretilir; kullanıcı bunu ne görür ne yazar.
 *
 * Kendi auth tablomuzu yazmak yerine Supabase Auth kullanılıyor: şifre bcrypt
 * ile saklanıyor, oturum yenileme ve RLS entegrasyonu hazır geliyor. Şifre
 * saklamada hata yapma riskini boşuna almanın anlamı yok.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Ayarlar eksikse uygulama çevrimdışı (yalnızca localStorage) çalışmaya devam eder. */
export const supabaseVar = Boolean(url && anonKey);

export const supabase = supabaseVar
  ? createClient(url!, anonKey!, {
      // URL'de oturum aramaya gerek yok: e-posta bağlantısı/OAuth kullanmıyoruz.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/**
 * Sentetik e-posta alanı — gerçek posta kutusu değildir, mail gönderilmez.
 *
 * '.local' kullanılamıyor: Supabase onu geçersiz e-posta sayıp
 * "email_address_invalid" ile 400 döndürüyor. Geçerli bir TLD gerekiyor.
 */
const ALAN = 'mkscalisma.com';

const KULLANICI_ADI_DESENI = /^[a-zA-Z0-9_]{3,24}$/;

export function kullaniciAdiGecerliMi(ad: string): string | null {
  if (!KULLANICI_ADI_DESENI.test(ad)) {
    return 'Kullanıcı adı 3-24 karakter olmalı; harf, rakam ve alt çizgi kullanabilirsin.';
  }
  return null;
}

export function sifreGecerliMi(sifre: string): string | null {
  if (sifre.length < 6) return 'Şifre en az 6 karakter olmalı.';
  return null;
}

function epostaya(kullaniciAdi: string): string {
  return `${kullaniciAdi.toLowerCase()}@${ALAN}`;
}

/** Supabase'in İngilizce hata metinlerini anlaşılır Türkçeye çevirir. */
function hataMesaji(mesaj: string): string {
  const m = mesaj.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Kullanıcı adı veya şifre hatalı.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Bu kullanıcı adı alınmış. Başka bir tane dene.';
  }
  if (m.includes('email address') && m.includes('invalid')) {
    return 'Kullanıcı adında yalnızca harf, rakam ve alt çizgi kullan.';
  }
  if (m.includes('password')) return 'Şifre çok kısa — en az 6 karakter olmalı.';
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  }
  // Doğrulama maili göndermeye çalışıldığında görülür; panelde "Confirm email"
  // kapalı olmalı — sentetik adrese mail gitmesinin bir anlamı yok.
  if (m.includes('rate limit')) {
    return 'Sunucu şu an kayıt alamıyor. Supabase panelinde "Confirm email" kapalı olmalı.';
  }
  return mesaj;
}

export interface AuthSonuc {
  ok: boolean;
  hata?: string;
}

export async function kayitOl(kullaniciAdi: string, sifre: string, gorunenAd?: string): Promise<AuthSonuc> {
  if (!supabase) return { ok: false, hata: 'Sunucu ayarları eksik.' };

  const { error } = await supabase.auth.signUp({
    email: epostaya(kullaniciAdi),
    password: sifre,
    options: {
      // Profil tetikleyicisi bu alanı okuyup public.profiles satırını açar
      data: { username: kullaniciAdi, display_name: gorunenAd || kullaniciAdi },
    },
  });

  if (error) return { ok: false, hata: hataMesaji(error.message) };
  return { ok: true };
}

export async function girisYap(kullaniciAdi: string, sifre: string): Promise<AuthSonuc> {
  if (!supabase) return { ok: false, hata: 'Sunucu ayarları eksik.' };

  const { error } = await supabase.auth.signInWithPassword({
    email: epostaya(kullaniciAdi),
    password: sifre,
  });

  if (error) return { ok: false, hata: hataMesaji(error.message) };
  return { ok: true };
}

export async function cikisYap(): Promise<void> {
  await supabase?.auth.signOut();
}

export async function oturumAl(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Oturum değişimlerini dinler; bileşenler buna abone olur. */
export function oturumIzle(dinleyici: (s: Session | null) => void): () => void {
  if (!supabase) {
    dinleyici(null);
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((_olay, session) => dinleyici(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Ayarlar'daki "giriş yap" düğmesi, oturum kapısına bu olayla haber verir.
 * Giriş ekranını bir kez atlamış olmak, sonradan giriş yapmayı engellememeli.
 */
export const GIRISE_DON = 'mks:girise-don';

/** Oturumdaki kullanıcının adı — sentetik e-postadan ya da metadata'dan. */
export function kullaniciAdi(s: Session | null): string {
  if (!s?.user) return '';
  const meta = s.user.user_metadata as { username?: string } | undefined;
  return meta?.username ?? s.user.email?.split('@')[0] ?? '';
}
