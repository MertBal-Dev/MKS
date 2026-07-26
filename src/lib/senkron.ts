import { supabase, supabaseVar } from './supabase';
import { DEFAULT_STATE, type AppState } from './storage';
import { CustomSetSchema, loadSets, saveSets, type CustomSet } from './customSets';

/**
 * localStorage ile Supabase arasındaki senkron katmanı.
 *
 * Tasarım ilkesi: uygulama ÖNCE yerelde çalışır. Ağ yoksa, giriş yapılmamışsa
 * ya da sunucu ayarları eksikse her şey eskisi gibi localStorage üzerinden
 * yürür. Sunucu yalnızca ilerlemeyi cihazlar arasında taşıyan bir katman —
 * uygulamanın çalışması ona bağlı değil.
 *
 * Yazma gecikmeli ve fark tabanlıdır: her soru cevaplandığında 900 satır
 * gönderilmez, yalnızca son gönderimden bu yana değişen satırlar gider.
 */

export type SenkronDurum = 'kapali' | 'cekiliyor' | 'yaziliyor' | 'guncel' | 'hata';

export interface SenkronBilgi {
  durum: SenkronDurum;
  /** Son başarılı yazmanın zamanı (ISO). */
  sonYazma?: string;
  hata?: string;
}

/** Sunucudan okunan kısmi durum — hiçbir dilim zorunlu değil. */
export type UzakDurum = Partial<Omit<AppState, 'version'>>;

/** Senkronun taşıdığı her şey: ana durum + kullanıcının kendi soru setleri. */
export interface Anlik {
  state: AppState;
  setler: CustomSet[];
}

const KULLANICI_ANAHTARI = 'mks:senkron-kullanici';

// ─── Birleştirme ────────────────────────────────────────────────────────────

/**
 * Yerel durum ile sunucudaki durumu birleştirir.
 *
 * Temel kural: BİRLEŞTİRME VERİ SİLMEZ. Telefonda çözülen soruyla bilgisayarda
 * çözülen soru aynı hesapta buluştuğunda hangisinin "doğru" olduğuna karar
 * vermeye çalışmak yerine ikisini de koruruz. Bir öğrencinin emeğini yanlış
 * bir çakışma kuralı yüzünden silmek, birkaç fazla sayılmış denemeden çok
 * daha kötü bir hata.
 *
 * Silme yalnızca kullanıcının açık eylemiyle olur (işareti kaldırmak gibi) ve
 * o eylem sunucuya ayrıca bildirilir — birleştirme üzerinden değil.
 */
