import { z } from 'zod';
import { TOPIC_IDS } from './constants';

/**
 * Şık kimlikleri. MKS-1 (Şub 2025) ve MKS-2 (Ağu 2025) dört şıklıydı;
 * MKS-3'te (Mar 2026) sınav BEŞ şıka geçti — bu yüzden E de destekleniyor.
 */
export const ChoiceIdSchema = z.enum(['A', 'B', 'C', 'D', 'E']);

export const ChoiceSchema = z.object({
  id: ChoiceIdSchema,
  text: z.string().min(1),
  explanation: z.string().min(1),
});

export const QuestionSchema = z
  .object({
    id: z.string().min(1),
    topicId: z.enum(TOPIC_IDS),
    subtopic: z.string().min(1),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    stem: z.string().min(1),
    choices: z.array(ChoiceSchema).min(4).max(5),
    correct: ChoiceIdSchema,
    trick: z.string().min(1).optional(),
  })
  .superRefine((q, ctx) => {
    const order = q.choices.map((c) => c.id).join('');
    if (order !== 'ABCD' && order !== 'ABCDE') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Şıklar A..D veya A..E sırasında olmalı (bulunan: ${order})` });
    }
    if (!q.choices.some((c) => c.id === q.correct)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `correct=${q.correct} şıklar arasında yok` });
    }
  });

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
});

export const TopicSchema = z.object({
  id: z.enum(TOPIC_IDS),
  fullNotes: z
    .array(z.object({ heading: z.string().min(1), markdown: z.string().min(1) }))
    .min(3),
  shortNotes: z.string().min(1),
  tricks: z.array(z.string().min(1)).min(5),
  flashcards: z.array(FlashcardSchema).min(20),
});

export const ExamSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: z.enum(['deneme', 'cikmis']),
    note: z.string().optional(),
    questions: z.array(QuestionSchema).min(50),
  })
  .superRefine((exam, ctx) => {
    if (exam.kind === 'deneme' && exam.questions.length !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deneme tam 100 soru içermeli (bulunan: ${exam.questions.length})`,
      });
    }
  });
