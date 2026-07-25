import { questionBank } from '@/content/index';
import { TOPICS, TOPIC_IDS } from './constants';
import type { Exam, Question } from './types';

export const DAILY_EXAM_PREFIX = 'gunluk-';
export const DAILY_QUESTION_COUNT = 50;
export const DAILY_DURATION_MIN = 60;

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

export function getDailyExam(dateKey: string): Exam {
  const rand = rng(seedFromDate(dateKey));
  const questions: Question[] = [];
  const counts = scaledCounts(DAILY_QUESTION_COUNT);

  for (const topicId of TOPIC_IDS) {
    const pool = questionBank.filter((q) => q.topicId === topicId);
    questions.push(...shuffled(pool, rand).slice(0, counts[topicId]));
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

/** examId'den sınavı çözümler: statik listede yoksa ve günlükse üretir. */
export function resolveDailyExam(examId: string | undefined): Exam | undefined {
  if (!examId || !examId.startsWith(DAILY_EXAM_PREFIX)) return undefined;
  const dateKey = examId.slice(DAILY_EXAM_PREFIX.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return undefined;
  return getDailyExam(dateKey);
}
