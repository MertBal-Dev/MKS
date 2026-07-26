import { describe, expect, it } from 'vitest';
import { getDailyExam, DAILY_EXAM_PREFIX, DAILY_DURATION_MIN, DAILY_QUESTION_COUNT } from './dailyExam';
import { tumSorular } from './soruHavuzu';
import { TOPICS, TOPIC_IDS } from './constants';

describe('getDailyExam', () => {
  const exam = getDailyExam('2026-07-25');

  it('DAILY_QUESTION_COUNT kadar soru üretir ve id tarihi taşır', () => {
    expect(exam.questions).toHaveLength(DAILY_QUESTION_COUNT);
    expect(exam.id).toBe(`${DAILY_EXAM_PREFIX}2026-07-25`);
    // Süre soru sayısıyla orantılı kalmalı: ~1 dk/soru + okuma payı
    expect(DAILY_DURATION_MIN).toBeGreaterThanOrEqual(DAILY_QUESTION_COUNT);
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

  it('konu dağılımı resmi ağırlıklarla orantılıdır (toplam tam DAILY_QUESTION_COUNT)', () => {
    const counts: Record<string, number> = {};
    for (const q of exam.questions) counts[q.topicId] = (counts[q.topicId] || 0) + 1;

    const totalWeight = TOPIC_IDS.reduce((s, id) => s + TOPICS[id].examWeight, 0);
    let sum = 0;
    for (const id of TOPIC_IDS) {
      const exact = (TOPICS[id].examWeight * DAILY_QUESTION_COUNT) / totalWeight;
      const got = counts[id] ?? 0;
      // Tam sayıya yuvarlama nedeniyle bir alt ya da bir üst değer kabul edilir
      expect(got, `konu ${id} (beklenen ~${exact})`).toBeGreaterThanOrEqual(Math.floor(exact));
      expect(got, `konu ${id} (beklenen ~${exact})`).toBeLessThanOrEqual(Math.ceil(exact));
      sum += got;
    }
    expect(sum).toBe(DAILY_QUESTION_COUNT);
  });

  it('sorular tekrarsızdır ve havuzdan gelir', () => {
    const ids = exam.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(DAILY_QUESTION_COUNT);
    // Havuz artık banka + soru ailelerini kapsıyor; eskiden yalnızca bankaydı.
    const havuzIds = new Set(tumSorular.map((q) => q.id));
    for (const id of ids) expect(havuzIds.has(id)).toBe(true);
  });

  it('30 gün boyunca tekrar oranı düşüktür', () => {
    /*
     * Dilimleme sayesinde günler havuzu üst üste binmeden paylaşır. Tekrar
     * yalnızca havuzu 30 güne yetmeyen küçük konularda (ör. ilk yardım)
     * sarma nedeniyle oluşur — bu bir hata değil, havuz sınırıdır.
     */
    const gorulen = new Set<string>();
    let cakisma = 0;
    for (let i = 0; i < 30; i++) {
      const tarih = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
      for (const q of getDailyExam(tarih).questions) {
        if (gorulen.has(q.id)) cakisma++;
        gorulen.add(q.id);
      }
    }
    // Eskiden rastgele seçim yüzdelerce tekrar üretiyordu; %15 üstü gerileme sayılır.
    expect(cakisma / (30 * DAILY_QUESTION_COUNT)).toBeLessThan(0.15);
    expect(gorulen.size).toBeGreaterThan(30 * DAILY_QUESTION_COUNT * 0.85);
  });

  it('aynı gün içinde soru tekrarı olmaz', () => {
    for (let i = 0; i < 10; i++) {
      const tarih = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
      const ids = getDailyExam(tarih).questions.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
