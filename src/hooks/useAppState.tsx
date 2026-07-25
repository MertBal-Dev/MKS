import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadState, saveState, type AppState } from '@/lib/storage';

interface AppStateCtx {
  state: AppState;
  /** Değişikliği hem React state'ine hem localStorage'a yazar. */
  update: (fn: (s: AppState) => AppState) => void;
  /** State'i olduğu gibi değiştirir (içe aktarma / sıfırlama). */
  replace: (s: AppState) => void;
}

const Ctx = createContext<AppStateCtx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const replace = useCallback((s: AppState) => {
    saveState(s);
    setState(s);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const t = state.settings.theme;
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.theme]);

  return <Ctx.Provider value={{ state, update, replace }}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState, AppStateProvider içinde kullanılmalı');
  return ctx;
}
