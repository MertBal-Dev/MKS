import { z } from 'zod';
import { ChoiceIdSchema } from './schemas';
import { TOPIC_IDS } from './constants';
import type { Exam, Question } from './types';

/**
 * Öğrencinin kendi yüklediği soru setleri.
 *
 * Ana uygulama durumundan AYRI bir anahtarda tutulur: bu setler yüzlerce soru
 * içerebilir ve her kayıtta tüm durumu yeniden serileştirmek gereksiz olur.
 */
const KEY = 'mks:kendi-sorular';

/** Cevabın nereden geldiği. Arayüz bunu rozet olarak gösterir. */
export const AnswerSourceSchema = z.enum(['belge', 'ai', 'kullanici']);
export type AnswerSource = z.infer<typeof AnswerSourceSchema>;

export const CustomQuestionSchema = z.object({
  id: z.string().min(1),
  stem: z.string().min(1),
  choices: z.array(z.object({ id: ChoiceIdSchema, text: z.string().min(1) })).min(2).max(5),
  correct: ChoiceIdSchema,
  explanation: z.string().default(''),
  answerSource: AnswerSourceSchema.default('ai'),
  confidence: z.enum(['kesin', 'belirsiz']).default('kesin'),
  topicId: z.enum(TOPIC_IDS).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
});
export type CustomQuestion = z.infer<typeof CustomQuestionSchema>;

export const CustomSetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceName: z.string().default(''),
  createdAt: z.string(),
  questions: z.array(CustomQuestionSchema),
});
export type CustomSet = z.infer<typeof CustomSetSchema>;

const StoreSchema = z.array(CustomSetSchema);

export function loadSets(): CustomSet[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return StoreSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSets(sets: CustomSet[]): void {
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function getSet(id: string): CustomSet | undefined {
  return loadSets().find((s) => s.id === id);
}

export function upsertSet(set: CustomSet): CustomSet[] {
  const sets = loadSets();
  const i = sets.findIndex((s) => s.id === set.id);
  if (i >= 0) sets[i] = set;
  else sets.unshift(set);
  saveSets(sets);
  return sets;
}

export function deleteSet(id: string): CustomSet[] {
  const sets = loadSets().filter((s) => s.id !== id);
  saveSets(sets);
  return sets;
}

/** Sınav motoru Question bekliyor; kendi sorularımızı o biçime uyarlar. */
export function toQuestion(q: CustomQuestion): Question {
  return {
    id: q.id,
    topicId: q.topicId ?? 'genel-turizm',
    subtopic: 'Kendi sorularım',
    difficulty: q.difficulty,
    stem: q.stem,
    choices: q.choices.map((c) => ({
      id: c.id,
      text: c.text,
      // Açıklama yalnızca doğru şıkta anlamlı; diğerleri boş bırakılamadığı için nötr metin.
      explanation: c.id === q.correct ? q.explanation || 'Doğru cevap.' : 'Bu şık doğru değil.',
    })),
    correct: q.correct,
  } as Question;
}

/** Setin 50'şerlik deneme bloklarına bölünmüş hâli. Son blok eksik kalabilir. */
export const BLOCK_SIZE = 50;

export function blocksOf(set: CustomSet): CustomQuestion[][] {
  const out: CustomQuestion[][] = [];
  for (let i = 0; i < set.questions.length; i += BLOCK_SIZE) {
    out.push(set.questions.slice(i, i + BLOCK_SIZE));
  }
  return out;
}

export const CUSTOM_EXAM_PREFIX = 'kendi-';

/** Blok başına süre: soru başına ~1,2 dakika, en az 10 dakika. */
export function customDurationMin(questionCount: number): number {
  return Math.max(10, Math.round(questionCount * 1.2));
}

/**
 * 'kendi-<setId>-<blok>' biçimindeki sanal sınav kimliğini Exam'e çevirir.
 * Sınav odası bunu hazır sınavlardan ayırt etmeden çalıştırır.
 */
export function resolveCustomExam(examId: string | undefined): Exam | null {
  if (!examId?.startsWith(CUSTOM_EXAM_PREFIX)) return null;

  const rest = examId.slice(CUSTOM_EXAM_PREFIX.length);
  const dash = rest.lastIndexOf('-');
  if (dash < 0) return null;

  const setId = rest.slice(0, dash);
  const block = Number(rest.slice(dash + 1));
  if (!Number.isInteger(block) || block < 0) return null;

  const set = getSet(setId);
  if (!set) return null;

  const chunk = blocksOf(set)[block];
  if (!chunk?.length) return null;

  const toplamBlok = blocksOf(set).length;
  return {
    id: examId,
    title: toplamBlok > 1 ? `${set.title} — ${block + 1}. bölüm` : set.title,
    kind: 'deneme',
    note: `Kendi yüklediğin sorulardan • ${chunk.length} soru`,
    questions: chunk.map(toQuestion),
  } as Exam;
}
