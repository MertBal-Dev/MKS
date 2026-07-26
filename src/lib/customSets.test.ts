import { beforeEach, describe, expect, it } from 'vitest';
import {
  BLOCK_SIZE,
  blocksOf,
  customDurationMin,
  deleteSet,
  loadSets,
  resolveCustomExam,
  toQuestion,
  upsertSet,
  type CustomQuestion,
  type CustomSet,
} from './customSets';

function soru(n: number): CustomQuestion {
  return {
    id: `q${n}`,
    stem: `Soru ${n}?`,
    choices: [
      { id: 'A', text: 'birinci' },
      { id: 'B', text: 'ikinci' },
    ],
    correct: 'B',
    explanation: 'çünkü öyle',
    answerSource: 'belge',
    confidence: 'kesin',
    difficulty: 2,
  };
}

function set(id: string, adet: number): CustomSet {
  return {
    id,
    title: `Set ${id}`,
    sourceName: 'test.pdf',
    createdAt: '2026-07-26T00:00:00.000Z',
    questions: Array.from({ length: adet }, (_, i) => soru(i + 1)),
  };
}

/** Test ortamında localStorage yok; storage.test.ts ile aynı sahteyi kurar. */
function installFakeLocalStorage() {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => void map.clear(),
  };
}

beforeEach(() => installFakeLocalStorage());

describe('blocksOf', () => {
  it('50\'şerlik bloklara böler, son blok eksik kalabilir', () => {
    const bloklar = blocksOf(set('a', 120));
    expect(bloklar).toHaveLength(3);
    expect(bloklar[0]).toHaveLength(BLOCK_SIZE);
    expect(bloklar[1]).toHaveLength(BLOCK_SIZE);
    expect(bloklar[2]).toHaveLength(20);
  });

  it('50 sorudan az set tek blok olur', () => {
    expect(blocksOf(set('a', 12))).toHaveLength(1);
  });

  it('hiçbir soru kaybolmaz veya tekrarlanmaz', () => {
    const s = set('a', 137);
    const duz = blocksOf(s).flat();
    expect(duz).toHaveLength(137);
    expect(new Set(duz.map((q) => q.id)).size).toBe(new Set(s.questions.map((q) => q.id)).size);
  });
});

describe('resolveCustomExam', () => {
  it('kayıtlı setin bloğunu sınava çevirir', () => {
    upsertSet(set('abc', 60));
    const exam = resolveCustomExam('kendi-abc-1');
    expect(exam).not.toBeNull();
    expect(exam!.questions).toHaveLength(10);
    expect(exam!.title).toContain('2. bölüm');
  });

  it('tek bloklu sette bölüm eki yazmaz', () => {
    upsertSet(set('abc', 10));
    expect(resolveCustomExam('kendi-abc-0')!.title).toBe('Set abc');
  });

  it('setId içinde tire olsa da doğru ayrışır', () => {
    upsertSet(set('a-b-c', 5));
    expect(resolveCustomExam('kendi-a-b-c-0')).not.toBeNull();
  });

  it('ilgisiz, eksik veya aralık dışı kimliklerde null döner', () => {
    upsertSet(set('abc', 10));
    expect(resolveCustomExam('gunluk-2026-07-26')).toBeNull();
    expect(resolveCustomExam(undefined)).toBeNull();
    expect(resolveCustomExam('kendi-yok-0')).toBeNull();
    expect(resolveCustomExam('kendi-abc-9')).toBeNull();
    expect(resolveCustomExam('kendi-abc-x')).toBeNull();
  });
});

describe('toQuestion', () => {
  it('açıklamayı yalnızca doğru şıkka koyar', () => {
    const q = toQuestion(soru(1));
    expect(q.choices.find((c) => c.id === 'B')!.explanation).toBe('çünkü öyle');
    expect(q.choices.find((c) => c.id === 'A')!.explanation).not.toBe('çünkü öyle');
  });

  it('konu verilmemişse geçerli bir konuya düşer', () => {
    expect(toQuestion(soru(1)).topicId).toBe('genel-turizm');
  });
});

describe('depolama', () => {
  it('kaydeder, günceller ve siler', () => {
    upsertSet(set('a', 3));
    upsertSet(set('b', 4));
    expect(loadSets()).toHaveLength(2);

    upsertSet({ ...set('a', 9), title: 'Yeni ad' });
    expect(loadSets()).toHaveLength(2);
    expect(loadSets().find((s) => s.id === 'a')!.title).toBe('Yeni ad');

    deleteSet('a');
    expect(loadSets().map((s) => s.id)).toEqual(['b']);
  });

  it('bozuk veri uygulamayı çökertmez', () => {
    localStorage.setItem('mks:kendi-sorular', '{bozuk json');
    expect(loadSets()).toEqual([]);
  });
});

describe('customDurationMin', () => {
  it('soru başına ~1,2 dakika verir ama 10 dakikanın altına inmez', () => {
    expect(customDurationMin(50)).toBe(60);
    expect(customDurationMin(2)).toBe(10);
    expect(customDurationMin(100)).toBe(120);
  });
});
