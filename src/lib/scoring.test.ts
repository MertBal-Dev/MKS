import { describe, expect, it } from 'vitest';
import { computeScore, gradeExam, topicAccuracy, estimateScore } from './scoring';
import type { Exam, Question } from './types';
import type { AppState } from './storage';

function mkQuestion(id: string, topicId: Question['topicId'], correct: Question['correct'] = 'A'): Question {
  return {
    id,
    topicId,
    subtopic: 'test',
    difficulty: 1,
    stem: 'Soru?',
    choices: [
      { id: 'A', text: 'a', explanation: 'x' },
      { id: 'B', text: 'b', explanation: 'x' },
      { id: 'C', text: 'c', explanation: 'x' },
      { id: 'D', text: 'd', explanation: 'x' },
    ],
    correct,
  };
}

describe('computeScore', () => {
  it('70/100 → 70', () => {
    expect(computeScore(70, 100)).toBe(70);
  });
  it('1/3 → 33.33', () => {
    expect(computeScore(1, 3)).toBe(33.33);
  });
  it('0 toplam → 0', () => {
    expect(computeScore(0, 0)).toBe(0);
  });
});

describe('gradeExam', () => {
  const questions: Question[] = [
    mkQuestion('e-001', 'muzecilik'),
    mkQuestion('e-002', 'muzecilik'),
    mkQuestion('e-003', 'ilk-yardim'),
    mkQuestion('e-004', 'ilk-yardim'),
  ];
  // Şemada deneme=100 soru zorunlu ama gradeExam saf fonksiyon — tip olarak Exam alır.
  const exam = { id: 'mini', title: 'Mini', kind: 'deneme', questions } as Exam;

  it('doğru/yanlış/boş sayar ve konu kırılımı üretir', () => {
    const result = gradeExam(exam, { 'e-001': 'A', 'e-002': 'B', 'e-003': 'A' });
    expect(result.correct).toBe(2);
    expect(result.wrong).toBe(1);
    expect(result.blank).toBe(1);
    expect(result.score).toBe(50);
    expect(result.byTopic['muzecilik']).toEqual({ correct: 1, total: 2 });
    expect(result.byTopic['ilk-yardim']).toEqual({ correct: 1, total: 2 });
  });
});

describe('topicAccuracy & estimateScore', () => {
  const bank: Question[] = [
    mkQuestion('m-001', 'muzecilik'),
    mkQuestion('m-002', 'muzecilik'),
    mkQuestion('i-001', 'ilk-yardim'),
  ];

  it('konu doğruluğunu deneme başına hesaplar; verisiz konu pct=null', () => {
    const attempts: AppState['attempts'] = {
      'm-001': { correct: 1, wrong: 0, lastResult: 'correct', lastAt: 't' },
      'm-002': { correct: 0, wrong: 2, lastResult: 'wrong', lastAt: 't' },
    };
    const acc = topicAccuracy(attempts, bank);
    // 3 denemede 1 doğru → %33.3
    expect(acc['muzecilik'].pct).toBe(33.3);
    expect(acc['ilk-yardim'].pct).toBeNull();
  });

  it('estimateScore ağırlıklı ortalama döner; hiç veri yoksa null', () => {
    const acc = topicAccuracy({}, bank);
    expect(estimateScore(acc)).toBeNull();
    const acc2 = topicAccuracy(
      { 'm-001': { correct: 3, wrong: 1, lastResult: 'correct', lastAt: 't' } },
      bank,
    );
    // Tek konuda %75 → tahmin 75 (verisi olan konuların ağırlıklı ortalaması)
    expect(estimateScore(acc2)).toBe(75);
  });
});
