import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { QuestionCard } from '@/components/QuestionCard';
import { useAppState } from '@/hooks/useAppState';
import { findQuestion } from '@/content/index';
import { TOPICS } from '@/lib/constants';

export default function YanlisHavuzu() {
  const { state } = useAppState();
  const [open, setOpen] = useState<string | null>(null);

  const entries = Object.entries(state.wrongPool)
    .map(([qId, entry]) => ({ qId, entry, question: findQuestion(qId) }))
    .filter((e) => e.question)
    .sort((a, b) => a.entry.addedAt.localeCompare(b.entry.addedAt));

  return (
    <div>
      <PageHeader
        title="Yanlış Havuzu"
        subtitle="Üst üste 2 kez doğru çözdüğün soru havuzdan çıkar"
        action={
          entries.length > 0 ? (
            <Link
              to="/pratik?status=wrong&count=40"
              className="rounded-full bg-mercan px-4 py-2 text-sm font-semibold text-mercan-ink"
            >
              Tekrar Çöz
            </Link>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <div className="rise-in rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <p className="font-display mb-2 text-xl">Havuz bomboş 🎉</p>
          <p className="text-sm text-muted">Yanlış yaptığın sorular buraya düşer; çözüp temizledikçe boşalır.</p>
          <Link to="/soru-bankasi" className="mt-4 inline-block text-sm text-kobalt">
            Soru çözmeye git
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(({ qId, entry, question }, i) => (
            <div
              key={qId}
              className="rise-in rounded-(--radius-card) border border-line bg-surface"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === qId ? null : qId)}
                className="w-full px-5 py-4 text-left"
                aria-expanded={open === qId}
              >
                <div className="mb-1.5 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-raised px-2 py-0.5 text-muted">
                    {TOPICS[question!.topicId].short}
                  </span>
                  <span
                    className={entry.consecutiveCorrect > 0 ? 'text-turkuaz' : 'text-muted'}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    çıkışa {entry.consecutiveCorrect}/2
                  </span>
                </div>
                <span className="block leading-snug">{question!.stem}</span>
              </button>
              {open === qId && (
                <div className="border-t border-line px-5 py-4">
                  <QuestionCard question={question!} revealed onSelect={() => {}} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
