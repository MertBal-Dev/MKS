import { TOPICS, TOPIC_IDS, type TopicId } from './constants';

export interface PlanGoal {
  kind: 'reading' | 'questions' | 'review' | 'exam';
  label: string;
  count?: number;
}

export interface PlanDay {
  id: string;
  date: string; // YYYY-MM-DD (Europe/Istanbul)
  label: string; // '1. Hafta • Cumartesi'
  focusTopics: TopicId[];
  goals: PlanGoal[];
}

const DAY_MS = 86_400_000;
const WEEKDAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const FINAL_REVIEW_DAYS = 3;

function istanbulDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD
}

function addDays(dateKey: string, days: number): string {
  const t = new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** Konulara, examWeight ile orantılı ve deterministik gün sayısı dağıtır (toplam = dayCount). */
function topicDayCounts(dayCount: number): Map<TopicId, number> {
  const ordered = [...TOPIC_IDS].sort((a, b) => TOPICS[a].order - TOPICS[b].order);
  const byWeightDesc = [...ordered].sort(
    (a, b) => TOPICS[b].examWeight - TOPICS[a].examWeight || TOPICS[a].order - TOPICS[b].order,
  );

  const base = dayCount >= ordered.length * 2 ? 2 : dayCount >= ordered.length ? 1 : 0;
  const counts = new Map<TopicId, number>(ordered.map((id) => [id, base]));
  let remaining = dayCount - base * ordered.length;

  let i = 0;
  while (remaining > 0) {
    const id = byWeightDesc[i % byWeightDesc.length];
    counts.set(id, (counts.get(id) ?? 0) + 1);
    remaining -= 1;
    i += 1;
  }
  return counts;
}

export function generatePlan(start: Date, examDate: Date): PlanDay[] {
  const startKey = istanbulDateKey(start);
  const examKey = istanbulDateKey(examDate);

  const dates: string[] = [];
  for (let k = startKey; k < examKey; k = addDays(k, 1)) dates.push(k);
  if (dates.length === 0) return [];

  const finalReviewStart = Math.max(dates.length - FINAL_REVIEW_DAYS, 0);
  const studyDates = dates.slice(0, finalReviewStart);
  const topicDates = studyDates.filter((d) => weekdayOf(d) !== 0); // Pazarlar deneme günü

  const counts = topicDayCounts(topicDates.length);
  const queue: TopicId[] = [];
  for (const id of [...TOPIC_IDS].sort((a, b) => TOPICS[a].order - TOPICS[b].order)) {
    for (let n = 0; n < (counts.get(id) ?? 0); n++) queue.push(id);
  }

  let qi = 0;
  return dates.map((date, index) => {
    const weekNo = Math.floor(index / 7) + 1;
    const label = `${weekNo}. Hafta • ${WEEKDAYS_TR[weekdayOf(date)]}`;
    const id = `gun-${date}`;
    const isFinalReview = index >= finalReviewStart;
    const isSunday = weekdayOf(date) === 0;

    if (isFinalReview) {
      return {
        id,
        date,
        label,
        focusTopics: [],
        goals: [
          { kind: 'reading', label: 'Kısa anlatımları ve tuzak listelerini oku' },
          { kind: 'review', label: 'Kart tekrarı + yanlış havuzunu bitir' },
          { kind: 'questions', label: 'Karışık 40 soru çöz', count: 40 },
        ],
      };
    }

    if (isSunday) {
      return {
        id,
        date,
        label,
        focusTopics: [],
        goals: [
          { kind: 'exam', label: 'Deneme veya çıkmış sınav çöz (100 soru • 120 dk)' },
          { kind: 'review', label: 'Yanlışlarının çözümlerini oku' },
        ],
      };
    }

    const topic = queue[qi] ?? [...TOPIC_IDS].sort((a, b) => TOPICS[b].examWeight - TOPICS[a].examWeight)[0];
    qi += 1;
    return {
      id,
      date,
      label,
      focusTopics: [topic],
      goals: [
        { kind: 'reading', label: `${TOPICS[topic].short} konusunu oku` },
        { kind: 'questions', label: `${TOPICS[topic].short} — 30 soru çöz`, count: 30 },
        { kind: 'review', label: 'Kart tekrarı (SRS)' },
      ],
    };
  });
}
