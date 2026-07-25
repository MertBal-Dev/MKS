export type SrsBox = 1 | 2 | 3 | 4 | 5;
export interface SrsCard {
  box: SrsBox;
  dueAt: string;
}

/** Leitner kutu aralıkları (gün). Kutu 1 = aynı gün tekrar. */
export const BOX_INTERVALS_DAYS: Record<SrsBox, number> = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };

const DAY_MS = 86_400_000;

export function reviewCard(card: SrsCard, result: 'correct' | 'wrong', now: Date): SrsCard {
  const box: SrsBox = result === 'correct' ? ((Math.min(card.box + 1, 5)) as SrsBox) : 1;
  return {
    box,
    dueAt: new Date(now.getTime() + BOX_INTERVALS_DAYS[box] * DAY_MS).toISOString(),
  };
}

export function dueCards(srs: Record<string, SrsCard>, now: Date): string[] {
  return Object.entries(srs)
    .filter(([, card]) => new Date(card.dueAt).getTime() <= now.getTime())
    .map(([id]) => id);
}

export function newCard(now: Date): SrsCard {
  return { box: 1, dueAt: now.toISOString() };
}
