import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadState, saveState, type AppState } from '@/lib/storage';
import { senkronKur, type SenkronBilgi, type SenkronMotoru } from '@/lib/senkron';
import { SETLER_DEGISTI } from '@/lib/customSets';
import { oturumIzle, supabaseVar } from '@/lib/supabase';

interface AppStateCtx {
  state: AppState;
  /** Değişikliği hem React state'ine hem localStorage'a yazar. */
  update: (fn: (s: AppState) => AppState) => void;
  /** State'i olduğu gibi değiştirir (içe aktarma / sıfırlama). */
  replace: (s: AppState) => void;
  /** Sunucuya yazmanın durumu. Giriş yapılmamışsa 'kapali'. */
  senkron: SenkronBilgi;
}

const Ctx = createContext<AppStateCtx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [senkron, setSenkron] = useState<SenkronBilgi>({ durum: 'kapali' });

  // Motor React döngüsünün dışında yaşar: zamanlayıcı ve "sunucuda ne var"
  // bilgisini render'lar arasında taşıması gerekiyor.
  const motorRef = useRef<SenkronMotoru | null>(null);
  // En güncel durum, senkron geri çağrılarının okuyabileceği bir yerde dursun.
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      motorRef.current?.planla(next);
      return next;
    });
  }, []);

  const replace = useCallback((s: AppState) => {
    saveState(s);
    setState(s);
    motorRef.current?.planla(s);
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

  // Oturum açıldığında sunucudakiyle birleştir, sonra değişiklikleri taşı.
  useEffect(() => {
    if (!supabaseVar) return;

    const motor = senkronKur(setSenkron);
    motorRef.current = motor;
    let acikKullanici: string | null = null;

    const birak = oturumIzle((oturum) => {
      const id = oturum?.user?.id ?? null;
      if (id === acikKullanici) return;
      acikKullanici = id;

      if (!id) {
        motor.durdur();
        return;
      }
      void motor.baslat(id, stateRef.current).then((birlesik) => {
        saveState(birlesik);
        setState(birlesik);
      });
    });

    // Sekme kapanırken bekleyen yazma kaybolmasın.
    const kapanirken = () => void motor.hemenGonder();
    window.addEventListener('pagehide', kapanirken);

    // Kendi soru setleri ana durumun dışında; değişince ayrıca tetiklenmeli.
    const setDegisti = () => motor.planla(stateRef.current);
    window.addEventListener(SETLER_DEGISTI, setDegisti);

    return () => {
      window.removeEventListener(SETLER_DEGISTI, setDegisti);
      window.removeEventListener('pagehide', kapanirken);
      birak();
      motor.durdur();
      motorRef.current = null;
    };
  }, []);

  return <Ctx.Provider value={{ state, update, replace, senkron }}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState, AppStateProvider içinde kullanılmalı');
  return ctx;
}
