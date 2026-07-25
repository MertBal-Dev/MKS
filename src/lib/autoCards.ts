import type { Flashcard, Question } from './types';

/** Yanlış yapılan soruyu otomatik tekrar kartına çevirir. */
export function wrongToCard(q: Question): Flashcard {
  const correct = q.choices.find((c) => c.id === q.correct)!;
  return {
    id: `q-${q.id}`,
    front: q.stem,
    back: `${correct.text} — ${correct.explanation}`,
  };
}
