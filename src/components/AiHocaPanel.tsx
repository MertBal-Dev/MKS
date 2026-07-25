import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, GraduationCap, Loader2, X } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { useAiHoca } from '@/hooks/useAiHoca';

const QUICK_PROMPTS_WITH_QUESTION = [
  'Bunu daha basit anlatır mısın?',
  'Bu konudan başka ne sorabilirler?',
  'Bunu nasıl ezberlerim?',
  'Şıkları tek tek karşılaştır',
];

const QUICK_PROMPTS_FREE = [
  'Bugün hangi konuya çalışayım?',
  'Osmanlı padişahlarını sırayla yaz',
  'Sık karıştırılan 10 kavram söyle',
  'UNESCO listemizi tarih sırasıyla ver',
];

/** Sağdan açılan AI Hoca paneli — her sorudan ve serbest sohbetten çağrılır. */
export function AiHocaPanel() {
  const { open, title, question, turns, loading, error, send, close } = useAiHoca();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const submit = () => {
    if (!draft.trim() || loading) return;
    send(draft);
    setDraft('');
  };

  const quick = question ? QUICK_PROMPTS_WITH_QUESTION : QUICK_PROMPTS_FREE;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="AI Hoca">
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={close}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.aside
            className="absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col rounded-t-3xl border-t border-line bg-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[min(560px,92vw)] sm:rounded-l-3xl sm:rounded-tr-none sm:border-l sm:border-t-0"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* Başlık */}
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-kobalt/15 text-kobalt" aria-hidden>
                <GraduationCap size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold leading-tight">AI Hoca</p>
                <p className="truncate text-xs text-muted">{question ? title : 'Aklına takılan her şeyi sor'}</p>
              </div>
              <button type="button" onClick={close} aria-label="Kapat" className="text-muted transition-colors hover:text-ink">
                <X size={20} />
              </button>
            </header>

            {/* Soru bağlamı */}
            {question && (
              <div className="border-b border-line bg-ground/50 px-5 py-3">
                <p className="line-clamp-3 text-xs leading-relaxed text-muted">{question.stem}</p>
              </div>
            )}

            {/* Sohbet */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {turns.length === 0 && !loading && (
                <div className="py-8 text-center">
                  <p className="font-display mb-1 text-lg">Buyur, dinliyorum 👋</p>
                  <p className="text-sm text-muted">
                    İstediğin konuyu sorabilir, anlamadığın yeri açtırabilirsin.
                  </p>
                </div>
              )}

              {turns.map((t, i) =>
                t.role === 'user' ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-mercan px-4 py-2.5 text-sm text-mercan-ink"
                  >
                    {t.text}
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="max-w-full rounded-2xl rounded-bl-sm border border-line bg-ground px-4 py-3"
                  >
                    <MarkdownView>{t.text}</MarkdownView>
                  </motion.div>
                ),
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-kobalt"
                >
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                  AI Hoca düşünüyor…
                </motion.div>
              )}

              {error && <p className="rounded-xl bg-kizil/10 px-4 py-3 text-sm text-kizil">{error}</p>}
            </div>

            {/* Hızlı aksiyonlar + giriş */}
            <footer className="border-t border-line px-5 py-3">
              <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
                {quick.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    onClick={() => send(q)}
                    className="shrink-0 rounded-full border border-line bg-ground px-3 py-1.5 text-xs text-muted transition-colors hover:border-kobalt/50 hover:text-kobalt disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="Sorunu yaz… (Enter ile gönder)"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-ground px-3.5 py-3 text-sm outline-none transition-colors focus:border-kobalt/60"
                />
                <motion.button
                  type="button"
                  onClick={submit}
                  disabled={loading || !draft.trim()}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Gönder"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-kobalt text-ground transition-opacity disabled:opacity-40"
                >
                  <ArrowUp size={18} />
                </motion.button>
              </div>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Soru kartlarının altına konan "AI Hoca'ya sor" düğmesi. */
export function AiHocaButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-kobalt/40 bg-kobalt/10 px-4 py-3 text-sm font-medium text-kobalt transition-colors hover:bg-kobalt/15"
    >
      <GraduationCap size={17} aria-hidden />
      AI Hoca'ya sor — çözüm, türev sorular, takip soruları
    </motion.button>
  );
}
