import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { FlipCard } from '@/components/Flashcard';
import { useAppState } from '@/hooks/useAppState';
import { findQuestion, topics } from '@/content/index';
import { wrongToCard } from '@/lib/autoCards';
import { dueCards, newCard, reviewCard, BOX_INTERVALS_DAYS, type SrsCard } from '@/lib/srs';
import { bumpStreak, todayKey } from '@/lib/streak';
import type { Flashcard } from '@/lib/types';

const NEW_CARDS_PER_SESSION = 10;

/** Tüm kart içeriklerinin (konu kartları + yanlış-soru kartları) arama tablosu. */
function useCardLookup(): Map<string, Flashcard> {
  return useMemo(() => {
    const map = new Map<string, Flashcard>();
    for (const t of topics) for (const c of t.flashcards) map.set(c.id, c);
    return map;
  }, []);
}

function resolveCard(id: string, lookup: Map<string, Flashcard>): Flashcard | null {
  const direct = lookup.get(id);
  if (direct) return direct;
  if (id.startsWith('q-')) {
    const q = findQuestion(id.slice(2));
    if (q) return wrongToCard(q);
  }
  return null;
}

export default function Tekrar() {
  const { state, update } = useAppState();
  const lookup = useCardLookup();

  // Oturum listesi girişte bir kez kurulur
  const sessionIds = useRef<string[] | null>(null);
  if (sessionIds.current === null) {
    const now = new Date();
    const due = dueCards(state.srs, now).filter((id) => resolveCard(id, lookup));
    const fresh = [...lookup.keys()].filter((id) => !state.srs[id]).slice(0, NEW_CARDS_PER_SESSION);
    sessionIds.current = [...due, ...fresh];
  }

  const [pos, setPos] = useState(0);
  const [known, setKnown] = useState(0);
  const ids = sessionIds.current;

  if (ids.length === 0) {
    const nextDue = Object.values(state.srs)
      .map((c: SrsCard) => new Date(c.dueAt).getTime())
      .filter((t) => t > Date.now());
    const tomorrow = nextDue.length > 0 ? Math.min(...nextDue) : null;
    return (
      <div>
        <PageHeader eyebrow="HAFIZA" title="Akıllı Tekrar" />
        <div className="rise-in rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <CheckCircle2 size={30} className="mx-auto mb-3 text-turkuaz" aria-hidden />
          <p className="font-display mb-2 text-xl">Bugünlük tamam</p>
          <p className="text-sm text-muted">
            {tomorrow
              ? `Sıradaki kartlar ${new Date(tomorrow).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} günü seni bekliyor.`
              : 'Konu kartları eklendikçe burada görünecek. Yanlış yaptığın her soru da otomatik kart olur.'}
          </p>
          <Link to="/soru-bankasi" className="mt-4 inline-block text-sm text-kobalt">
            Şimdi soru çözmeye geç
          </Link>
        </div>
      </div>
    );
  }

  if (pos >= ids.length) {
    return (
      <div>
        <PageHeader title="Akıllı Tekrar" />
        <div className="rise-in rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <p className="mb-1 text-xs tracking-widest text-muted">OTURUM BİTTİ</p>
          <p className="font-display my-3 text-4xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {known} <span className="text-xl text-muted">/ {ids.length} bildin</span>
          </p>
          <p className="text-sm text-muted">
            Bilemediklerin yarın tekrar karşına çıkacak — sistem böyle çalışır. Beynin şu an bu bağlantıları
            güçlendiriyor; yarın aynı kartlar daha kolay gelecek.
          </p>
          <Link to="/" className="mt-5 inline-block rounded-full bg-mercan px-6 py-2.5 text-sm font-semibold text-mercan-ink">
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }

  const cardId = ids[pos];
  const card = resolveCard(cardId, lookup)!;
  const srsEntry = state.srs[cardId];

  const answer = (result: 'correct' | 'wrong') => {
    const now = new Date();
    update((s) => {
      const current = s.srs[cardId] ?? newCard(now);
      return {
        ...s,
        srs: { ...s.srs, [cardId]: reviewCard(current, result, now) },
        streak: bumpStreak(s.streak, todayKey(now)),
      };
    });
    if (result === 'correct') setKnown((k) => k + 1);
    setPos((p) => p + 1);
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Akıllı Tekrar"
        subtitle={`Kart ${pos + 1} / ${ids.length}${srsEntry ? ` • Kutu ${srsEntry.box} (${BOX_INTERVALS_DAYS[srsEntry.box]} gün aralık)` : ' • Yeni kart'}`}
      />

      <FlipCard key={cardId} front={card.front} back={card.back} />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => answer('wrong')}
          className="rounded-(--radius-card) border border-kizil/50 bg-kizil/10 px-5 py-4 font-semibold text-kizil transition-transform active:scale-[0.98]"
        >
          Bilemedim
        </button>
        <button
          type="button"
          onClick={() => answer('correct')}
          className="rounded-(--radius-card) border border-turkuaz/50 bg-turkuaz/10 px-5 py-4 font-semibold text-turkuaz transition-transform active:scale-[0.98]"
        >
          Bildim
        </button>
      </div>
    </div>
  );
}
