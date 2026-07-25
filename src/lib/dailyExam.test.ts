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

  it('konu dağılımı resmi ağırlıkların yarısıdır', () => {
    const counts: Record<string, number> = {};
    for (const q of exam.questions) counts[q.topicId] = (counts[q.topicId] || 0) + 1;
    for (const id of TOPIC_IDS) {
      expect(counts[id] ?? 0, `konu ${id}`).toBe(TOPICS[id].examWeight / 2);
    }
  });

  it('sorular tekrarsızdır ve bankadan gelir', () => {
    const ids = exam.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(50);
    const bankIds = new Set(questionBank.map((q) => q.id));
    for (const id of ids) expect(bankIds.has(id)).toBe(true);
  });
});
