import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown } from 'lucide-react';
import { MarkdownView } from '@/components/MarkdownView';
import { FlipCard } from '@/components/Flashcard';
import { topics, topicQuestions } from '@/content/index';
import { TOPICS, TOPIC_IDS, type TopicId } from '@/lib/constants';

const TABS = ['Anlatım', 'Kısa', 'Tuzaklar', 'Kartlar'] as const;
type Tab = (typeof TABS)[number];

export default function KonuDetay() {
  const { topicId } = useParams();
  const [tab, setTab] = useState<Tab>('Anlatım');
  const [openSection, setOpenSection] = useState(0);

  if (!topicId || !TOPIC_IDS.includes(topicId as TopicId)) return <Navigate to="/konular" replace />;
  const id = topicId as TopicId;
  const meta = TOPICS[id];
  const pack = topics.find((t) => t.id === id);
  const bank = topicQuestions(id);

  return (
    <div>
      <Link to="/konular" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden /> Konular
      </Link>
      <h1 className="font-display mb-1 text-2xl font-semibold lg:text-3xl">{meta.title}</h1>
      <p className="mb-5 text-sm text-muted">
        {bank.length} soru • Denemede ~{meta.examWeight} soru bu konudan gelir
      </p>

      {!pack ? (
        <div className="rounded-(--radius-card) border border-line bg-surface p-8 text-center text-muted">
          Bu konunun anlatımı hazırlanıyor — çok yakında burada olacak.
        </div>
      ) : (
        <>
          {/* Sekmeler */}
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors',
                  tab === t ? 'bg-raised font-medium text-ink' : 'text-muted',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Anlatım' && (
            <div className="space-y-3">
              {pack.fullNotes.map((section, i) => (
                <section key={section.heading} className="rounded-(--radius-card) border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    aria-expanded={openSection === i}
                  >
                    <h2 className="font-display font-semibold">{section.heading}</h2>
                    <ChevronDown
                      size={18}
                      className={['shrink-0 text-muted transition-transform', openSection === i ? 'rotate-180' : ''].join(' ')}
                      aria-hidden
                    />
                  </button>
                  {openSection === i && (
                    <div className="border-t border-line px-5 py-4">
                      <MarkdownView>{section.markdown}</MarkdownView>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {tab === 'Kısa' && (
            <div className="rounded-(--radius-card) border border-altin/30 bg-surface p-5">
              <p className="mb-4 text-xs font-medium tracking-widest text-altin">SINAV SABAHI OKUMASI</p>
              <MarkdownView large>{pack.shortNotes}</MarkdownView>
            </div>
          )}

          {tab === 'Tuzaklar' && (
            <ul className="space-y-3">
              {pack.tricks.map((trick, i) => (
                <li
                  key={i}
                  className="rise-in flex gap-3 rounded-(--radius-card) border border-line bg-surface p-4"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-altin" aria-hidden />
                  <MarkdownView>{trick}</MarkdownView>
                </li>
              ))}
            </ul>
          )}

          {tab === 'Kartlar' && <FlashcardBrowser cards={pack.flashcards} />}
        </>
      )}

      {/* Mini test */}
      {bank.length > 0 && (
        <div className="sticky bottom-24 mt-6 lg:bottom-6">
          <Link
            to={`/pratik?topic=${id}&count=10`}
            className="block rounded-(--radius-card) bg-mercan px-5 py-4 text-center font-semibold text-mercan-ink shadow-lg transition-transform active:scale-[0.98]"
          >
            Mini Test — 10 Soru
          </Link>
        </div>
      )}
    </div>
  );
}

function FlashcardBrowser({ cards }: { cards: { id: string; front: string; back: string }[] }) {
  const [index, setIndex] = useState(0);
  if (cards.length === 0) return <p className="text-muted">Bu konuda kart yok.</p>;
  const card = cards[index];

  return (
    <div>
      <FlipCard key={card.id} front={card.front} back={card.back} />
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((index - 1 + cards.length) % cards.length)}
          className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm"
        >
          Önceki
        </button>
        <span className="text-sm text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {index + 1} / {cards.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((index + 1) % cards.length)}
          className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
