import { aileler, questionBank } from '@/content/index';
import { aileSorusunuQuestion } from './soruAilesi';
import type { Question } from './types';
import type { TopicId } from './constants';

/**
 * Tüm soru kaynaklarını tek havuzda birleştirir.
 *
 * Günlük deneme yalnızca 715 soruluk bankadan çekiyordu; 894 türev ve aile
 * kaynak soruları havuzun dışındaydı. 30 gün × 50 soru = 1500 çekiliş için
 * 715'lik havuz tekrarı kaçınılmaz kılıyordu.
 */

/** Aile sorularını (kaynak + türevler) Question biçiminde döndürür. */
function aileSorulari(): Question[] {
  const out: Question[] = [];
  for (const a of aileler) {
    out.push(aileSorusunuQuestion(a.kaynak.soru, a.topicId, a.cekirdek));
    for (const t of a.turevler) out.push(aileSorusunuQuestion(t, a.topicId, a.cekirdek));
  }
  return out;
}

/** Banka + aile soruları, id'ye göre tekilleştirilmiş. */
export const tumSorular: Question[] = (() => {
  const gorulen = new Set<string>();
  const out: Question[] = [];
  for (const q of [...questionBank, ...aileSorulari()]) {
    if (gorulen.has(q.id)) continue;
    gorulen.add(q.id);
    out.push(q);
  }
  return out;
})();

/** Konu bazlı havuz — her çağrıda yeniden hesaplanmasın diye önceden kurulur. */
export const konuHavuzu: Record<string, Question[]> = (() => {
  const m: Record<string, Question[]> = {};
  for (const q of tumSorular) (m[q.topicId] ??= []).push(q);
  return m;
})();

/** FNV-1a — kararlı, platformdan bağımsız. */
function tohum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function karistir<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Konu havuzunun SABİT tohumla karıştırılmış hâli.
 *
 * Tohum tarihe değil konuya bağlıdır; böylece sıra her gün aynı kalır ve
 * günler havuzu ÜST ÜSTE BİNMEDEN paylaşabilir.
 */
const siraliHavuz: Record<string, Question[]> = (() => {
  const m: Record<string, Question[]> = {};
  for (const [topicId, liste] of Object.entries(konuHavuzu)) {
    m[topicId] = karistir(liste, rng(tohum(`mks-havuz-${topicId}`)));
  }
  return m;
})();

/**
 * Belirli bir gün için, belirli bir konudan `adet` soru verir.
 *
 * Rastgele seçmek yerine havuzu dilimler: gün 0 ilk N soruyu, gün 1 sonraki
 * N'i alır. Havuz bitene kadar HİÇBİR SORU TEKRAR ETMEZ — 30 gün boyunca aynı
 * soruların dönüp durması sorunu buradan çözülür. Havuz biterse başa sarar.
 */
export function gununSorulari(topicId: TopicId, gunIndeksi: number, adet: number): Question[] {
  const havuz = siraliHavuz[topicId] ?? [];
  if (havuz.length === 0 || adet <= 0) return [];

  const out: Question[] = [];
  const baslangic = (gunIndeksi * adet) % havuz.length;
  for (let i = 0; i < Math.min(adet, havuz.length); i++) {
    out.push(havuz[(baslangic + i) % havuz.length]);
  }
  return out;
}

/** Havuz kaç güne yeter? Kullanıcıya "tekrar başlıyor" demek için. */
export function havuzGunKapasitesi(gunlukAdet: Record<string, number>): number {
  let enAz = Infinity;
  for (const [topicId, adet] of Object.entries(gunlukAdet)) {
    if (adet <= 0) continue;
    const havuz = siraliHavuz[topicId]?.length ?? 0;
    enAz = Math.min(enAz, Math.floor(havuz / adet));
  }
  return Number.isFinite(enAz) ? enAz : 0;
}
