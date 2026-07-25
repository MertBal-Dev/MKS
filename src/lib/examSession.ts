import { EXAM_DURATION_MIN } from './constants';
import type { ChoiceId } from './types';

export const SESSION_KEY = 'mks:exam-session';

export interface ExamSessionState {
  examId: string;
  startedAt: string;
  answers: Record<string, ChoiceId>;
  marked: string[];
}

export function createSession(examId: string, now: Date): ExamSessionState {
  return { examId, startedAt: now.toISOString(), answers: {}, marked: [] };
}

export function remainingMs(session: ExamSessionState, now: Date, durationMin: number = EXAM_DURATION_MIN): number {
  const end = new Date(session.startedAt).getTime() + durationMin * 60_000;
  return Math.max(end - now.getTime(), 0);
}

export function shouldAutoSubmit(session: ExamSessionState, now: Date, durationMin: number = EXAM_DURATION_MIN): boolean {
  return remainingMs(session, now, durationMin) === 0;
}

export function saveSession(storage: Storage, session: ExamSessionState): void {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(storage: Storage): ExamSessionState | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSessionState;
    if (typeof parsed.examId !== 'string' || typeof parsed.startedAt !== 'string') return null;
    return { ...parsed, answers: parsed.answers ?? {}, marked: parsed.marked ?? [] };
  } catch {
    return null;
  }
}

export function clearSession(storage: Storage): void {
  storage.removeItem(SESSION_KEY);
}
