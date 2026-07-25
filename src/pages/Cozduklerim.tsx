import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { QuestionCard } from '@/components/QuestionCard';
import { useAppState } from '@/hooks/useAppState';
import { findQuestion } from '@/content/index';
import { TOPICS, TOPIC_IDS, type TopicId } from '@/lib/constants';

type Filter = 'all' | 'correct' | 'wrong' | 'flagged';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'correct', label: 'Doğru bildiklerim' },
  { value: 'wrong', label: 'Yanlış yaptıklarım' },
  { value: 'flagged', label: 'İşaretlediklerim' },
];

export default function Cozduklerim() {
  const { state } = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    return Object.entries(state.attempts)
      .map(([qId, a]) => ({ qId, attempt: a, question: findQuestion(qId) }))
      .filter((r): r is { qId: string; attempt: typeof r.attempt; question: NonNullable<typeof r.question> } => Boolean(r.question))
      .sort((a, b) => b.attempt.lastAt.localeCompare(a.attempt.lastAt));
  }, [state.attempts]);

  const visible = rows.filter((r) => {
    if (topic !== 'all' && r.question.topicId !== topic) return false;
    if (filter === 'correct') return r.attempt.lastResult === 'correct';
    if (filter === 'wrong') return r.attempt.lastResult === 'wrong';
    if (filter === 'flagged') return state.flagged.includes(r.qId);
    return true;
  });

  const correctCount = rows.filter((r) => r.attempt.lastResult === 'correct').length;
  const pct = rows.length === 0 ? 0 : Math.round((correctCount / rows.length) * 100);

  return (
    <div>
      <PageHeader
        title="Çözdüklerim"
        subtitle={
          rows.length === 0
            ? 'Çözdüğün her soru buraya düşecek — geri dönüp istediğin zaman bakabilirsin.'
            : `${rows.length} soruyla tanıştın • son denemende %${pct} doğruluk`
        }
      />

      {rows.length === 0 ? (
        <div className="rise-in rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <p className="font-display mb-2 text-xl">Burası senin defterin olacak 📖</p>
          <p className="text-sm text-muted">
            Çözdüğün sorular, verdiğin cevaplar ve açıklamalar burada birikecek. İlk soruyla başlayalım.
          </p>
          <Link
            to="/pratik?mode=quick"
            className="mt-5 inline-block rounded-full bg-mercan px-6 py-2.5 text-sm font-semibold text-mercan-ink"
          >
            10 Soru Çöz
          </Link>
        </div>
      ) : (
        <>
          {/* Özet şeridi */}
          <section className="rise-in mb-5 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'çözülen soru', value: rows.length, color: '' },
              { label: 'doğru', value: correctCount, color: 'text-turkuaz' },
              { label: 'yanlış', value: rows.length - correctCount, color: 'text-kizil' },
            ].map((s) => (
              <div key={s.label} className="rounded-(--radius-card) border border-line bg-surface px-3 py-4">
                <p className={['font-display text-2xl font-semibold', s.color].join(' ')} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {s.value.toLocaleString('tr-TR')}
                </p>
                <p className="mt-0.5 text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Filtreler */}
          <div className="rise-in mb-3 flex flex-wrap gap-2" style={{ animationDelay: '60ms' }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={[
                  'rounded-full border px-3.5 py-2 text-sm transition-colors',
                  filter === f.value
                    ? 'border-mercan bg-mercan/15 font-medium text-mercan'
                    : 'border-line bg-surface text-muted hover:text-ink',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="rise-in mb-5 flex flex-wrap gap-2" style={{ animationDelay: '90ms' }}>
            <button
              type="button"
              onClick={() => setTopic('all')}
              aria-pressed={topic === 'all'}
              className={[
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                topic === 'all' ? 'border-kobalt bg-kobalt/15 text-kobalt' : 'border-line bg-surface text-muted',
              ].join(' ')}
            >
              Tüm konular
            </button>
            {TOPIC_IDS.filter((id) => rows.some((r) => r.question.topicId === id)).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTopic(id)}
                aria-pressed={topic === id}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  topic === id ? 'border-kobalt bg-kobalt/15 text-kobalt' : 'border-line bg-surface text-muted',
                ].join(' ')}
              >
                {TOPICS[id].short}
              </button>
            ))}
          </div>

          {/* Liste */}
          {visible.length === 0 ? (
            <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
              Bu filtreyle soru yok. Başka bir filtre dene.
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map(({ qId, attempt, question }, i) => {
                const wasCorrect = attempt.lastResult === 'correct';
                const isFlagged = state.flagged.includes(qId);
                return (
                  <div
                    key={qId}
                    className="rise-in rounded-(--radius-card) border border-line bg-surface"
                    style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(open === qId ? null : qId)}
                      className="w-full px-5 py-4 text-left"
                      aria-expanded={open === qId}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={[
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                            wasCorrect ? 'bg-turkuaz/15 text-turkuaz' : 'bg-kizil/15 text-kizil',
                          ].join(' ')}
                        >
                          {wasCorrect ? <Check size={11} /> : <X size={11} />}
                          {wasCorrect ? 'Doğru' : 'Yanlış'}
                        </span>
                        <span className="rounded-full bg-raised px-2 py-0.5 text-muted">{TOPICS[question.topicId].short}</span>
                        {isFlagged && <Bookmark size={12} className="text-altin" fill="currentColor" aria-label="İşaretli" />}
                        <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {attempt.correct + attempt.wrong} kez çözüldü
                        </span>
                      </div>
                      <span className="block leading-snug">{question.stem}</span>
                    </button>
                    {open === qId && (
                      <div className="border-t border-line px-5 py-4">
                        <QuestionCard question={question} revealed onSelect={() => {}} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
