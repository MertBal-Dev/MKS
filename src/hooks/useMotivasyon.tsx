import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MotivasyonKarti } from '@/components/MotivasyonKarti';
import { useAppState } from '@/hooks/useAppState';
import { gunKarti, type MotivasyonKart } from '@/lib/motivasyon';
import { currentPlan } from '@/lib/planner';
import { EXAM_DATE } from '@/lib/constants';
import { todayKey } from '@/lib/streak';

interface MotivasyonCtx {
  /**
   * Kutlamayı gösterir. Aynı `id` ile ikinci kez çağrılırsa hiçbir şey olmaz —
   * bir başarı bir kez kutlanır; sayfa her yenilendiğinde tekrar çıkan tebrik
   * kutlama olmaktan çıkıp engele dönüşür.
   */
  kutla: (id: string, uret: () => MotivasyonKart) => void;
}

const Ctx = createContext<MotivasyonCtx | null>(null);

const ANAHTAR = 'mks:kutlanan';
/** Geçmiş kutlamalar sınırsız birikmesin; en yenileri yeter. */
const SINIR = 300;

function kutlananlar(): string[] {
  try {
    const ham = JSON.parse(localStorage.getItem(ANAHTAR) ?? '[]');
    return Array.isArray(ham) ? ham.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function isaretle(id: string): void {
  const liste = [...kutlananlar().filter((x) => x !== id), id].slice(-SINIR);
  localStorage.setItem(ANAHTAR, JSON.stringify(liste));
}

export function MotivasyonProvider({ children }: { children: ReactNode }) {
  const { state } = useAppState();
  const [kart, setKart] = useState<MotivasyonKart | null>(null);

  const kutla = useCallback((id: string, uret: () => MotivasyonKart) => {
    if (kutlananlar().includes(id)) return;
    isaretle(id);
    setKart(uret());
  }, []);

  const plan = useMemo(() => currentPlan(), []);
  const today = todayKey();

  // Günün planı tamamlandığında kutlama. Kontrol burada duruyor, Plan
  // sayfasında değil: son kutu Ana Sayfa'dan da işaretlenebiliyor ve kutlamanın
  // hangi sayfada olduğuna bağlı olmaması gerekiyor.
  useEffect(() => {
    const bugun = plan.find((d) => d.date === today);
    if (!bugun || bugun.goals.length === 0) return;

    const tamamMi = bugun.goals.every((_, i) => state.planProgress[`${bugun.id}:${i}`] === true);
    if (!tamamMi) return;

    const toplam = plan.reduce((n, d) => n + d.goals.length, 0);
    const biten = plan.reduce(
      (n, d) => n + d.goals.filter((_, i) => state.planProgress[`${d.id}:${i}`] === true).length,
      0,
    );
    const kalanGun = Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86_400_000));

    kutla(`gun-${today}`, () =>
      gunKarti({
        tarih: today,
        seri: state.streak.current,
        kalanGun,
        planYuzde: toplam === 0 ? 0 : Math.round((biten / toplam) * 100),
      }),
    );
  }, [state.planProgress, state.streak.current, plan, today, kutla]);

  return (
    <Ctx.Provider value={{ kutla }}>
      {children}
      <MotivasyonKarti kart={kart} onKapat={() => setKart(null)} />
    </Ctx.Provider>
  );
}

export function useMotivasyon(): MotivasyonCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMotivasyon, MotivasyonProvider içinde kullanılmalı');
  return ctx;
}
