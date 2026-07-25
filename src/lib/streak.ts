import type { AppState } from './storage';

/** 'YYYY-MM-DD' → o günün UTC gece yarısı (gün farkı hesabı için yeterli). */
function dayNumber(day: string): number {
  return Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86_400_000);
}

export function todayKey(now: Date = new Date()): string {
  // Yerel güne göre YYYY-MM-DD
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function bumpStreak(streak: AppState['streak'], today: string): AppState['streak'] {
  if (streak.lastStudyDay === today) return streak;

  const current =
    streak.lastStudyDay !== '' && dayNumber(today) - dayNumber(streak.lastStudyDay) === 1
      ? streak.current + 1
      : 1;

  return { lastStudyDay: today, current, best: Math.max(streak.best, current) };
}
