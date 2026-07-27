import { describe, expect, it } from 'vitest';
import { generatePlan, konuSoruHedefi, planOzeti } from './planner';
import { TOPICS, TOPIC_IDS } from './constants';

const START = new Date('2026-07-25T09:00:00+03:00');
const EXAM = new Date('2026-08-29T10:00:00+03:00');

describe('generatePlan', () => {
  const plan = generatePlan(START, EXAM);

  it('başlangıçtan sınav gününe kadar tüm günleri kapsar', () => {
    expect(plan[0].date).toBe('2026-07-25');
    expect(plan[plan.length - 1].date).toBe('2026-08-28'); // sınavdan önceki gün son plan günü
    expect(plan).toHaveLength(35);
  });

  it('her konu son düzlükten ÖNCE en az bir kez işlenir', () => {
    // "Sınava kadar her şey yetişsin" güvencesi: hiçbir konu hiç görülmeden
    // genel tekrara girilemez.
    const temelGunler = plan.filter((d) => d.phase !== 'final');
    for (const id of TOPIC_IDS) {
      const gorulen = temelGunler.some((d) => d.focusTopics.includes(id));
      expect(gorulen, `konu ${id} hiç işlenmiyor`).toBe(true);
    }
  });

  it('her konu en az 2 gün odakta olur', () => {
    for (const id of TOPIC_IDS) {
      const days = plan.filter((d) => d.focusTopics.includes(id)).length;
      expect(days, `konu ${id} sadece ${days} gün odakta`).toBeGreaterThanOrEqual(2);
    }
  });

  it('ağır konular hafif konulardan daha çok gün alır', () => {
    const gunSayisi = (id: (typeof TOPIC_IDS)[number]) => plan.filter((d) => d.focusTopics.includes(id)).length;
    // Genel Turizm 20, Dinler Tarihi 4 — beş kat fark gün sayısına yansımalı
    expect(gunSayisi('genel-turizm')).toBeGreaterThan(gunSayisi('dinler-tarihi'));
    expect(gunSayisi('turizm-cografyasi')).toBeGreaterThan(gunSayisi('osmanli-tarihi'));
  });

  it('aynı konu arka arkaya iki gün gelmez', () => {
    const konuGunleri = plan.filter((d) => d.focusTopics.length > 0);
    for (let i = 1; i < konuGunleri.length; i++) {
      const onceki = konuGunleri[i - 1].focusTopics;
      const simdi = konuGunleri[i].focusTopics;
      const ortak = simdi.filter((t) => onceki.includes(t));
      expect(ortak, `${konuGunleri[i].date} önceki günle aynı konuyu tekrarlıyor`).toEqual([]);
    }
  });

  it('her çalışma gününde günün denemesi vardır', () => {
    for (const day of plan) {
      if (day.goals.some((g) => g.kind === 'exam')) continue; // pazar: 100 soruluk deneme
      expect(day.goals.some((g) => g.kind === 'daily'), `${day.date} gününde günlük deneme yok`).toBe(true);
    }
  });

  it('konu günleri hep aynı iskelete sahiptir: oku, çöz, deneme, tekrar', () => {
    for (const day of plan.filter((d) => d.focusTopics.length === 1 && d.phase !== 'final')) {
      const kinds = day.goals.map((g) => g.kind);
      expect(kinds).toContain('reading');
      expect(kinds).toContain('questions');
      expect(kinds).toContain('daily');
      expect(kinds).toContain('review');
    }
  });

  it('pazar günleri deneme/çıkmış çözümü içerir', () => {
    const sundays = plan.filter((d) => new Date(`${d.date}T12:00:00+03:00`).getDay() === 0);
    expect(sundays.length).toBeGreaterThan(0);
    for (const day of sundays) {
      expect(day.goals.some((g) => g.kind === 'exam'), `${day.date} pazar ama deneme yok`).toBe(true);
    }
  });

  it('son 3 gün genel tekrar modundadır (yeni konu yok)', () => {
    const lastThree = plan.slice(-3);
    for (const day of lastThree) {
      expect(day.focusTopics).toEqual([]);
      expect(day.goals.some((g) => g.kind === 'review')).toBe(true);
      expect(day.goals.some((g) => g.kind === 'reading' && g.label.includes('Kısa'))).toBe(true);
    }
  });

  it('deterministiktir', () => {
    expect(generatePlan(START, EXAM)).toEqual(plan);
  });

  it("gün id'leri benzersizdir", () => {
    const ids = plan.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gün az kaldığında bile bütün konuları sıkıştırarak kapsar', () => {
    // Sınava 10 gün kala açan biri de her konuyu görmeli
    const kisa = generatePlan(new Date('2026-08-19T09:00:00+03:00'), EXAM);
    const islenen = new Set(kisa.flatMap((d) => d.focusTopics));
    expect(islenen.size).toBe(TOPIC_IDS.length);
  });

  it('süre bittiyse boş plan döner, patlamaz', () => {
    expect(generatePlan(new Date('2026-08-29T09:00:00+03:00'), EXAM)).toEqual([]);
  });
});

describe('konuSoruHedefi', () => {
  it('sınav ağırlığıyla orantılıdır', () => {
    expect(konuSoruHedefi('genel-turizm')).toBeGreaterThan(konuSoruHedefi('dinler-tarihi'));
    expect(konuSoruHedefi('turizm-cografyasi')).toBeGreaterThan(konuSoruHedefi('ilk-yardim'));
  });

  it('20 ile 35 arasında kalır — hiçbir konu ihmal edilmez, hiçbiri de günü yemez', () => {
    for (const id of TOPIC_IDS) {
      const n = konuSoruHedefi(id);
      expect(n, `konu ${id}`).toBeGreaterThanOrEqual(20);
      expect(n, `konu ${id}`).toBeLessThanOrEqual(35);
    }
  });
});

describe('planOzeti', () => {
  const ozet = planOzeti(generatePlan(START, EXAM));

  it('gün sayılarını doğru böler', () => {
    expect(ozet.konuGunu + ozet.denemeGunu + ozet.finalGunu).toBe(ozet.toplamGun);
    expect(ozet.finalGunu).toBe(3);
  });

  it('soru dağılımı ağırlıkla aynı yönde ilerler', () => {
    const bul = (id: string) => ozet.konuDagilimi.find((k) => k.topicId === id)!;
    expect(bul('genel-turizm').soru).toBeGreaterThan(bul('dinler-tarihi').soru);
    // En ağır konu listenin başında
    expect(ozet.konuDagilimi[0].agirlik).toBe(Math.max(...TOPIC_IDS.map((t) => TOPICS[t].examWeight)));
  });

  it('her konuya soru düşer — sıfır kalan konu olmaz', () => {
    for (const k of ozet.konuDagilimi) {
      expect(k.soru, `konu ${k.topicId} hiç soru almamış`).toBeGreaterThan(0);
      expect(k.gun, `konu ${k.topicId} hiç gün almamış`).toBeGreaterThan(0);
    }
  });

  it('günlük soru yükü makul kalır', () => {
    // Günde 1-2 saatlik çalışmaya karşılık gelir; bunun üstü sürdürülemez.
    expect(ozet.gunlukSoru).toBeGreaterThan(30);
    expect(ozet.gunlukSoru).toBeLessThan(120);
  });
});
