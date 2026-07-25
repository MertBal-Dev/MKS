import type { Exam, Question, Topic } from '@/lib/types';

import anadoluMedeniyetleriTopic from './topics/anadolu-medeniyetleri.json';
import anadoluMedeniyetleriQuestions from './questions/anadolu-medeniyetleri.json';
import arkeolojiMitolojiTopic from './topics/arkeoloji-mitoloji.json';
import arkeolojiMitolojiQuestions from './questions/arkeoloji-mitoloji.json';
import sanatTarihiTopic from './topics/sanat-tarihi.json';
import sanatTarihiQuestions from './questions/sanat-tarihi.json';
import romaYunanBizansTopic from './topics/roma-yunan-bizans.json';
import romaYunanBizansQuestions from './questions/roma-yunan-bizans.json';
import turizmCografyasiTopic from './topics/turizm-cografyasi.json';
import turizmCografyasiQuestions from './questions/turizm-cografyasi.json';
import genelTurizmTopic from './topics/genel-turizm.json';
import genelTurizmQuestions from './questions/genel-turizm.json';
import osmanliTarihiTopic from './topics/osmanli-tarihi.json';
import osmanliTarihiQuestions from './questions/osmanli-tarihi.json';

/**
 * İçerik kayıt noktası. Yeni içerik eklemek = JSON dosyası + buraya bir satır.
 * Tüm dosyalar `npm run validate:content` ile doğrulanır.
 */
export const topics: Topic[] = [
  anadoluMedeniyetleriTopic as unknown as Topic,
  arkeolojiMitolojiTopic as unknown as Topic,
  sanatTarihiTopic as unknown as Topic,
  romaYunanBizansTopic as unknown as Topic,
  turizmCografyasiTopic as unknown as Topic,
  genelTurizmTopic as unknown as Topic,
  osmanliTarihiTopic as unknown as Topic,
];

export const questionBank: Question[] = [
  ...(anadoluMedeniyetleriQuestions as unknown as Question[]),
  ...(arkeolojiMitolojiQuestions as unknown as Question[]),
  ...(sanatTarihiQuestions as unknown as Question[]),
  ...(romaYunanBizansQuestions as unknown as Question[]),
  ...(turizmCografyasiQuestions as unknown as Question[]),
  ...(genelTurizmQuestions as unknown as Question[]),
  ...(osmanliTarihiQuestions as unknown as Question[]),
];

export const exams: Exam[] = [];

export function topicQuestions(topicId: string): Question[] {
  return questionBank.filter((q) => q.topicId === topicId);
}

export function findQuestion(id: string): Question | undefined {
  return questionBank.find((q) => q.id === id) ?? exams.flatMap((e) => e.questions).find((q) => q.id === id);
}
