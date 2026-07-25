import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/* ── Karşılama perdesi ────────────────────────────────────────────────────
   İmza öğesi: çizilerek beliren bir İznik rozeti. Uygulamanın geri kalanı
   aynı motifi geri sayım madalyonunda kullanıyor; perde de oradan doğuyor.
   Toplam süre ~3,4 sn; her an atlanabilir.                                */

const NAME = ['Duygu', 'Çırakoğlu'];
const HOLD_MS = 3400;
const EXIT_MS = 800;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Merkezden dışarı açılan tek yaprak — sekiz kez döndürülerek rozeti kurar. */
const PETAL = 'M50 50 C41 36 41 23 50 11 C59 23 59 36 50 50';

function Rozet({ still }: { still: boolean }) {
  const draw = (delay: number, duration: number) =>
    still
      ? { initial: { opacity: 1, pathLength: 1 }, animate: { opacity: 1, pathLength: 1 } }
      : {
          initial: { opacity: 0, pathLength: 0 },
          animate: {
            opacity: 1,
            pathLength: 1,
            transition: {
              pathLength: { duration, ease: EASE_OUT, delay },
              opacity: { duration: 0.2, delay },
            },
          },
        };

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-[4.5rem] h-[4.5rem] md:w-[5.5rem] md:h-[5.5rem] overflow-visible"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Sekiz yaprak — sırayla açılır */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.path
          key={i}
          d={PETAL}
          transform={`rotate(${i * 45} 50 50)`}
          stroke="var(--mercan)"
          strokeWidth={1.1}
          {...draw(0.18 + i * 0.055, 0.5)}
        />
      ))}

      {/* Dış çember */}
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        stroke="var(--altin)"
        strokeWidth={0.8}
        opacity={0.55}
        {...draw(0.3, 1.1)}
      />

      {/* Göbek */}
      <motion.circle
        cx="50"
        cy="50"
        r="6.5"
        stroke="var(--altin)"
        strokeWidth={1.2}
        {...draw(0.75, 0.45)}
      />
    </svg>
  );
}

/** Maskeli kelime açılışı — harfler alttan süzülerek yerine oturur. */
function MaskedWord({ word, delay, still }: { word: string; delay: number; still: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.16em] -mb-[0.16em] align-bottom">
      <motion.span
        className="inline-block"
        initial={still ? { y: 0 } : { y: '115%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.85, ease: EASE_OUT, delay }}
      >
        {word}
      </motion.span>
    </span>
  );
}

export function DuyguIntro({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const reduce = useReducedMotion() ?? false;
  const done = useRef(false);

  const holdMs = reduce ? 1200 : HOLD_MS;
  const exitMs = reduce ? 300 : EXIT_MS;

  const dismiss = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setVisible(false);
    setTimeout(onComplete, exitMs);
  }, [onComplete, exitMs]);

  // Süre dolunca kendiliğinden kapanır; her tuş/tıklama erken kapatır.
  useEffect(() => {
    const timer = setTimeout(dismiss, holdMs);
    const onKey = () => dismiss();
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [dismiss, holdMs]);

  const step = useMemo(
    () => (reduce ? { eyebrow: 0, name: 0, rule: 0, sub: 0, hint: 0 } : { eyebrow: 0.75, name: 1.0, rule: 1.5, sub: 1.65, hint: 1.9 }),
    [reduce],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Hoş geldin"
          onClick={dismiss}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            filter: reduce ? 'none' : 'blur(8px)',
            transition: { duration: exitMs / 1000, ease: EASE_OUT },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[var(--ground-deep)] px-6 text-center cursor-pointer"
        >
          {/* Tek, çok yumuşak sıcak ışık — madalyonun arkasından gelir */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 45% at 50% 42%, color-mix(in oklab, var(--mercan) 16%, transparent), transparent 70%)',
            }}
          />

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
              className="mb-9"
            >
              <Rozet still={reduce} />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: step.eyebrow }}
              className="mb-5 font-body text-[0.6875rem] font-medium uppercase tracking-[0.42em] text-[var(--muted)]"
            >
              Hoş geldin
            </motion.p>

            <h1 className="flex flex-wrap justify-center gap-x-[0.3em] font-display text-[2.5rem] font-medium leading-[1.05] text-[var(--ink)] md:text-[4rem] lg:text-[4.75rem]">
              {NAME.map((word, i) => (
                <MaskedWord key={word} word={word} delay={step.name + i * 0.09} still={reduce} />
              ))}
            </h1>

            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: step.rule }}
              className="my-7 h-px w-40 origin-center md:w-56"
              style={{
                background:
                  'linear-gradient(to right, transparent, var(--altin) 35%, var(--altin) 65%, transparent)',
              }}
            />

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: step.sub }}
              className="max-w-sm font-body text-[0.9375rem] leading-relaxed text-[var(--muted)] md:text-base"
            >
              Senin için hazırlanmış bir çalışma odası.
              <br className="hidden sm:block" />{' '}
              <span className="text-[var(--ink)]">29 Ağustos</span>'a birlikte hazırlanıyoruz.
            </motion.p>
          </div>

          {/* Perdenin ne kadar süreceğini gösterir; beklemeyi öngörülebilir kılar */}
          {!reduce && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: holdMs / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-px w-full origin-left bg-[var(--line-hi)]"
            />
          )}

          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: step.hint }}
            className="absolute bottom-8 font-body text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--muted)] opacity-60"
          >
            Geçmek için dokun
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
