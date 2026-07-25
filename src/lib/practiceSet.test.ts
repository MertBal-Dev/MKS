import { describe, expect, it } from 'vitest';
import { buildPracticeSet } from './practiceSet';
import type { Question } from './types';
import type { AppState } from './storage';

function mkQ(id: string, topicId: Question['topicId'], difficulty: 1 | 2 | 3 = 2): Question {
  return {
    id,
    topicId,
    subtopic: 's',
    difficulty,
    stem: 'Soru?',
    choices: [
      { id: 'A', text: 'a', explanation: 'x' },
      { id: 'B', text: 'b', explanation: 'x' },
      { id: 'C', text: 'c', explanation: 'x' },
      { id: 'D', text: 'd', explanation: 'x' },
    ],
    correct: 'A',
  };
}

const bank: Question[] = [
  mkQ('a-1', 'muzecilik', 1),
  mkQ('a-2', 'muzecilik', 3),
  mkQ('b-1', 'ilk-yardim', 2),
  mkQ('b-2', 'ilk-yardim', 2),
  mkQ('b-3', 'ilk-yardim', 3),
];

const noAttempts: AppState['attempts'] = {};

describe('buildPracticeSet', () => {
  it('konu filtresi uygular', () => {
    const set = buildPracticeSet(bank, noAttempts, {}, [], { topics: ['muzecilik'], seed: 1 });
    expect(set.every((q) => q.topicId === 'muzecilik')).toBe(true);
    expect(set).toHaveLength(2);
  });

  it('zorluk filtresi uygular', () => {
    const set = buildPracticeSet(bank, noAttempts, {}, [], { difficulty: [3], seed: 1 });
    expect(set.map((q) => q.id).sort()).toEqual(['a-2', 'b-3']);
  });

  it('istenen adedi döner', () => {
    const set = buildPracticeSet(bank, noAttempts, {}, [], { count: 3, seed: 1 });
    expect(set).toHaveLength(3);
  });

  it('unseen: hiç çözülmemişleri döner', () => {
    const attempts: AppState['attempts'] = { 'a-1': { correct: 1, wrong: 0, lastResult: 'correct', lastAt: 't' } };
    const set = buildPracticeSet(bank, attempts, {}, [], { status: 'unseen', seed: 1 });
    expect(set.map((q) => q.id)).not.toContain('a-1');
    expect(set).toHaveLength(4);
  });

  it('wrong: yalnız havuzdakileri döner', () => {
    const pool: AppState['wrongPool'] = { 'b-2': { addedAt: 't', consecutiveCorrect: 0 } };
    const set = buildPracticeSet(bank, noAttempts, pool, [], { status: 'wrong', seed: 1 });
    expect(set.map((q) => q.id)).toEqual(['b-2']);
  });

  it('flagged: yalnız işaretlileri döner', () => {
    const set = buildPracticeSet(bank, noAttempts, {}, ['a-2', 'b-1'], { status: 'flagged', seed: 1 });
    expect(set.map((q) => q.id).sort()).toEqual(['a-2', 'b-1']);
  });

  it('az çözülmüş sorulara öncelik verir', () => {
    const attempts: AppState['attempts'] = {
      'a-1': { correct: 5, wrong: 0, lastResult: 'correct', lastAt: 't' },
      'a-2': { correct: 5, wrong: 0, lastResult: 'correct', lastAt: 't' },
      'b-1': { correct: 5, wrong: 0, lastResult: 'correct', lastAt: 't' },
    };
    const set = buildPracticeSet(bank, attempts, {}, [], { count: 2, seed: 7 });
    // b-2 ve b-3 hiç çözülmemiş → önce onlar gelmeli
    expect(set.map((q) => q.id).sort()).toEqual(['b-2', 'b-3']);
  });

  it('aynı seed aynı sırayı üretir', () => {
    const s1 = buildPracticeSet(bank, noAttempts, {}, [], { seed: 42 });
    const s2 = buildPracticeSet(bank, noAttempts, {}, [], { seed: 42 });
    expect(s1.map((q) => q.id)).toEqual(s2.map((q) => q.id));
  });
});
