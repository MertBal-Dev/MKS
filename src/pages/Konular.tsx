import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { useAppState } from '@/hooks/useAppState';
import { questionBank, topics } from '@/content/index';
import { TOPICS, TOPIC_IDS } from '@/lib/constants';

export default function Konular() {
  const { state } = useAppState();

  return (
    <div>
      <PageHeader eyebrow="KÜTÜPHANE" title="Konular" subtitle="12 resmi başlık — anlatım, tuzaklar, kartlar ve mini testler" />
      <div className="space-y-3">
        {TOPIC_IDS.map((id, i) => {
          const meta = TOPICS[id];
          const pack = topics.find((t) => t.id === id);
          const bank = questionBank.filter((q) => q.topicId === id);
          const solved = new Set(bank.filter((q) => state.attempts[q.id]).map((q) => q.id)).size;
          const value = bank.length === 0 ? 0 : solved / bank.length;

          return (
            <Link
              key={id}
              to={`/konular/${id}`}
              className="rise-in flex items-center gap-4 rounded-(--radius-card) border border-line bg-surface p-4 transition-colors hover:bg-raised"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="relative grid shrink-0 place-items-center">
                <ProgressRing value={value} size={52} label={`${meta.short} ilerleme`} />
                <span className="absolute text-[10px] text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(value * 100)}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium">{meta.title}</h2>
                <p className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                  <span>{bank.length > 0 ? `${bank.length} soru` : 'İçerik hazırlanıyor'}</span>
                  {pack && pack.tricks.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-altin">
                      <AlertTriangle size={12} aria-hidden /> {pack.tricks.length} tuzak
                    </span>
                  )}
                  <span className="text-kobalt">Denemede ~{meta.examWeight} soru</span>
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
