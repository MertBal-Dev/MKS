import { EXAM_DATE, TOPICS, TOPIC_IDS, type TopicId } from './constants';
import { DAILY_QUESTION_COUNT } from './dailyExam';

/** Planın üç evresi: konuyu ilk kez öğrenme, pekiştirme, son düzlük. */
export type PlanPhase = 'temel' | 'pekistirme' | 'final';

export interface PlanGoal {
  kind: 'reading' | 'questions' | 'review' | 'exam' | 'daily';
  label: string;
  count?: number;
  /** Hedefin götürdüğü sayfa — plan yalnızca söylemez, oraya taşır. */
  href?: string;
  /** Hangi konunun hedefi olduğu; arayüz rozet göstermek için kullanır. */
  topicId?: TopicId;
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

const MUFREDAT_SIRASI = [...TOPIC_IDS].sort((a, b) => TOPICS[a].order - TOPICS[b].order);
const AGIRLIK_SIRASI = [...TOPIC_IDS].sort(
  (a, b) => TOPICS[b].examWeight - TOPICS[a].examWeight || TOPICS[a].order - TOPICS[b].order,
);

/**
 * Bir konu gününde çözülecek soru sayısı.
 *
 * Sınav ağırlığıyla orantılı: denemede 20 soru çıkan Genel Turizm'e 35, 4 soru
 * çıkan Dinler Tarihi'ne 20 soru düşer. Taban 20'nin altına inmiyor — az soru
 * gelen bir konu da sorulmayacak demek değil.
 *
 * Not: examWeight resmi bir sayı DEĞİL, geçmiş oturumlara dayanan tahmindir;
 * Bakanlık başlık başına soru sayısı yayımlamıyor.
 */
export function konuSoruHedefi(topic: TopicId): number {
  return Math.min(35, Math.max(20, Math.round((15 + TOPICS[topic].examWeight) / 5) * 5));
}

/**
 * Konu günlerinin sırası — planın belkemiği.
 *
 * 1. tur müfredat sırasıyla ilerler ve **mutlaka bütün konuları kapsar**: gün
 * yetmiyorsa bir güne iki konu düşer. "Sınava kadar her şey yetişsin" güvencesi
 * burada duruyor — hiçbir konu hiç görülmeden son düzlüğe girilmez.
 *
 * 2. tur ağırlık sırasıyla yine bütün konuları dolaşır. Artan günler ağırlığa
 * göre paylaştırılır; Genel Turizm beş kez dönerken Dinler Tarihi bir kez döner.
 * Aynı konu arka arkaya iki gün gelmez — aralıklı tekrar böyle doğal oluşur.
 */
function konuSirasi(gunSayisi: number): { topics: TopicId[]; round: number }[] {
  const plan: { topics: TopicId[]; round: number }[] = [];
  if (gunSayisi <= 0) return plan;

  // 1. tur: tüm müfredat, gerekirse günde birden çok konu.
  const grupBoyu = Math.max(1, Math.ceil(MUFREDAT_SIRASI.length / gunSayisi));
  for (let i = 0; i < MUFREDAT_SIRASI.length && plan.length < gunSayisi; i += grupBoyu) {
    plan.push({ topics: MUFREDAT_SIRASI.slice(i, i + grupBoyu), round: 1 });
  }

  // 2. tur: ağırlık sırasıyla tüm konular, gün yettiği kadar.
  for (const t of AGIRLIK_SIRASI) {
    if (plan.length >= gunSayisi) break;
    plan.push({ topics: [t], round: 2 });
  }

  // 3. tur ve sonrası: ağırlıkla orantılı döngü.
  const cevrim = agirlikCevrimi();
  for (let i = 0; plan.length < gunSayisi; i++) {
    plan.push({ topics: [cevrim[i % cevrim.length]], round: 3 });
  }

  return plan;
}

/**
 * Ağırlığa göre tekrarlanan konu döngüsü.
 *
 * Her turda kotası kalan konular bir kez geçer; ağır konular daha çok tur
 * dayandığı için listede daha sık görünür. Tek bir konu üst üste gelmez.
 */
function agirlikCevrimi(): TopicId[] {
  const kalan = new Map<TopicId, number>(
    AGIRLIK_SIRASI.map((t) => [t, Math.max(1, Math.round(TOPICS[t].examWeight / 4))]),
  );
  const out: TopicId[] = [];
  for (let guvenlik = 0; guvenlik < 20; guvenlik++) {
    let eklendi = false;
    for (const t of AGIRLIK_SIRASI) {
      const n = kalan.get(t) ?? 0;
      if (n <= 0) continue;
      out.push(t);
      kalan.set(t, n - 1);
      eklendi = true;
    }
    if (!eklendi) break;
  }
  return out;
}

/** Günün denemesi her çalışma gününde var: düzenin omurgası bu. */
function gunlukDeneme(): PlanGoal {
  return {
    kind: 'daily',
    label: `Günün denemesi — ${DAILY_QUESTION_COUNT} soru`,
    count: DAILY_QUESTION_COUNT,
    href: '/denemeler',
  };
}

/**
 * Bir konu gününün hedefleri.
 *
 * Her gün aynı şekle sahip — oku, çöz, günün denemesi, tekrar. Aynı iskelet
 * her sabah tekrarlanınca plan "bugün ne yapsam" sorusunu ortadan kaldırır.
 * Değişen tek şey konu ve soru sayısı; onu da ağırlık belirliyor.
 */
function konuHedefleri(topics: TopicId[], round: number): PlanGoal[] {
  const goals: PlanGoal[] = [];

  for (const topic of topics) {
    const short = TOPICS[topic].short;
    const adet = konuSoruHedefi(topic);
    const agirlik = TOPICS[topic].examWeight;

    if (round === 1) {
      goals.push({ kind: 'reading', label: `${short} — konu anlatımını oku`, href: `/konular/${topic}`, topicId: topic });
      goals.push({
        kind: 'questions',
        label: `${short} — ${adet} soru çöz`,
        count: adet,
        href: `/pratik?topic=${topic}&count=${adet}`,
        topicId: topic,
      });
    } else if (round === 2) {
      goals.push({
        kind: 'reading',
        label: `${short} — özeti ve tuzakları gözden geçir`,
        href: `/konular/${topic}`,
        topicId: topic,
      });
      goals.push({
        kind: 'questions',
        label: `${short} — ${adet} soru (denemede ~${agirlik} soru)`,
        count: adet,
        href: `/pratik?topic=${topic}&count=${adet}`,
        topicId: topic,
      });
    } else {
      goals.push({
        kind: 'questions',
        label: `${short} — ${adet} yeni soru`,
        count: adet,
        href: `/pratik?topic=${topic}&count=${adet}&status=unseen`,
        topicId: topic,
      });
      goals.push({
        kind: 'reading',
        label: `${short} — zayıf kaldığın bölümleri tekrar oku`,
        href: `/konular/${topic}`,
        topicId: topic,
      });
    }
  }

  goals.push(gunlukDeneme());
  goals.push(
    round === 1
      ? { kind: 'review', label: 'Günün kartlarını çalış', href: '/tekrar' }
      : { kind: 'review', label: 'Yanlış havuzunu azalt', href: '/yanlis-havuzu' },
  );

  return goals;
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

  const queue = konuSirasi(topicDates.length);

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
          gunlukDeneme(),
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
          { kind: 'review', label: 'Kart tekrarı', href: '/tekrar' },
        ],
      };
    }

    const slot = queue[qi] ?? { topics: [AGIRLIK_SIRASI[0]], round: 3 };
    qi += 1;

    return {
      id,
      date,
      label,
      weekNo,
      weekday,
      phase: (slot.round === 1 ? 'temel' : 'pekistirme') as PlanPhase,
      focusTopics: slot.topics,
      goals: konuHedefleri(slot.topics, slot.round),
    };
  });
}

