import type { AppState } from './storage';
import type { Question } from './types';
import { TOPIC_IDS, type TopicId } from './constants';

/**
 * "Ne kadar çalıştım?" sorusunun tek yerden cevabı.
 *
 * Uygulama şimdiye kadar soru bazında istatistik tutuyordu; öğrencinin görmek
 * istediği ise toplamlar: kaç soru çözdüm, kaçı doğru, kaç deneme bitirdim.
 * Hepsi mevcut durumdan türetilir, yeni veri saklanmaz.
 */
export interface CalismaOzeti {
  /** Cevaplanan toplam soru (aynı soru birden çok kez çözülmüşse hepsi sayılır). */
  toplamCevap: number;
  dogru: number;
  yanlis: number;
  /** Yüzde başarı; hiç cevap yoksa null. */
  basari: number | null;
  /** Kaç FARKLI soru görülmüş. */
  benzersizSoru: number;
  /** Soru bankasının yüzde kaçına dokunulmuş. */
  bankaKapsama: number;
  bitenDeneme: number;
  denemeOrtalama: number | null;
  enYuksekDeneme: number | null;
  tekrarKarti: number;
  yanlisHavuzu: number;
  isaretli: number;
  guncelSeri: number;
  enUzunSeri: number;
  /** Çalışılan farklı gün sayısı. */
  calisilanGun: number;
}

export function calismaOzeti(state: AppState, bank: Question[]): CalismaOzeti {
  const attempts = Object.values(state.attempts);

  let dogru = 0;
  let yanlis = 0;
  const gunler = new Set<string>();

  for (const a of attempts) {
    dogru += a.correct;
    yanlis += a.wrong;
    if (a.lastAt) gunler.add(a.lastAt.slice(0, 10));
  }

  const toplamCevap = dogru + yanlis;
  const benzersizSoru = attempts.length;

  const puanlar = state.examResults.map((r) => r.score);
  const denemeOrtalama = puanlar.length ? puanlar.reduce((s, p) => s + p, 0) / puanlar.length : null;

  // Deneme günleri de çalışma günüdür
  for (const r of state.examResults) if (r.finishedAt) gunler.add(r.finishedAt.slice(0, 10));

  return {
    toplamCevap,
    dogru,
    yanlis,
    basari: toplamCevap === 0 ? null : Math.round((dogru / toplamCevap) * 100),
    benzersizSoru,
    bankaKapsama: bank.length === 0 ? 0 : Math.round((benzersizSoru / bank.length) * 100),
    bitenDeneme: state.examResults.length,
    denemeOrtalama: denemeOrtalama === null ? null : Math.round(denemeOrtalama),
    enYuksekDeneme: puanlar.length ? Math.round(Math.max(...puanlar)) : null,
    tekrarKarti: Object.keys(state.srs).length,
    yanlisHavuzu: Object.keys(state.wrongPool).length,
    isaretli: state.flagged.length,
    guncelSeri: state.streak.current,
    enUzunSeri: state.streak.best,
    calisilanGun: gunler.size,
  };
}

export interface KonuSatiri {
  id: TopicId;
  dogru: number;
  yanlis: number;
  toplam: number;
  pct: number | null;
}

/** Konu bazlı doğru/yanlış dökümü — hangi konuda ne kadar çalışıldığını gösterir. */
export function konuDokumu(state: AppState, bank: Question[]): KonuSatiri[] {
  const byId = new Map(bank.map((q) => [q.id, q.topicId]));
  const sayac = new Map<TopicId, { dogru: number; yanlis: number }>(
    TOPIC_IDS.map((id) => [id, { dogru: 0, yanlis: 0 }]),
  );

  for (const [qid, a] of Object.entries(state.attempts)) {
    const topic = byId.get(qid);
    if (!topic) continue;
    const s = sayac.get(topic as TopicId);
    if (!s) continue;
    s.dogru += a.correct;
    s.yanlis += a.wrong;
  }

  return TOPIC_IDS.map((id) => {
    const s = sayac.get(id)!;
    const toplam = s.dogru + s.yanlis;
    return { id, dogru: s.dogru, yanlis: s.yanlis, toplam, pct: toplam === 0 ? null : Math.round((s.dogru / toplam) * 100) };
  });
}
