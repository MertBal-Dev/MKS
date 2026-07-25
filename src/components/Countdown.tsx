import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { EXAM_DATE, EXAM_NAME } from '@/lib/constants';

/** Plan başlangıcı — madalyonun altın yayı bu tarihten sınava dolan zamanı gösterir. */
const PLAN_START = new Date('2026-07-25T00:00:00+03:00');

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Hedefe doğru yaylanarak sayan sayı. */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (v) =>
    v.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  );
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return <motion.span style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</motion.span>;
}

/**
 * İmza öğesi: çini tabak formunda geri sayım madalyonu.
 * Dış halka 48 "çentik"ten oluşur (çini tabak dilimlemesi); altın yay,
 * plan başlangıcından bu yana geçen zamanı doldurur.
 */
export function CountdownMedallion() {
  const now = useNow(30_000);
  const msLeft = Math.max(EXAM_DATE.getTime() - now.getTime(), 0);
  const days = Math.floor(msLeft / 86_400_000);
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);

  const total = EXAM_DATE.getTime() - PLAN_START.getTime();
  const elapsed = Math.min(Math.max(now.getTime() - PLAN_START.getTime(), 0), total);
  const frac = total > 0 ? elapsed / total : 1;

  const R = 84;
  const C = 2 * Math.PI * R;
  const urgent = days < 7;

  const dateLabel = EXAM_DATE.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });

  return (
    <div
      className="relative mx-auto grid size-56 place-items-center"
      role="timer"
      aria-label={`Sınava ${days} gün ${hours} saat kaldı`}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="10" strokeDasharray="2 9" />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={urgent ? 'var(--mercan)' : 'var(--altin)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle cx="100" cy="100" r={R - 14} fill="none" stroke="var(--line)" strokeWidth="1" />
      </svg>
      <div className="text-center">
        <div className="font-display text-6xl font-semibold leading-none">
          <AnimatedNumber value={days} />
        </div>
        <div className="mt-1 text-sm text-muted">gün kaldı</div>
        <div className="mt-1 text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {hours} sa {minutes} dk
        </div>
      </div>
      <div className="absolute -bottom-7 w-max text-center text-xs tracking-wide text-muted">
        {EXAM_NAME} • {dateLabel} 10.00
      </div>
    </div>
  );
}

/** Kompakt satır içi geri sayım (iç sayfa başlıkları için). */
export function CountdownInline() {
  const now = useNow(60_000);
  const days = Math.max(Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86_400_000), 0);
  return (
    <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
      Sınava {days} gün
    </span>
  );
}

/** Sakin tarih rozeti — gün sayısını bağırmadan söyler. */
export function CountdownPill() {
  const now = useNow(60_000);
  const days = Math.max(Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86_400_000), 0);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-ground/60 px-3.5 py-1.5 text-xs text-muted backdrop-blur"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="size-1.5 rounded-full bg-altin" aria-hidden />
      {EXAM_NAME} • 29 Ağustos'a {days} gün
    </span>
  );
}

/**
 * Günlük başarı halkası: bugünün plan hedeflerinin dolumu.
 * Geri sayımın yerini alan pozitif çerçeve — halka her sabah sıfırlanır,
 * üç küçük adımla dolar; "yetişemiyorum" yerine "bugünü tamamladım" duygusu verir.
 */
export function DailyRing({ done, total }: { done: number; total: number }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? done / total : 0;
  const complete = total > 0 && done >= total;

  return (
    <div
      className="relative mx-auto grid size-40 place-items-center"
      aria-label={`Bugün ${done} / ${total} hedef tamamlandı`}
    >
      {complete && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--turkuaz) 22%, transparent), transparent 68%)' }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        />
      )}
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" strokeWidth="9" strokeDasharray="2 7" />
        <motion.circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={complete ? 'var(--turkuaz)' : 'var(--altin)'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        />
      </svg>
      <div className="relative text-center">
        {complete ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="flex flex-col items-center"
          >
            <Check size={34} strokeWidth={2.4} className="text-turkuaz" aria-hidden />
            <div className="mt-1.5 text-xs font-medium text-turkuaz">Bugün tamam</div>
          </motion.div>
        ) : (
          <>
            <div className="font-display text-4xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <AnimatedNumber value={done} />
              <span className="text-xl text-muted">/{total}</span>
            </div>
            <div className="mt-1 text-xs text-muted">bugünün hedefi</div>
          </>
        )}
      </div>
    </div>
  );
}
