import { describe, expect, it } from 'vitest';
import { reviewCard, dueCards, BOX_INTERVALS_DAYS } from './srs';

const NOW = new Date('2026-07-25T12:00:00+03:00');

describe('reviewCard', () => {
  it('doğru cevap kutuyu yükseltir ve dueAt aralık kadar ilerler', () => {
    const next = reviewCard({ box: 2, dueAt: NOW.toISOString() }, 'correct', NOW);
    expect(next.box).toBe(3);
    const expected = new Date(NOW.getTime() + BOX_INTERVALS_DAYS[3] * 86_400_000);
    expect(next.dueAt).toBe(expected.toISOString());
  });

  it('5. kutuda doğru → 5\'te kalır', () => {
    expect(reviewCard({ box: 5, dueAt: NOW.toISOString() }, 'correct', NOW).box).toBe(5);
  });

  it('yanlış cevap kutuyu 1\'e düşürür', () => {
    const next = reviewCard({ box: 4, dueAt: NOW.toISOString() }, 'wrong', NOW);
    expect(next.box).toBe(1);
    expect(next.dueAt).toBe(NOW.toISOString()); // kutu 1 aralığı 0 gün → hemen tekrar
  });
});

describe('dueCards', () => {
  it('vadesi gelenleri döner', () => {
    const srs = {
      k1: { box: 2 as const, dueAt: '2026-07-24T00:00:00.000Z' },
      k2: { box: 3 as const, dueAt: '2026-07-30T00:00:00.000Z' },
      k3: { box: 1 as const, dueAt: NOW.toISOString() },
    };
    expect(dueCards(srs, NOW).sort()).toEqual(['k1', 'k3']);
  });
});
