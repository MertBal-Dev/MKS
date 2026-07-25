import { EXAM_DATE, TOPICS, TOPIC_IDS, type TopicId } from './constants';

/** Planın üç evresi: konuyu ilk kez öğrenme, pekiştirme, son düzlük. */
export type PlanPhase = 'temel' | 'pekistirme' | 'final';

export interface PlanGoal {
  kind: 'reading' | 'questions' | 'review' | 'exam';
  label: string;
  count?: number;
  /** Hedefin götürdüğü sayfa — plan yalnızca söylemez, oraya taşır. */
  href?: string;
}

export interface PlanDay {
  id: string;
  date: string; // YYYY-MM-DD (Europe/Istanbul)
  label: string; // '1. Hafta • Cumartesi'
  weekNo: number;
  weekday: number; // 0 = Pazar
  phase: PlanPhase;
  focusTopics: TopicId[];
  goals: PlanGoal[];
}

export const PHASE_LABEL: Record<PlanPhase, string> = {
  temel: 'Temel',
  pekistirme: 'Pekiştirme',
  final: 'Son Düzlük',
};

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

/**
 * Konu günlerini turlara böler. Aynı konunun günleri arka arkaya gelmez —
 * her tur bütün müfredatı bir kez dolaşır, böylece aralıklı tekrar doğal olarak oluşur.
 * 1. tur müfredat sırasıyla, 3. turdan sonrası sınav ağırlığı sırasıyla ilerler.
 */
function topicRounds(dayCount: number): { topic: TopicId; round: number }[] {
  const ordered = [...TOPIC_IDS].sort((a, b) => TOPICS[a].order - TOPICS[b].order);
  const byWeightDesc = [...ordered].sort(
    (a, b) => TOPICS[b].examWeight - TOPICS[a].examWeight || TOPICS[a].order - TOPICS[b].order,
  );

  const remaining = topicDayCounts(dayCount);
  const queue: { topic: TopicId; round: number }[] = [];

  for (let round = 1; queue.length < dayCount; round++) {
    const pool = round <= 2 ? ordered : byWeightDesc;
    let placed = 0;

    for (const id of pool) {
      const left = remaining.get(id) ?? 0;
      if (left <= 0) continue;
      queue.push({ topic: id, round });
      remaining.set(id, left - 1);
      placed += 1;
      if (queue.length >= dayCount) break;
    }

    if (placed === 0) break; // kontenjan bitti
  }

  return queue;
}

/** Bir konu gününün hedefleri — tura göre değişir, çünkü ikinci okuma birinciyle aynı iş değildir. */
function topicGoals(topic: TopicId, round: number): PlanGoal[] {
  const short = TOPICS[topic].short;

  if (round === 1) {
    return [
      { kind: 'reading', label: `${short} — konu anlatımını oku`, href: `/konular/${topic}` },
      { kind: 'questions', label: `${short} — 25 soru çöz`, count: 25, href: `/pratik?topic=${topic}&count=25` },
      { kind: 'review', label: 'Günün kartlarını çalış', href: '/tekrar' },
    ];
  }

  if (round === 2) {
    return [
      { kind: 'reading', label: `${short} — kısa özet ve tuzakları gözden geçir`, href: `/konular/${topic}` },
      { kind: 'questions', label: `${short} — 30 soru çöz`, count: 30, href: `/pratik?topic=${topic}&count=30` },
      { kind: 'review', label: 'Yanlış havuzundan bu konuyu temizle', href: '/yanlis-havuzu' },
    ];
  }

  // 3. tur ve sonrası: en ağır konulara fazladan mesai.
  // Not: examWeight resmi bir sayı DEĞİL, geçmiş oturumlara dayanan tahmindir —
  // Bakanlık başlık başına soru sayısı yayımlamıyor. Bu yüzden etikette
  // "sınavda" değil "denemede" denir; ikincisi bu uygulama için doğrudur.
  return [
    {
      kind: 'questions',
      label: `${short} — 35 soru (denemede ~${TOPICS[topic].examWeight} soru)`,
      count: 35,
      href: `/pratik?topic=${topic}&count=35&status=unseen`,
    },
    { kind: 'reading', label: `${short} — zayıf kaldığın bölümleri tekrar oku`, href: `/konular/${topic}` },
    { kind: 'review', label: 'Kart tekrarı', href: '/tekrar' },
  ];
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

  const queue = topicRounds(topicDates.length);

  let qi = 0;
  return dates.map((date, index) => {
    const weekday = weekdayOf(date);
    const weekNo = Math.floor(index / 7) + 1;
    const label = `${weekNo}. Hafta • ${WEEKDAYS_TR[weekday]}`;
    const id = `gun-${date}`;
    const isFinalReview = index >= finalReviewStart;

    if (isFinalReview) {
      return {
        id,
        date,
        label,
        weekNo,
        weekday,
        phase: 'final' as const,
        focusTopics: [],
        goals: [
          { kind: 'reading', label: 'Kısa anlatımları ve tuzak listelerini oku', href: '/konular' },
          { kind: 'review', label: 'Kart tekrarı + yanlış havuzunu bitir', href: '/tekrar' },
          { kind: 'questions', label: 'Karışık 40 soru çöz', count: 40, href: '/pratik?count=40' },
        ],
      };
    }

    if (weekday === 0) {
      // Deneme günü kendi evresini üretmez; o ana kadar gelinen evreyi devralır.
      return {
        id,
        date,
        label,
        weekNo,
        weekday,
        phase: (qi === 0 || queue[qi - 1]?.round === 1 ? 'temel' : 'pekistirme') as PlanPhase,
        focusTopics: [],
        goals: [
          { kind: 'exam', label: 'Deneme veya çıkmış sınav çöz (100 soru • 120 dk)', href: '/denemeler' },
          { kind: 'review', label: 'Yanlışlarının çözümlerini oku', href: '/cozduklerim?filter=wrong' },
        ],
      };
    }

    const slot = queue[qi] ?? { topic: [...TOPIC_IDS].sort((a, b) => TOPICS[b].examWeight - TOPICS[a].examWeight)[0], round: 3 };
    qi += 1;

    return {
      id,
      date,
      label,
      weekNo,
      weekday,
      phase: (slot.round === 1 ? 'temel' : 'pekistirme') as PlanPhase,
      focusTopics: [slot.topic],
      goals: topicGoals(slot.topic, slot.round),
    };
  });
}

/** Bugünden sınava kadar geçerli plan — sayfaların ortak girişi. */
export function currentPlan(): PlanDay[] {
  return generatePlan(new Date(), EXAM_DATE);
}
