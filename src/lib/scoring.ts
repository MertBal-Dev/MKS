import { TOPICS, TOPIC_IDS, type TopicId } from './constants';
import type { ChoiceId, Exam, Question } from './types';
import type { AppState, ExamResult } from './storage';

/** MKS resmi formülü: Puan = (Doğru / Toplam) × 100 — 2 ondalık. */
export function computeScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100 * 100) / 100;
}

export function gradeExam(exam: Exam, answers: Record<string, ChoiceId | undefined>): ExamResult {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  const byTopic: ExamResult['byTopic'] = {};
  const cleanAnswers: ExamResult['answers'] = {};

  for (const q of exam.questions) {
    const t = (byTopic[q.topicId] ??= { correct: 0, total: 0 });
    t.total += 1;
    const answer = answers[q.id];
    if (!answer) {
      blank += 1;
      continue;
    }
    cleanAnswers[q.id] = answer;
    if (answer === q.correct) {
      correct += 1;
      t.correct += 1;
    } else {
      wrong += 1;
    }
  }

  return {
    examId: exam.id,
    finishedAt: new Date().toISOString(),
    score: computeScore(correct, exam.questions.length),
    correct,
    wrong,
    blank,
    byTopic,
    answers: cleanAnswers,
  };
}

export type TopicAccuracy = Record<TopicId, { correct: number; total: number; pct: number | null }>;

/** Soru bankası denemelerindeki (attempts) birikimden konu bazlı doğruluk. */
export function topicAccuracy(attempts: AppState['attempts'], bank: Question[]): TopicAccuracy {
  const acc = Object.fromEntries(
    TOPIC_IDS.map((id) => [id, { correct: 0, total: 0, pct: null as number | null }]),
  ) as TopicAccuracy;

  const topicOf = new Map(bank.map((q) => [q.id, q.topicId]));
  for (const [qId, a] of Object.entries(attempts)) {
    const topicId = topicOf.get(qId);
    if (!topicId) continue;
    acc[topicId].correct += a.correct;
    acc[topicId].total += a.correct + a.wrong;
  }
  for (const id of TOPIC_IDS) {
    const t = acc[id];
    t.pct = t.total === 0 ? null : Math.round((t.correct / t.total) * 100 * 10) / 10;
  }
  return acc;
}

/**
 * Tahmini sınav puanı: verisi olan konuların examWeight ağırlıklı ortalaması.
 * Hiç veri yoksa null.
 */
export function estimateScore(acc: TopicAccuracy): number | null {
  let weightSum = 0;
  let weighted = 0;
  for (const id of TOPIC_IDS) {
    const t = acc[id];
    if (t.pct === null) continue;
    weightSum += TOPICS[id].examWeight;
    weighted += TOPICS[id].examWeight * t.pct;
  }
  if (weightSum === 0) return null;
  return Math.round((weighted / weightSum) * 10) / 10;
}
