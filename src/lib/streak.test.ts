import { describe, expect, it } from 'vitest';
import { bumpStreak } from './streak';

describe('bumpStreak', () => {
  it('ilk çalışma günü → current=1, best=1', () => {
    expect(bumpStreak({ lastStudyDay: '', current: 0, best: 0 }, '2026-07-25')).toEqual({
      lastStudyDay: '2026-07-25',
      current: 1,
      best: 1,
    });
  });

  it('aynı gün tekrar → değişmez', () => {
    const s = { lastStudyDay: '2026-07-25', current: 3, best: 5 };
    expect(bumpStreak(s, '2026-07-25')).toEqual(s);
  });

  it('ertesi gün → current artar', () => {
    expect(bumpStreak({ lastStudyDay: '2026-07-25', current: 3, best: 5 }, '2026-07-26')).toEqual({
      lastStudyDay: '2026-07-26',
      current: 4,
      best: 5,
    });
  });

  it('best güncellenir', () => {
    expect(bumpStreak({ lastStudyDay: '2026-07-25', current: 5, best: 5 }, '2026-07-26').best).toBe(6);
  });

  it('gün atlanırsa current=1\'e döner', () => {
    expect(bumpStreak({ lastStudyDay: '2026-07-25', current: 9, best: 9 }, '2026-07-28')).toEqual({
      lastStudyDay: '2026-07-28',
      current: 1,
      best: 9,
    });
  });

  it('ay sınırında ertesi günü doğru hesaplar', () => {
    expect(bumpStreak({ lastStudyDay: '2026-07-31', current: 2, best: 3 }, '2026-08-01').current).toBe(3);
  });
});
