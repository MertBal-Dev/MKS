import type { z } from 'zod';
import type {
  ChoiceIdSchema,
  ChoiceSchema,
  QuestionSchema,
  FlashcardSchema,
  TopicSchema,
  ExamSchema,
} from './schemas';

export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Exam = z.infer<typeof ExamSchema>;
