import type { Exam, Question, Topic } from '@/lib/types';
import type { SoruAilesi } from '@/lib/soruAilesi';

/**
 * Soru aileleri konu konu üretilip ekleniyor; her yeni dosya için bu dosyayı
 * düzenlemek gerekmesin diye glob ile toplanır. Dosya yoksa liste boş kalır.
 */
const aileModulleri = import.meta.glob<{ default: SoruAilesi[] }>('./aileler/*.json', { eager: true });
export const aileler: SoruAilesi[] = Object.values(aileModulleri).flatMap((m) => m.default ?? []);

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
import genelTurkTarihiTopic from './topics/genel-turk-tarihi.json';
import genelTurkTarihiQuestions from './questions/genel-turk-tarihi.json';
import dinlerTarihiTopic from './topics/dinler-tarihi.json';
import dinlerTarihiQuestions from './questions/dinler-tarihi.json';
import halkBilimiTopic from './topics/halk-bilimi-edebiyat.json';
import halkBilimiQuestions from './questions/halk-bilimi-edebiyat.json';
import ilkYardimTopic from './topics/ilk-yardim.json';
import ilkYardimQuestions from './questions/ilk-yardim.json';
import muzecilikTopic from './topics/muzecilik.json';
import muzecilikQuestions from './questions/muzecilik.json';
import deneme1 from './exams/deneme-1.json';
import cikmis2025Subat from './exams/cikmis-2025-subat.json';
import cikmis2025Agustos from './exams/cikmis-2025-agustos.json';
import cikmis2026Mart from './exams/cikmis-2026-mart.json';

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
  genelTurkTarihiTopic as unknown as Topic,
  dinlerTarihiTopic as unknown as Topic,
  halkBilimiTopic as unknown as Topic,
  ilkYardimTopic as unknown as Topic,
  muzecilikTopic as unknown as Topic,
];

export const questionBank: Question[] = [
  ...(anadoluMedeniyetleriQuestions as unknown as Question[]),
  ...(arkeolojiMitolojiQuestions as unknown as Question[]),
  ...(sanatTarihiQuestions as unknown as Question[]),
  ...(romaYunanBizansQuestions as unknown as Question[]),
  ...(turizmCografyasiQuestions as unknown as Question[]),
  ...(genelTurizmQuestions as unknown as Question[]),
  ...(osmanliTarihiQuestions as unknown as Question[]),
  ...(genelTurkTarihiQuestions as unknown as Question[]),
  ...(dinlerTarihiQuestions as unknown as Question[]),
  ...(halkBilimiQuestions as unknown as Question[]),
  ...(ilkYardimQuestions as unknown as Question[]),
  ...(muzecilikQuestions as unknown as Question[]),
];

export const exams: Exam[] = [
  // En güncel oturum en üstte: MKS-4'e hazırlanırken önce buna bakılmalı
  cikmis2026Mart as unknown as Exam,
  cikmis2025Agustos as unknown as Exam,
  cikmis2025Subat as unknown as Exam,
  deneme1 as unknown as Exam,
];

export function topicQuestions(topicId: string): Question[] {
  return questionBank.filter((q) => q.topicId === topicId);
}

export function findQuestion(id: string): Question | undefined {
  return questionBank.find((q) => q.id === id) ?? exams.flatMap((e) => e.questions).find((q) => q.id === id);
}
