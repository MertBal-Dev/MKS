import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { exportState } from '@/lib/storage';
import { todayKey } from '@/lib/streak';

const REMIND_AFTER_DAYS = 7;
const MIN_SOLVED = 25;

function daysBetween(a: string, b: string): number {
  if (!a) return Infinity;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/**
 * İlerleme tarayıcıda tutulduğu için, belli aralıklarla yedek almayı hatırlatır.
 * Yalnızca kayda değer ilerleme varsa ve son yedekten bu yana bir haftadan
 * fazla geçtiyse görünür.
 */
export function BackupReminder() {
  const { state, update } = useAppState();
  const [dismissed, setDismissed] = useState(false);

  const today = todayKey();
  const solved = Object.keys(state.attempts).length;
  const show = !dismissed && solved >= MIN_SOLVED && daysBetween(state.lastBackup, today) >= REMIND_AFTER_DAYS;

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mks-yedek-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    update((s) => ({ ...s, lastBackup: today }));
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-(--radius-card) border border-altin/40 bg-surface p-4 shadow-[var(--shadow-float)] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-altin/15 text-altin" aria-hidden>
              <Download size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">İlerlemeni yedekleyelim mi?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {solved} soruluk emeğin bu tarayıcıda duruyor. Tek dosyalık yedek, olası bir veri kaybına karşı sigortan.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="rounded-full bg-altin px-4 py-1.5 text-xs font-semibold text-ground"
                >
                  Yedeği indir
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-full border border-line px-4 py-1.5 text-xs text-muted"
                >
                  Sonra
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setDismissed(true)} aria-label="Kapat" className="text-muted">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
