import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Award, Compass, TrendingUp, X } from 'lucide-react';
import type { MotivasyonKart, MotivasyonTon } from '@/lib/motivasyon';

const TON: Record<MotivasyonTon, { simge: typeof Award; renk: string; halka: string }> = {
  basari: { simge: Award, renk: 'text-turkuaz', halka: 'bg-turkuaz/12' },
  ilerleme: { simge: TrendingUp, renk: 'text-altin', halka: 'bg-altin/12' },
  sakin: { simge: Compass, renk: 'text-kobalt', halka: 'bg-kobalt/12' },
};

/**
 * Bir günü ya da denemeyi bitirince çıkan kutlama kartı.
 *
 * Kendiliğinden kapanmıyor: kapatma kararı Duygu'nun. Otomatik kaybolan bir
 * tebrik, okunmadan geçen bir tebriktir. Bir sonraki adımı da taşıyor —
 * kutlama tek başına bırakılınca ivme orada kesiliyor.
 */
export function MotivasyonKarti({ kart, onKapat }: { kart: MotivasyonKart | null; onKapat: () => void }) {
  const reduce = useReducedMotion();
  const kapatRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!kart) return;
    kapatRef.current?.focus();
    const tus = (e: KeyboardEvent) => e.key === 'Escape' && onKapat();
    window.addEventListener('keydown', tus);
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tus);
      document.body.style.overflow = eskiTasma;
    };
  }, [kart, onKapat]);

  return (
    <AnimatePresence>
      {kart && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-5" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={onKapat}
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-(--radius-card) border border-line bg-surface p-7 text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 26 }}
          >
            <button
              ref={kapatRef}
              type="button"
              onClick={onKapat}
              aria-label="Kapat"
              className="tap-target absolute right-3 top-3 text-muted transition-colors hover:text-ink"
            >
              <X size={18} />
            </button>

            {(() => {
              const { simge: Simge, renk, halka } = TON[kart.ton];
              return (
                <motion.span
                  className={`mx-auto mb-5 grid size-14 place-items-center rounded-full ${halka}`}
                  initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 18 }}
                  aria-hidden
                >
                  <Simge size={26} className={renk} strokeWidth={1.7} />
                </motion.span>
              );
            })()}

            <h2 className="font-display text-2xl font-semibold tracking-tight">{kart.baslik}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{kart.metin}</p>

            {kart.altBilgi && (
              <p
                className="mt-5 border-t border-line pt-4 text-xs text-muted"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {kart.altBilgi}
              </p>
            )}

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={onKapat}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm transition-colors hover:border-line-hi"
              >
                Kapat
              </button>
              {kart.eylem && (
                <Link
                  to={kart.eylem.href}
                  onClick={onKapat}
                  className="flex-1 rounded-full bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
                >
                  {kart.eylem.etiket}
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
