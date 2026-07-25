import { describe, expect, it } from 'vitest';
import { getDailyExam, DAILY_EXAM_PREFIX, DAILY_DURATION_MIN } from './dailyExam';
import { questionBank } from '@/content/index';
import { TOPICS, TOPIC_IDS } from './constants';

describe('getDailyExam', () => {
  const exam = getDailyExam('2026-07-25');

  it('50 soru üretir ve id tarihi taşır', () => {
    expect(exam.questions).toHaveLength(50);
    expect(exam.id).toBe(`${DAILY_EXAM_PREFIX}2026-07-25`);
    expect(DAILY_DURATION_MIN).toBe(60);
  });

  it('deterministiktir — aynı gün aynı sınav', () => {
    const again = getDailyExam('2026-07-25');
    expect(again.questions.map((q) => q.id)).toEqual(exam.questions.map((q) => q.id));
  });

  it('farklı günlerde farklı set üretir', () => {
    const other = getDailyExam('2026-07-26');
    const a = exam.questions.map((q) => q.id).join(',');
    const b = other.questions.map((q) => q.id).join(',');
    expect(a).not.toBe(b);
  });

  it('konu dağılımı resmi ağırlıklarla orantılıdır (toplam tam 50)', () => {
    const counts: Record<string, number> = {};
    for (const q of exam.questions) counts[q.topicId] = (counts[q.topicId] || 0) + 1;

    const totalWeight = TOPIC_IDS.reduce((s, id) => s + TOPICS[id].examWeight, 0);
    let sum = 0;
    for (const id of TOPIC_IDS) {
      const exact = (TOPICS[id].examWeight * 50) / totalWeight;
      const got = counts[id] ?? 0;
      // Tam sayıya yuvarlama nedeniyle bir alt ya da bir üst değer kabul edilir
      expect(got, `konu ${id} (beklenen ~${exact})`).toBeGreaterThanOrEqual(Math.floor(exact));
      expect(got, `konu ${id} (beklenen ~${exact})`).toBeLessThanOrEqual(Math.ceil(exact));
      sum += got;
    }
    expect(sum).toBe(50);
  });

  it('sorular tekrarsızdır ve bankadan gelir', () => {
    const ids = exam.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(50);
    const bankIds = new Set(questionBank.map((q) => q.id));
    for (const id of ids) expect(bankIds.has(id)).toBe(true);
  });
});