export function birlestir(yerel: AppState, uzak: UzakDurum): AppState {
  // Denemeler: sayaçlar her cihazda ayrı birikir, gerçek toplam bilinemez.
  // En yüksek değeri almak, hiçbir çalışmayı yok saymayan tek seçenek.
  const attempts: AppState['attempts'] = { ...yerel.attempts };
  for (const [id, u] of Object.entries(uzak.attempts ?? {})) {
    const y = attempts[id];
    if (!y) {
      attempts[id] = u;
      continue;
    }
    const uzakDahaYeni = u.lastAt > y.lastAt;
    attempts[id] = {
      correct: Math.max(y.correct, u.correct),
      wrong: Math.max(y.wrong, u.wrong),
      lastResult: uzakDahaYeni ? u.lastResult : y.lastResult,
      lastAt: uzakDahaYeni ? u.lastAt : y.lastAt,
    };
  }

  // Yanlış havuzu: havuza en son giren kayıt geçerli. Eşit tarihte, üst üste
  // doğru sayısının yükseği alınır — ilerlemeyi geri almamak için.
  const wrongPool: AppState['wrongPool'] = { ...yerel.wrongPool };
  for (const [id, u] of Object.entries(uzak.wrongPool ?? {})) {
    const y = wrongPool[id];
    if (!y) {
      wrongPool[id] = u;
      continue;
    }
    if (u.addedAt > y.addedAt) wrongPool[id] = u;
    else if (u.addedAt === y.addedAt) {
      wrongPool[id] = {
        addedAt: y.addedAt,
        consecutiveCorrect: Math.max(y.consecutiveCorrect, u.consecutiveCorrect),
      };
    }
  }

  // Tekrar kartları: yüksek kutu = daha çok tekrar edilmiş kart.
  const srs: AppState['srs'] = { ...yerel.srs };
  for (const [id, u] of Object.entries(uzak.srs ?? {})) {
    const y = srs[id];
    if (!y) srs[id] = u;
    else if (u.box > y.box) srs[id] = u;
    else if (u.box === y.box && u.dueAt > y.dueAt) srs[id] = u;
  }

  // Deneme sonuçları değişmez olaylardır: aynı sınav + aynı bitiş anı aynı
  // kayıttır. Birleşim alınır, kronolojik sıraya konur (arayüz sonuncuyu
  // dizinin sonunda arıyor).
  const sinavlar = new Map<string, AppState['examResults'][number]>();
  for (const r of [...yerel.examResults, ...(uzak.examResults ?? [])]) {
    sinavlar.set(`${r.examId}|${r.finishedAt}`, r);
  }
  const examResults = [...sinavlar.values()].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

  // Plan hedefleri: bir kez tamamlandıysa tamamlanmıştır.
  const planProgress: AppState['planProgress'] = { ...yerel.planProgress };
  for (const [id, u] of Object.entries(uzak.planProgress ?? {})) {
    planProgress[id] = planProgress[id] || u;
  }

  const uzakSeri = uzak.streak;
  const streak = uzakSeri
    ? {
        lastStudyDay:
          uzakSeri.lastStudyDay > yerel.streak.lastStudyDay ? uzakSeri.lastStudyDay : yerel.streak.lastStudyDay,
        current: Math.max(yerel.streak.current, uzakSeri.current),
        best: Math.max(yerel.streak.best, uzakSeri.best),
      }
    : yerel.streak;

  // Ayarlar tercihtir, ilerleme değil: yerelde hiç dokunulmamışsa (varsayılan)
  // sunucudaki tercih alınır. Kullanıcı bu cihazda bir seçim yaptıysa o kalır.
  const yerelVarsayilan = JSON.stringify(yerel.settings) === JSON.stringify(DEFAULT_STATE.settings);
  const settings = yerelVarsayilan && uzak.settings ? uzak.settings : yerel.settings;

  return {
    version: 1,
    settings,
    attempts,
    flagged: [...new Set([...yerel.flagged, ...(uzak.flagged ?? [])])].sort(),
    wrongPool,
    srs,
    examResults,
    planProgress,
    streak,
    lastBackup: (uzak.lastBackup ?? '') > yerel.lastBackup ? uzak.lastBackup! : yerel.lastBackup,
  };
}

