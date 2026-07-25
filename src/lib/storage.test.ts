import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STATE, exportState, importState, loadState, saveState, updateState } from './storage';

function installFakeLocalStorage() {
  const map = new Map<string, string>();
  const fake = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => void map.clear(),
  };
  (globalThis as Record<string, unknown>).localStorage = fake;
}

beforeEach(() => {
  installFakeLocalStorage();
});

describe('storage', () => {
  it('boş depoda DEFAULT_STATE döner', () => {
    const s = loadState();
    expect(s).toEqual(DEFAULT_STATE);
    expect(s.version).toBe(1);
  });

  it('save/load simetriktir', () => {
    const s = loadState();
    s.streak = { lastStudyDay: '2026-07-25', current: 3, best: 5 };
    saveState(s);
    expect(loadState().streak.current).toBe(3);
  });

  it('updateState kalıcıdır ve yeni state döner', () => {
    const next = updateState((s) => ({ ...s, planProgress: { ...s.planProgress, 'gun-2026-07-25': true } }));
    expect(next.planProgress['gun-2026-07-25']).toBe(true);
    expect(loadState().planProgress['gun-2026-07-25']).toBe(true);
  });

  it('bozuk kayıtta DEFAULT_STATE\'e döner (çökmez)', () => {
    localStorage.setItem('mks:v1', '{bozuk json');
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('export → import round-trip çalışır', () => {
    updateState((s) => ({ ...s, streak: { lastStudyDay: '2026-07-24', current: 2, best: 2 } }));
    const json = exportState();
    localStorage.clear();
    const imported = importState(json);
    expect(imported.streak.best).toBe(2);
    expect(loadState().streak.best).toBe(2);
  });

  it('importState geçersiz JSON\'da fırlatır', () => {
    expect(() => importState('###')).toThrow();
  });

  it('importState şemaya uymayan veride fırlatır', () => {
    expect(() => importState(JSON.stringify({ version: 99, foo: 'bar' }))).toThrow();
  });
});
