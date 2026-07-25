import type { AppState } from './storage';

const GRADUATION_STREAK = 2;

/**
 * Yanlış havuzu kuralları:
 * - yanlış cevap → havuza ekle (varsa sayacı sıfırla)
 * - doğru cevap → havuzdaysa sayaç +1; üst üste 2 doğruda havuzdan çıkar
 * - havuzda değilse doğru cevap havuzu değiştirmez
 */
export function recordAnswer(
  pool: AppState['wrongPool'],
  questionId: string,
  result: 'correct' | 'wrong',
  now: Date,
): AppState['wrongPool'] {
  const next = { ...pool };
  const entry = next[questionId];

  if (result === 'wrong') {
    next[questionId] = { addedAt: entry?.addedAt ?? now.toISOString(), consecutiveCorrect: 0 };
    return next;
  }

  if (!entry) return next;
  const consecutiveCorrect = entry.consecutiveCorrect + 1;
  if (consecutiveCorrect >= GRADUATION_STREAK) {
    delete next[questionId];
  } else {
    next[questionId] = { ...entry, consecutiveCorrect };
  }
  return next;
}
