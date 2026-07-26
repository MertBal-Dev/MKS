import { TOPICS, TOPIC_IDS, type TopicId } from './constants';
import { gununSorulari, konuHavuzu } from './soruHavuzu';
import type { Exam, Question } from './types';

export const DAILY_EXAM_PREFIX = 'gunluk-';
/*
 * 50 soru / 60 dakikaydı. 30'a indirildi: günlük alışkanlık ancak
 * sürdürülebilirse işe yarar ve 50 soru her gün için ağır geliyordu.
 * Yan faydası, havuzun daha uzun süre tekrarsız gitmesi.
 */
export const DAILY_QUESTION_COUNT = 30;
export const DAILY_DURATION_MIN = 35;

/** Tarih anahtarını deterministik tohuma çevirir. */
function seedFromDate(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Günün Denemesi: tarihe göre deterministik, resmi konu ağırlıklarının
 * yarısıyla (toplam 50 soru) bankadan seçilmiş günlük mini deneme.
 * Aynı gün her cihazda aynı sınav üretilir; ertesi gün yenisi gelir.
 */
/**
 * Resmi ağırlıkları hedef soru sayısına ölçekler (en büyük kalan yöntemi):
 * tek sayılı ağırlıklarda bile toplam tam olarak DAILY_QUESTION_COUNT olur.
 */
function scaledCounts(target: number): Record<string, number> {
  const totalWeight = TOPIC_IDS.reduce((sum, id) => sum + TOPICS[id].examWeight, 0);
  const exact = TOPIC_IDS.map((id) => ({ id, v: (TOPICS[id].examWeight * target) / totalWeight }));
  const counts: Record<string, number> = {};
  let used = 0;
  for (const { id, v } of exact) {
    counts[id] = Math.floor(v);
    used += counts[id];
  }
  // Kalan kontenjanı en büyük ondalık artığı olanlara dağıt
  const remainders = exact
    .map(({ id, v }) => ({ id, r: v - Math.floor(v) }))
    .sort((a, b) => b.r - a.r || a.id.localeCompare(b.id));
  let i = 0;
  while (used < target && remainders.length > 0) {
    counts[remainders[i % remainders.length].id] += 1;
    used += 1;
    i += 1;
  }
  return counts;
}

/** Arşivin başlangıcı; gün indeksi buradan sayılır. */
const HAVUZ_BASLANGIC = '2026-07-01';

function gunIndeksi(dateKey: string): number {
  const fark = new Date(`${dateKey}T00:00:00Z`).getTime() - new Date(`${HAVUZ_BASLANGIC}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(fark / 86_400_000));
}

export function getDailyExam(dateKey: string): Exam {
  const rand = rng(seedFromDate(dateKey));
  const questions: Question[] = [];
  const counts = scaledCounts(DAILY_QUESTION_COUNT);
  const gun = gunIndeksi(dateKey);

  /*
   * Sorular havuzdan RASTGELE değil, DİLİMLENEREK alınır.
   * Rastgele seçim 30 günde kaçınılmaz olarak tekrar üretiyordu; dilimleme
   * her güne havuzun ayrı bir parçasını verir ve havuz bitene dek hiçbir soru
   * iki kez gelmez. Havuz artık banka + soru ailelerini birlikte kapsıyor.
   */
  for (const topicId of TOPIC_IDS) {
    questions.push(...gununSorulari(topicId, gun, counts[topicId]));
  }

  const label = new Date(`${dateKey}T12:00:00+03:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'Europe/Istanbul',
  });

  return {
    id: `${DAILY_EXAM_PREFIX}${dateKey}`,
    title: `Günün Denemesi — ${label}`,
    kind: 'deneme',
    note: 'Her güne özel 50 soru • 60 dakika. Yarın bambaşka bir set seni bekliyor.',
    questions: shuffled(questions, rand),
  };
}

/* ── Konu bazlı mini deneme ───────────────────────────────────────── */

export const MINI_EXAM_PREFIX = 'mini-';
export const MINI_QUESTION_COUNT = 20;
export const MINI_DURATION_MIN = 25;

/** Bir konudan kaç mini deneme çıkar? */
export function miniDenemeSayisi(topicId: TopicId): number {
  return Math.floor((konuHavuzu[topicId]?.length ?? 0) / MINI_QUESTION_COUNT);
}

/**
 * 'mini-<topicId>-<sira>' kimliğini sınava çevirir.
 *
 * 100 soruluk tam deneme, sınav kaygısı olan biri için caydırıcı olabiliyor.
 * 20 soruluk konu denemesi hem daha sık tekrarlanabilir hem de zayıf konuya
 * doğrudan yüklenmeyi mümkün kılar. Sorular günlük denemeyle aynı dilimleme
 * mantığından gelir, yani mini denemeler de birbirini tekrar etmez.
 */
export function resolveMiniExam(examId: string | undefined): Exam | undefined {
  if (!examId?.startsWith(MINI_EXAM_PREFIX)) return undefined;

  const rest = examId.slice(MINI_EXAM_PREFIX.length);
  const tire = rest.lastIndexOf('-');
  if (tire < 0) return undefined;

  const topicId = rest.slice(0, tire) as TopicId;
  const sira = Number(rest.slice(tire + 1));
  if (!TOPIC_IDS.includes(topicId) || !Number.isInteger(sira) || sira < 0) return undefined;

  const questions = gununSorulari(topicId, sira, MINI_QUESTION_COUNT);
  if (questions.length === 0) return undefined;

  return {
    id: examId,
    title: `${TOPICS[topicId].short} — ${sira + 1}. Mini Deneme`,
    kind: 'deneme',
    note: `${questions.length} soru • ${MINI_DURATION_MIN} dakika — tek konuya odaklan.`,
    questions,
  } as Exam;
}

/** examId'den sınavı çözümler: statik listede yoksa ve günlükse üretir. */
export function resolveDailyExam(examId: string | undefined): Exam | undefined {
  if (!examId || !examId.startsWith(DAILY_EXAM_PREFIX)) return undefined;
  const dateKey = examId.slice(DAILY_EXAM_PREFIX.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return undefined;
  return getDailyExam(dateKey);
}