export interface KonuPayi {
  topicId: TopicId;
  agirlik: number;
  gun: number;
  soru: number;
}

export interface PlanOzet {
  toplamGun: number;
  konuGunu: number;
  denemeGunu: number;
  finalGunu: number;
  hedefSayisi: number;
  /** Plandaki tüm soru hedeflerinin toplamı (günün denemeleri dâhil). */
  toplamSoru: number;
  gunlukSoru: number;
  konuDagilimi: KonuPayi[];
}

/**
 * Planın sayısal özeti.
 *
 * "Sınava kadar yetişiyor mu" sorusunun cevabı burada: hangi konuya kaç gün ve
 * kaç soru düştüğü, günde ortalama kaç soru çözüleceği.
 */
export function planOzeti(plan: PlanDay[]): PlanOzet {
  const gun = new Map<TopicId, number>(TOPIC_IDS.map((t) => [t, 0]));
  const soru = new Map<TopicId, number>(TOPIC_IDS.map((t) => [t, 0]));

  let konuGunu = 0;
  let denemeGunu = 0;
  let finalGunu = 0;
  let hedefSayisi = 0;
  let toplamSoru = 0;

  for (const day of plan) {
    hedefSayisi += day.goals.length;
    if (day.phase === 'final') finalGunu += 1;
    else if (day.focusTopics.length > 0) konuGunu += 1;
    else denemeGunu += 1;

    for (const t of day.focusTopics) gun.set(t, (gun.get(t) ?? 0) + 1);

    for (const g of day.goals) {
      // Pazar denemesi 100 soruluk; etiketinde sayı var ama count taşımıyor.
      const adet = g.count ?? (g.kind === 'exam' ? 100 : 0);
      toplamSoru += adet;
      if (g.topicId && g.count) soru.set(g.topicId, (soru.get(g.topicId) ?? 0) + g.count);
    }
  }

  const konuDagilimi = [...TOPIC_IDS]
    .map((topicId) => ({
      topicId,
      agirlik: TOPICS[topicId].examWeight,
      gun: gun.get(topicId) ?? 0,
      soru: soru.get(topicId) ?? 0,
    }))
    .sort((a, b) => b.agirlik - a.agirlik || TOPICS[a.topicId].order - TOPICS[b.topicId].order);

  return {
    toplamGun: plan.length,
    konuGunu,
    denemeGunu,
    finalGunu,
    hedefSayisi,
    toplamSoru,
    gunlukSoru: plan.length === 0 ? 0 : Math.round(toplamSoru / plan.length),
    konuDagilimi,
  };
}

/** Bugünden sınava kadar geçerli plan — sayfaların ortak girişi. */
export function currentPlan(): PlanDay[] {
  return generatePlan(new Date(), EXAM_DATE);
}
