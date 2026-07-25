import { describe, expect, it } from 'vitest';
import {
  createSession,
  loadSession,
  remainingMs,
  saveSession,
  shouldAutoSubmit,
  clearSession,
} from './examSession';

function memStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => void map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const T0 = new Date('2026-08-01T10:00:00+03:00');

describe('examSession', () => {
  it('kalan süreyi hesaplar (120 dk)', () => {
    const s = createSession('deneme-1', T0);
    const at30min = new Date(T0.getTime() + 30 * 60_000);
    expect(remainingMs(s, at30min)).toBe(90 * 60_000);
  });

  it('süre bitince autoSubmit true olur', () => {
    const s = createSession('deneme-1', T0);
    const at121min = new Date(T0.getTime() + 121 * 60_000);
    expect(remainingMs(s, at121min)).toBe(0);
    expect(shouldAutoSubmit(s, at121min)).toBe(true);
    expect(shouldAutoSubmit(s, new Date(T0.getTime() + 60_000))).toBe(false);
  });

  it('oturum kaydedilir, yüklenir ve temizlenir', () => {
    const storage = memStorage();
    const s = createSession('deneme-1', T0);
    s.answers['q1'] = 'B';
    s.marked.push('q7');
    saveSession(storage, s);

    const loaded = loadSession(storage);
    expect(loaded?.examId).toBe('deneme-1');
    expect(loaded?.answers['q1']).toBe('B');
    expect(loaded?.marked).toContain('q7');

    clearSession(storage);
    expect(loadSession(storage)).toBeNull();
  });

  it('bozuk kayıt null döner', () => {
    const storage = memStorage();
    storage.setItem('mks:exam-session', '{bozuk');
    expect(loadSession(storage)).toBeNull();
  });
});