/** Soru setleri: kimliğe göre birleşim, çakışmada daha yeni oluşturulan. */
export function setleriBirlestir(yerel: CustomSet[], uzak: CustomSet[]): CustomSet[] {
  const harita = new Map<string, CustomSet>();
  for (const s of [...uzak, ...yerel]) {
    const varolan = harita.get(s.id);
    if (!varolan || s.createdAt > varolan.createdAt) harita.set(s.id, s);
  }
  return [...harita.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Yardımcılar ────────────────────────────────────────────────────────────

/**
 * Postgres zaman damgalarını yerelin yazdığı biçime çevirir.
 *
 * Sunucu "…+00:00", `toISOString()` ise "…Z" üretir. Aynı anı gösteren bu iki
 * metin karşılaştırıldığında farklı çıkar; normalleştirmezsek her senkronda
 * "değişmiş" sayılıp aynı satırlar tekrar tekrar gönderilir.
 */
function isoya(x: unknown): string {
  if (typeof x !== 'string' || !x) return '';
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function gun(x: unknown): string {
  return typeof x === 'string' && x ? x.slice(0, 10) : '';
}

function parcala<T>(dizi: T[], boyut: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < dizi.length; i += boyut) out.push(dizi.slice(i, i + boyut));
  return out;
}

function farkliMi(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Anahtarlı sözlükler için değişen ve silinen anahtarlar. */
function kayitFarki<T>(yeni: Record<string, T>, eski: Record<string, T>) {
  const degisen: string[] = [];
  for (const k of Object.keys(yeni)) if (farkliMi(yeni[k], eski[k])) degisen.push(k);
  const silinen = Object.keys(eski).filter((k) => !(k in yeni));
  return { degisen, silinen };
}

// ─── Sunucu erişimi ─────────────────────────────────────────────────────────

type Satir = Record<string, unknown>;

async function oku(tablo: string, kullaniciId: string): Promise<Satir[]> {
  const { data, error } = await supabase!.from(tablo).select('*').eq('user_id', kullaniciId);
  if (error) throw new Error(`${tablo} okunamadı: ${error.message}`);
  return (data ?? []) as Satir[];
}

async function yaz(tablo: string, satirlar: Satir[], onConflict: string): Promise<void> {
  if (!satirlar.length) return;
  for (const p of parcala(satirlar, 400)) {
    const { error } = await supabase!.from(tablo).upsert(p, { onConflict });
    if (error) throw new Error(`${tablo} yazılamadı: ${error.message}`);
  }
}

async function sil(tablo: string, sutun: string, kullaniciId: string, idler: string[]): Promise<void> {
  if (!idler.length) return;
  for (const p of parcala(idler, 200)) {
    const { error } = await supabase!.from(tablo).delete().eq('user_id', kullaniciId).in(sutun, p);
    if (error) throw new Error(`${tablo} silinemedi: ${error.message}`);
  }
}

/** Sunucudaki her şeyi okur ve AppState biçimine çevirir. */
export async function uzaktanCek(kullaniciId: string): Promise<Anlik> {
  const [ayarlar, denemeler, havuz, isaretli, kartlar, sonuclar, plan, seri, setler] = await Promise.all([
    oku('settings', kullaniciId),
    oku('attempts', kullaniciId),
    oku('wrong_pool', kullaniciId),
    oku('flagged', kullaniciId),
    oku('srs_cards', kullaniciId),
    oku('exam_results', kullaniciId),
    oku('plan_progress', kullaniciId),
    oku('streak', kullaniciId),
    oku('custom_sets', kullaniciId),
  ]);

  const durum: UzakDurum = {};

  const a = ayarlar[0];
  if (a) {
    durum.settings = {
      theme: (a.theme as AppState['settings']['theme']) ?? 'dark',
      countdown: (a.countdown as AppState['settings']['countdown']) ?? 'soft',
    };
    durum.lastBackup = gun(a.last_backup);
  }

  durum.attempts = Object.fromEntries(
    denemeler.map((r) => [
      String(r.question_id),
      {
        correct: Number(r.correct) || 0,
        wrong: Number(r.wrong) || 0,
        lastResult: (r.last_result === 'wrong' ? 'wrong' : 'correct') as 'correct' | 'wrong',
        lastAt: isoya(r.last_at),
      },
    ]),
  );

  durum.wrongPool = Object.fromEntries(
    havuz.map((r) => [
      String(r.question_id),
      { addedAt: isoya(r.added_at), consecutiveCorrect: Number(r.consecutive_correct) || 0 },
    ]),
  );

  durum.flagged = isaretli.map((r) => String(r.question_id));

  durum.srs = Object.fromEntries(
    kartlar.map((r) => [
      String(r.card_id),
      { box: (Number(r.box) || 1) as 1 | 2 | 3 | 4 | 5, dueAt: isoya(r.due_at) },
    ]),
  );

  durum.examResults = sonuclar.map((r) => ({
    examId: String(r.exam_id),
    finishedAt: isoya(r.finished_at),
    score: Number(r.score) || 0,
    correct: Number(r.correct) || 0,
    wrong: Number(r.wrong) || 0,
    blank: Number(r.blank) || 0,
    byTopic: (r.by_topic ?? {}) as AppState['examResults'][number]['byTopic'],
    answers: (r.answers ?? {}) as AppState['examResults'][number]['answers'],
  }));

  durum.planProgress = Object.fromEntries(plan.map((r) => [String(r.goal_id), Boolean(r.done)]));

  const s = seri[0];
  if (s) {
    durum.streak = {
      lastStudyDay: gun(s.last_study_day),
      current: Number(s.current) || 0,
      best: Number(s.best) || 0,
    };
  }

  // Sunucudaki set bozuksa tüm senkronu düşürmesin — geçerli olanları al.
  const gecerliSetler: CustomSet[] = [];
  for (const r of setler) {
    const ayrist = CustomSetSchema.safeParse({
      id: String(r.id),
      title: String(r.title ?? 'Adsız set'),
      sourceName: String(r.source_name ?? ''),
      createdAt: isoya(r.created_at),
      questions: r.questions ?? [],
    });
    if (ayrist.success) gecerliSetler.push(ayrist.data);
  }

  return { state: { ...DEFAULT_STATE, ...durum, version: 1 }, setler: gecerliSetler };
}

/**
 * Son gönderimden bu yana değişenleri sunucuya yazar.
 *
 * `eski`, sunucuda olduğu bilinen son durumdur. İlk çağrıda uzaktan çekilen
 * durum verilir; böylece yalnızca sunucuda eksik olan satırlar gider.
 */
export async function uzagaGonder(kullaniciId: string, yeni: Anlik, eski: Anlik): Promise<void> {
  const y = yeni.state;
  const e = eski.state;

  if (farkliMi(y.settings, e.settings) || y.lastBackup !== e.lastBackup) {
    await yaz(
      'settings',
      [
        {
          user_id: kullaniciId,
          theme: y.settings.theme,
          countdown: y.settings.countdown,
          last_backup: y.lastBackup || null,
          updated_at: new Date().toISOString(),
        },
      ],
      'user_id',
    );
  }

  const den = kayitFarki(y.attempts, e.attempts);
  await yaz(
    'attempts',
    den.degisen.map((id) => ({
      user_id: kullaniciId,
      question_id: id,
      correct: y.attempts[id].correct,
      wrong: y.attempts[id].wrong,
      last_result: y.attempts[id].lastResult,
      last_at: y.attempts[id].lastAt || new Date().toISOString(),
    })),
    'user_id,question_id',
  );
  await sil('attempts', 'question_id', kullaniciId, den.silinen);

  const hav = kayitFarki(y.wrongPool, e.wrongPool);
  await yaz(
    'wrong_pool',
    hav.degisen.map((id) => ({
      user_id: kullaniciId,
      question_id: id,
      added_at: y.wrongPool[id].addedAt || new Date().toISOString(),
      consecutive_correct: y.wrongPool[id].consecutiveCorrect,
    })),
    'user_id,question_id',
  );
  await sil('wrong_pool', 'question_id', kullaniciId, hav.silinen);

  const eskiIsaret = new Set(e.flagged);
  const yeniIsaret = new Set(y.flagged);
  await yaz(
    'flagged',
    y.flagged.filter((id) => !eskiIsaret.has(id)).map((id) => ({ user_id: kullaniciId, question_id: id })),
    'user_id,question_id',
  );
  await sil('flagged', 'question_id', kullaniciId, e.flagged.filter((id) => !yeniIsaret.has(id)));

  const kart = kayitFarki(y.srs, e.srs);
  await yaz(
    'srs_cards',
    kart.degisen.map((id) => ({
      user_id: kullaniciId,
      card_id: id,
      box: y.srs[id].box,
      due_at: y.srs[id].dueAt || new Date().toISOString(),
    })),
    'user_id,card_id',
  );
  await sil('srs_cards', 'card_id', kullaniciId, kart.silinen);

  // Deneme sonuçları değişmez: yalnızca sunucuda olmayanlar eklenir. Birincil
  // anahtar rastgele uuid olduğu için upsert değil insert kullanılıyor.
  const bilinen = new Set(e.examResults.map((r) => `${r.examId}|${r.finishedAt}`));
  const yeniSonuclar = y.examResults.filter((r) => !bilinen.has(`${r.examId}|${r.finishedAt}`));
  if (yeniSonuclar.length) {
    for (const p of parcala(yeniSonuclar, 100)) {
      const { error } = await supabase!.from('exam_results').insert(
        p.map((r) => ({
          user_id: kullaniciId,
          exam_id: r.examId,
          finished_at: r.finishedAt,
          score: Math.min(100, Math.max(0, Number(r.score.toFixed(2)))),
          correct: r.correct,
          wrong: r.wrong,
          blank: r.blank,
          by_topic: r.byTopic,
          answers: r.answers,
        })),
      );
      if (error) throw new Error(`exam_results yazılamadı: ${error.message}`);
    }
  }

  const pl = kayitFarki(y.planProgress, e.planProgress);
  await yaz(
    'plan_progress',
    pl.degisen.map((id) => ({ user_id: kullaniciId, goal_id: id, done: y.planProgress[id] })),
    'user_id,goal_id',
  );
  await sil('plan_progress', 'goal_id', kullaniciId, pl.silinen);

  if (farkliMi(y.streak, e.streak)) {
    await yaz(
      'streak',
      [
        {
          user_id: kullaniciId,
          last_study_day: y.streak.lastStudyDay || null,
          current: y.streak.current,
          best: y.streak.best,
        },
      ],
      'user_id',
    );
  }

  const eskiSet = new Map(eski.setler.map((s) => [s.id, s]));
  const degisenSetler = yeni.setler.filter((s) => farkliMi(s, eskiSet.get(s.id)));
  await yaz(
    'custom_sets',
    degisenSetler.map((s) => ({
      user_id: kullaniciId,
      id: s.id,
      title: s.title,
      source_name: s.sourceName,
      created_at: s.createdAt,
      questions: s.questions,
    })),
    'user_id,id',
  );
  const yeniSetIdler = new Set(yeni.setler.map((s) => s.id));
  await sil('custom_sets', 'id', kullaniciId, eski.setler.filter((s) => !yeniSetIdler.has(s.id)).map((s) => s.id));
}

// ─── Motor ──────────────────────────────────────────────────────────────────

export interface SenkronMotoru {
  /** Oturum açıldığında çağrılır; birleştirilmiş durumu döner. */
  baslat(kullaniciId: string, yerel: AppState): Promise<AppState>;
  /** Yerel değişiklikten sonra çağrılır. Yazma geciktirilir ve tekilleştirilir. */
  planla(state: AppState): void;
  /** Bekleyen yazmayı hemen gönderir (sekme kapanırken). */
  hemenGonder(): Promise<void>;
  /** Oturum kapandığında motoru durdurur. */
  durdur(): void;
}

/** Yazma gecikmesi: arka arkaya cevaplanan sorular tek istekte toplanır. */
const GECIKME_MS = 1500;

export function senkronKur(bildir: (b: SenkronBilgi) => void): SenkronMotoru {
  let kullaniciId: string | null = null;
  let gonderilen: Anlik | null = null;
  let bekleyen: AppState | null = null;
  let zamanlayici: ReturnType<typeof setTimeout> | null = null;
  let yaziyor = false;

  const gonder = async () => {
    if (!kullaniciId || !gonderilen || yaziyor) return;
    const state = bekleyen ?? gonderilen.state;
    const setler = loadSets();
    const anlik: Anlik = { state, setler };
    if (!farkliMi(anlik, gonderilen)) {
      bekleyen = null;
      return;
    }

    yaziyor = true;
    bildir({ durum: 'yaziliyor' });
    try {
      await uzagaGonder(kullaniciId, anlik, gonderilen);
      gonderilen = structuredClone(anlik);
      bekleyen = null;
      bildir({ durum: 'guncel', sonYazma: new Date().toISOString() });
    } catch (e) {
      // `gonderilen` güncellenmiyor: aynı fark bir sonraki denemede yeniden
      // gönderilir. Uygulama hiç açılmadan kapansa bile veri kaybolmaz —
      // localStorage tam durumu tutuyor ve `baslat` onu sunucuyla birleştirip
      // eksikleri yeniden yolluyor. Ağ kesintisi gecikme yaratır, kayıp değil.
      bildir({ durum: 'hata', hata: e instanceof Error ? e.message : 'Bilinmeyen hata' });
    } finally {
      yaziyor = false;
      if (bekleyen) planlaYaz();
    }
  };

  const planlaYaz = () => {
    if (zamanlayici) clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => void gonder(), GECIKME_MS);
  };

  return {
    async baslat(id, yerel) {
      kullaniciId = id;
      bildir({ durum: 'cekiliyor' });

      // Bu cihazda başka bir hesap açıksa onun verisiyle karışmasın.
      const onceki = localStorage.getItem(KULLANICI_ANAHTARI);
      const temizBaslangic = onceki !== null && onceki !== id;
      const baslangicDurum = temizBaslangic ? structuredClone(DEFAULT_STATE) : yerel;
      const baslangicSetler = temizBaslangic ? [] : loadSets();

      try {
        const uzak = await uzaktanCek(id);
        const birlesik = birlestir(baslangicDurum, uzak.state);
        const setler = setleriBirlestir(baslangicSetler, uzak.setler);
        saveSets(setler);
        localStorage.setItem(KULLANICI_ANAHTARI, id);

        // Sunucuda olduğu bilinen durum bu; ilk yazma yalnızca farkı gönderir.
        gonderilen = structuredClone(uzak);
        bekleyen = birlesik;
        planlaYaz();
        bildir({ durum: 'guncel', sonYazma: new Date().toISOString() });
        return birlesik;
      } catch (e) {
        bildir({ durum: 'hata', hata: e instanceof Error ? e.message : 'Sunucuya ulaşılamadı' });
        // Çekme başarısız: uygulama yerel veriyle çalışmayı sürdürür.
        return baslangicDurum;
      }
    },

    planla(state) {
      if (!kullaniciId) return;
      bekleyen = state;
      planlaYaz();
    },

    async hemenGonder() {
      if (zamanlayici) clearTimeout(zamanlayici);
      await gonder();
    },

    durdur() {
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = null;
      kullaniciId = null;
      gonderilen = null;
      bekleyen = null;
      bildir({ durum: 'kapali' });
    },
  };
}

export const senkronKullanilabilir = supabaseVar;
