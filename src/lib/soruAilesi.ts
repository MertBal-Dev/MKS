import { z } from 'zod';
import { ChoiceIdSchema } from './schemas';
import { TOPIC_IDS } from './constants';
import type { Question } from './types';

/**
 * Soru ailesi: bir gerçek çıkmış soru + aynı bilgiyi farklı açılardan yoklayan türevleri.
 *
 * Fikir şu: "14 Mart 2026'da bu soru çıktı — ama şunlar da çıkabilirdi."
 * Öğrenci önce gerçek soruyu çözer, sonra aynı konunun 3 türevini çözerek
 * bilgiyi tek bir kalıba değil, konunun kendisine bağlar.
 *
 * Türevler ÖNCEDEN üretilir ve doğrulanır; anlık AI üretimi denetlenemez.
 */

const AileChoiceSchema = z.object({
  id: ChoiceIdSchema,
  text: z.string().min(1),
  explanation: z.string().min(1),
});

const AileSoruSchema = z.object({
  id: z.string().min(1),
  stem: z.string().min(1),
  choices: z.array(AileChoiceSchema).min(4).max(5),
  correct: ChoiceIdSchema,
  trick: z.string().default(''),
});

export const SoruAilesiSchema = z.object({
  id: z.string().min(1),
  topicId: z.enum(TOPIC_IDS),
  /** Ailenin ölçtüğü çekirdek bilgi — tek cümle. */
  cekirdek: z.string().min(1),
  /** Soruları çözmeden önce okunacak kısa anlatım (markdown). */
  ozet: z.string().min(1),
  kaynak: z.object({
    examId: z.string().min(1),
    examTitle: z.string().min(1),
    soru: AileSoruSchema,
  }),
  turevler: z.array(AileSoruSchema).min(1).max(4),
});

export type SoruAilesi = z.infer<typeof SoruAilesiSchema>;
export type AileSoru = z.infer<typeof AileSoruSchema>;

/** Aile sorusunu, uygulamanın Question tipine uyarlar (AI Hoca ve kartlar için). */
export function aileSorusunuQuestion(s: AileSoru, topicId: SoruAilesi['topicId'], altKonu: string): Question {
  return {
    id: s.id,
    topicId,
    subtopic: altKonu,
    difficulty: 2,
    stem: s.stem,
    choices: s.choices,
    correct: s.correct,
    ...(s.trick ? { trick: s.trick } : {}),
  } as Question;
}
