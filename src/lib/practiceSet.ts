import type { TopicId } from './constants';
import type { Question } from './types';
import type { AppState } from './storage';

export interface PracticeFilters {
  topics?: TopicId[];
  difficulty?: (1 | 2 | 3)[];
  status?: 'all' | 'unseen' | 'wrong' | 'flagged';
  count?: number;
  /** Deterministik karıştırma için; verilmezse rastgele. */
  seed?: number;
}

/** mulberry32 — küçük, deterministik PRNG. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildPracticeSet(
  bank: Question[],
  attempts: AppState['attempts'],
  wrongPool: AppState['wrongPool'],
  flagged: string[],
  filters: PracticeFilters,
): Question[] {
  const rand = rng(filters.seed ?? Math.floor(Math.random() * 2 ** 31));

  let pool = bank;
  if (filters.topics && filters.topics.length > 0) {
    pool = pool.filter((q) => filters.topics!.includes(q.topicId));
  }
  if (filters.difficulty && filters.difficulty.length > 0) {
    pool = pool.filter((q) => filters.difficulty!.includes(q.difficulty));
  }
  switch (filters.status) {
    case 'unseen':
      pool = pool.filter((q) => !attempts[q.id]);
      break;
    case 'wrong':
      pool = pool.filter((q) => wrongPool[q.id]);
      break;
    case 'flagged':
      pool = pool.filter((q) => flagged.includes(q.id));
      break;
  }

  // Az çözülmüşe öncelik: (deneme sayısı, rastgele) ikilisine göre sırala
  const keyed = pool.map((q) => {
    const a = attempts[q.id];
    const tries = a ? a.correct + a.wrong : 0;
    return { q, tries, r: rand() };
  });
  keyed.sort((x, y) => x.tries - y.tries || x.r - y.r);

  const ordered = keyed.map((k) => k.q);
  return filters.count ? ordered.slice(0, filters.count) : ordered;
}
