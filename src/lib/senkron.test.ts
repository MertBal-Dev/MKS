import { describe, expect, it } from 'vitest';
import { birlestir, setleriBirlestir, type UzakDurum } from './senkron';
import { AppStateSchema, DEFAULT_STATE, type AppState } from './storage';
import type { CustomSet } from './customSets';

function durum(ek: Partial<AppState> = {}): AppState {
  return { ...structuredClone(DEFAULT_STATE), ...ek };
}

describe('birlestir', () => {
  it('uzak boşsa yereli olduğu gibi bırakır', () => {
    const yerel = durum({ flagged: ['s1'], streak: { lastStudyDay: '2026-07-20', current: 3, best: 5 } });
    expect(birlestir(yerel, {})).toEqual(yerel);
  });

  it('yerel boşsa uzaktaki her şeyi alır', () => {
    const uzak: UzakDurum = {
      attempts: { s1: { correct: 2, wrong: 1, lastResult: 'correct', lastAt: '2026-07-20T10:00:00.000Z' } },
      flagged: ['s9'],
      streak: { lastStudyDay: '2026-07-21', current: 4, best: 9 },
    };
    const sonuc = birlestir(durum(), uzak);
    expect(sonuc.attempts.s1.correct).toBe(2);
    expect(sonuc.flagged).toEqual(['s9']);
    expect(sonuc.streak.best).toBe(9);
  });

  it('deneme sayaçlarında yüksek olanı korur — çalışma silinmez', () => {
    const yerel = durum({
      attempts: { s1: { correct: 5, wrong: 1, lastResult: 'correct', lastAt: '2026-07-20T10:00:00.000Z' } },
    });
    const uzak: UzakDurum = {
      attempts: { s1: { correct: 2, wrong: 4, lastResult: 'wrong', lastAt: '2026-07-22T10:00:00.000Z' } },
    };
    const sonuc = birlestir(yerel, uzak);
    expect(sonuc.attempts.s1).toEqual({
      correct: 5,
      wrong: 4,
      // Son sonuç, son dokunulan cihazdan gelir
      lastResult: 'wrong',
      lastAt: '2026-07-22T10:00:00.000Z',
    });
  });

  it('aynı denemeyi iki kez kaydetmez', () => {
    const r = {
      examId: 'gunluk-2026-07-25',
      finishedAt: '2026-07-25T09:00:00.000Z',
      score: 80,
      correct: 24,
      wrong: 6,
      blank: 0,
      byTopic: {},
      answers: {},
    };
    const sonuc = birlestir(durum({ examResults: [r] }), { examResults: [r] });
    expect(sonuc.examResults).toHaveLength(1);
  });

  it('deneme sonuçlarını kronolojik sırada tutar — arayüz sonuncuyu sonda arıyor', () => {
    const yap = (id: string, t: string) => ({
      examId: id,
      finishedAt: t,
      score: 70,
      correct: 21,
      wrong: 9,
      blank: 0,
      byTopic: {},
      answers: {},
    });
    const sonuc = birlestir(durum({ examResults: [yap('a', '2026-07-25T09:00:00.000Z')] }), {
      examResults: [yap('b', '2026-07-20T09:00:00.000Z'), yap('c', '2026-07-28T09:00:00.000Z')],
    });
    expect(sonuc.examResults.map((r) => r.examId)).toEqual(['b', 'a', 'c']);
  });

  it('tekrar kartlarında ileri kutuyu korur', () => {
    const yerel = durum({ srs: { k1: { box: 4, dueAt: '2026-08-01T00:00:00.000Z' } } });
    const uzak: UzakDurum = { srs: { k1: { box: 2, dueAt: '2026-09-01T00:00:00.000Z' } } };
    expect(birlestir(yerel, uzak).srs.k1.box).toBe(4);
  });

  it('yanlış havuzunda en son eklenen kayıt geçerlidir', () => {
    const yerel = durum({ wrongPool: { s1: { addedAt: '2026-07-20T00:00:00.000Z', consecutiveCorrect: 2 } } });
    const uzak: UzakDurum = { wrongPool: { s1: { addedAt: '2026-07-24T00:00:00.000Z', consecutiveCorrect: 0 } } };
    expect(birlestir(yerel, uzak).wrongPool.s1.consecutiveCorrect).toBe(0);
  });

  it('tamamlanan plan hedefi geri alınmaz', () => {
    const yerel = durum({ planProgress: { 'gun-2026-07-25:1': false } });
    const uzak: UzakDurum = { planProgress: { 'gun-2026-07-25:1': true, 'gun-2026-07-26:0': true } };
    const sonuc = birlestir(yerel, uzak);
    expect(sonuc.planProgress['gun-2026-07-25:1']).toBe(true);
    expect(sonuc.planProgress['gun-2026-07-26:0']).toBe(true);
  });

  it('yerelde ayara dokunulmamışsa sunucudaki tercihi alır', () => {
    const sonuc = birlestir(durum(), { settings: { theme: 'light', countdown: 'full' } });
    expect(sonuc.settings).toEqual({ theme: 'light', countdown: 'full' });
  });

  it('bu cihazda yapılmış ayar seçimi sunucu tarafından ezilmez', () => {
    const yerel = durum({ settings: { theme: 'light', countdown: 'hidden' } });
    const sonuc = birlestir(yerel, { settings: { theme: 'dark', countdown: 'full' } });
    expect(sonuc.settings).toEqual({ theme: 'light', countdown: 'hidden' });
  });

  it('işaretli sorularda birleşim alır ve tekrarlamaz', () => {
    const sonuc = birlestir(durum({ flagged: ['a', 'b'] }), { flagged: ['b', 'c'] });
    expect(sonuc.flagged).toEqual(['a', 'b', 'c']);
  });

  it('birleştirme asla geçersiz durum üretmez', () => {
    const sonuc = birlestir(durum({ flagged: ['a'] }), {
      flagged: ['b'],
      srs: { k: { box: 3, dueAt: '2026-08-01T00:00:00.000Z' } },
      attempts: { s: { correct: 1, wrong: 0, lastResult: 'correct', lastAt: '2026-07-25T00:00:00.000Z' } },
    });
    expect(() => AppStateSchema.parse(sonuc)).not.toThrow();
  });
});

describe('setleriBirlestir', () => {
  const set = (id: string, createdAt: string, title = id): CustomSet => ({
    id,
    title,
    sourceName: '',
    createdAt,
    questions: [],
  });

  it('iki taraftaki setleri birleştirir', () => {
    const sonuc = setleriBirlestir([set('a', '2026-07-20T00:00:00.000Z')], [set('b', '2026-07-21T00:00:00.000Z')]);
    expect(sonuc.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('aynı kimlikte daha yeni olanı tutar', () => {
    const sonuc = setleriBirlestir(
      [set('a', '2026-07-25T00:00:00.000Z', 'yeni')],
      [set('a', '2026-07-20T00:00:00.000Z', 'eski')],
    );
    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].title).toBe('yeni');
  });
});
