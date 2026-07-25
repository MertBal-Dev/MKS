import { useEffect, useState } from 'react';
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
    <div className="relative mx-auto grid size-56 place-items-center" role="timer" aria-label={`Sınava ${days} gün ${hours} saat kaldı`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90">
        {/* çentikli dış halka */}
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="var(--line)"
          strokeWidth="10"
          strokeDasharray="2 9"
        />
        {/* geçen zamanın altın yayı */}
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={urgent ? 'var(--mercan)' : 'var(--altin)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${C * frac} ${C}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        {/* iç ince çerçeve */}
        <circle cx="100" cy="100" r={R - 14} fill="none" stroke="var(--line)" strokeWidth="1" />
      </svg>
      <div className="text-center">
        <div className="font-display text-6xl font-semibold leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {days}
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
