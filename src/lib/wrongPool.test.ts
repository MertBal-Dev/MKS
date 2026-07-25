import { describe, expect, it } from 'vitest';
import { recordAnswer } from './wrongPool';

const NOW = new Date('2026-07-25T12:00:00+03:00');

describe('recordAnswer', () => {
  it('yanlış cevap soruyu havuza ekler', () => {
    const pool = recordAnswer({}, 'q1', 'wrong', NOW);
    expect(pool['q1']).toEqual({ addedAt: NOW.toISOString(), consecutiveCorrect: 0 });
  });

  it('havuzdaki soruda yanlış → sayaç sıfırlanır', () => {
    const pool = recordAnswer({ q1: { addedAt: 'x', consecutiveCorrect: 1 } }, 'q1', 'wrong', NOW);
    expect(pool['q1'].consecutiveCorrect).toBe(0);
  });

  it('havuzdaki soruda 1. doğru → sayaç 1', () => {
    const pool = recordAnswer({ q1: { addedAt: 'x', consecutiveCorrect: 0 } }, 'q1', 'correct', NOW);
    expect(pool['q1'].consecutiveCorrect).toBe(1);
  });

  it('havuzdaki soruda 2. üst üste doğru → havuzdan çıkar', () => {
    const pool = recordAnswer({ q1: { addedAt: 'x', consecutiveCorrect: 1 } }, 'q1', 'correct', NOW);
    expect(pool['q1']).toBeUndefined();
  });

  it('havuzda olmayan soruda doğru → havuz değişmez', () => {
    const pool = recordAnswer({}, 'q1', 'correct', NOW);
    expect(pool['q1']).toBeUndefined();
  });
});
