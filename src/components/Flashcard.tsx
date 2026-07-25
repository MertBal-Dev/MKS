import { useState } from 'react';

/** Çevrilebilir bilgi kartı. Tıkla/odakla + Enter ile çevrilir. */
export function FlipCard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped(!flipped)}
      className="w-full text-left"
      style={{ perspective: '1200px' }}
      aria-label={flipped ? 'Kartı ön yüze çevir' : 'Kartı arka yüze çevir'}
    >
      <div
        className="relative min-h-56 w-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        <div
          className="absolute inset-0 grid place-items-center rounded-(--radius-card) border border-line bg-surface p-6"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <p className="mb-2 text-[10px] tracking-widest text-muted">SORU</p>
            <p className="font-display text-lg leading-snug">{front}</p>
            <p className="mt-4 text-xs text-muted">çevirmek için dokun</p>
          </div>
        </div>
        <div
          className="absolute inset-0 grid place-items-center rounded-(--radius-card) border border-turkuaz/40 bg-surface p-6"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-center">
            <p className="mb-2 text-[10px] tracking-widest text-turkuaz">CEVAP</p>
            <p className="leading-relaxed">{back}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
