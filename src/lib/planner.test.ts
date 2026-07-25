import { describe, expect, it } from 'vitest';
import { generatePlan } from './planner';
import { TOPIC_IDS } from './constants';

const START = new Date('2026-07-25T09:00:00+03:00');
const EXAM = new Date('2026-08-29T10:00:00+03:00');

describe('generatePlan', () => {
  const plan = generatePlan(START, EXAM);

  it('başlangıçtan sınav gününe kadar tüm günleri kapsar', () => {
    expect(plan[0].date).toBe('2026-07-25');
    expect(plan[plan.length - 1].date).toBe('2026-08-28'); // sınavdan önceki gün son plan günü
    expect(plan).toHaveLength(35);
  });

  it('her konu en az 2 gün odakta olur', () => {
    for (const id of TOPIC_IDS) {
      const days = plan.filter((d) => d.focusTopics.includes(id)).length;
      expect(days, `konu ${id} sadece ${days} gün odakta`).toBeGreaterThanOrEqual(2);
    }
  });

  it('pazar günleri deneme/çıkmış çözümü içerir', () => {
    const sundays = plan.filter((d) => new Date(`${d.date}T12:00:00+03:00`).getDay() === 0);
    expect(sundays.length).toBeGreaterThan(0);
    for (const day of sundays) {
      expect(day.goals.some((g) => g.kind === 'exam'), `${day.date} pazar ama deneme yok`).toBe(true);
    }
  });

  it('son 3 gün genel tekrar modundadır (yeni konu yok)', () => {
    const lastThree = plan.slice(-3);
    for (const day of lastThree) {
      expect(day.goals.some((g) => g.kind === 'review')).toBe(true);
      expect(day.goals.some((g) => g.kind === 'reading' && g.label.includes('Kısa'))).toBe(true);
    }
  });

  it('deterministiktir', () => {
    expect(generatePlan(START, EXAM)).toEqual(plan);
  });

  it('gün id\'leri benzersizdir', () => {
    const ids = plan.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
