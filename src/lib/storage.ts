import { z } from 'zod';
import { STORAGE_KEY } from './constants';
import { ChoiceIdSchema } from './schemas';

const AttemptSchema = z.object({
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  lastResult: z.enum(['correct', 'wrong']),
  lastAt: z.string(),
});

const ExamResultSchema = z.object({
  examId: z.string(),
  finishedAt: z.string(),
  score: z.number(),
  correct: z.number().int(),
  wrong: z.number().int(),
  blank: z.number().int(),
  byTopic: z.record(z.string(), z.object({ correct: z.number().int(), total: z.number().int() })),
  answers: z.record(z.string(), ChoiceIdSchema),
});

export const AppStateSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    theme: z.enum(['dark', 'light', 'system']),
    /** Geri sayım görünümü: soft = günlük halka + sakin tarih; full = büyük gün sayacı; hidden = tarih gizli. */
    countdown: z.enum(['soft', 'full', 'hidden']).default('soft'),
  }),
  attempts: z.record(z.string(), AttemptSchema),
  flagged: z.array(z.string()),
  wrongPool: z.record(z.string(), z.object({ addedAt: z.string(), consecutiveCorrect: z.number().int().min(0) })),
  srs: z.record(
    z.string(),
    z.object({
      box: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      dueAt: z.string(),
    }),
  ),
  examResults: z.array(ExamResultSchema),
  planProgress: z.record(z.string(), z.boolean()),
  streak: z.object({ lastStudyDay: z.string(), current: z.number().int().min(0), best: z.number().int().min(0) }),
  /** Son yedek indirme tarihi (YYYY-MM-DD) — hatırlatıcı bunu kullanır. */
  lastBackup: z.string().default(''),
});

export type AppState = z.infer<typeof AppStateSchema>;
export type ExamResult = z.infer<typeof ExamResultSchema>;

export const DEFAULT_STATE: AppState = {
  version: 1,
  settings: { theme: 'dark', countdown: 'soft' },
  attempts: {},
  flagged: [],
  wrongPool: {},
  srs: {},
  examResults: [],
  planProgress: {},
  streak: { lastStudyDay: '', current: 0, best: 0 },
  lastBackup: '',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return AppStateSchema.parse(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateState(fn: (s: AppState) => AppState): AppState {
  const next = fn(loadState());
  saveState(next);
  return next;
}

export function exportState(): string {
  return JSON.stringify(loadState(), null, 2);
}

/** Doğrulamadan geçerse kaydeder ve state'i döner; geçmezse fırlatır. */
export function importState(json: string): AppState {
  const state = AppStateSchema.parse(JSON.parse(json));
  saveState(state);
  return state;
}

export function resetState(): AppState {
  const fresh = structuredClone(DEFAULT_STATE);
  saveState(fresh);
  return fresh;
}
