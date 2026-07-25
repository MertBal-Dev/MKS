import type { Exam, Question, Topic } from '@/lib/types';

import anadoluMedeniyetleriTopic from './topics/anadolu-medeniyetleri.json';
import anadoluMedeniyetleriQuestions from './questions/anadolu-medeniyetleri.json';

/**
 * İçerik kayıt noktası. Yeni içerik eklemek = JSON dosyası + buraya bir satır.
 * Tüm dosyalar `npm run validate:content` ile doğrulanır.
 */
export const topics: Topic[] = [anadoluMedeniyetleriTopic as unknown as Topic];

export const questionBank: Question[] = [
  ...(anadoluMedeniyetleriQuestions as unknown as Question[]),
];

export const exams: Exam[] = [];

export function topicQuestions(topicId: string): Question[] {
  return questionBank.filter((q) => q.topicId === topicId);
}

export function findQuestion(id: string): Question | undefined {
  return questionBank.find((q) => q.id === id) ?? exams.flatMap((e) => e.questions).find((q) => q.id === id);
}
