import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { TOPICS, TOPIC_IDS, type TopicId } from '@/lib/constants';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'unseen', label: 'Hiç çözmediklerim' },
  { value: 'wrong', label: 'Yanlış yaptıklarım' },
  { value: 'flagged', label: 'İşaretlediklerim' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Kolay' },
  { value: 2, label: 'Orta' },
  { value: 3, label: 'Zor' },
] as const;

const COUNT_OPTIONS = [10, 20, 40] as const;

export default function SoruBankasi() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const [difficulty, setDifficulty] = useState<(1 | 2 | 3)[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]['value']>('all');
  const [count, setCount] = useState<number>(20);

  const start = () => {
    const p = new URLSearchParams();
    if (topic !== 'all') p.set('topic', topic);
    if (difficulty.length > 0) p.set('difficulty', difficulty.join(','));
    if (status !== 'all') p.set('status', status);
    p.set('count', String(count));
    navigate(`/pratik?${p.toString()}`);
  };

  const solvedCount = Object.keys(state.attempts).length;

  return (
    <div>
      <PageHeader eyebrow="ÇALIŞMA" title="Soru Bankası"
        subtitle={`${questionBank.length.toLocaleString('tr-TR')} açıklamalı soru • ${solvedCount.toLocaleString('tr-TR')} soruyla tanıştın`}
      />

      <div className="space-y-5">
        {/* Konu */}
        <section className="rise-in">
          <h2 className="mb-2 text-sm font-medium text-muted">Konu</h2>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={topic === 'all'} onClick={() => setTopic('all')}>
              Tüm konular
            </FilterChip>
            {TOPIC_IDS.map((id) => (
              <FilterChip key={id} active={topic === id} onClick={() => setTopic(id)}>
                {TOPICS[id].short}
              </FilterChip>
            ))}
          </div>
        </section>

        {/* Zorluk */}
        <section className="rise-in" style={{ animationDelay: '60ms' }}>
          <h2 className="mb-2 text-sm font-medium text-muted">Zorluk (boş = hepsi)</h2>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <FilterChip
                key={d.value}
                active={difficulty.includes(d.value)}
                onClick={() =>
                  setDifficulty((cur) =>
                    cur.includes(d.value) ? cur.filter((x) => x !== d.value) : [...cur, d.value],
                  )
                }
              >
                {d.label}
              </FilterChip>
            ))}
          </div>
        </section>

        {/* Durum */}
        <section className="rise-in" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-2 text-sm font-medium text-muted">Durum</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
                {s.label}
              </FilterChip>
            ))}
          </div>
        </section>

        {/* Adet */}
        <section className="rise-in" style={{ animationDelay: '180ms' }}>
          <h2 className="mb-2 text-sm font-medium text-muted">Soru sayısı</h2>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map((c) => (
              <FilterChip key={c} active={count === c} onClick={() => setCount(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={start}
          className="rise-in w-full rounded-(--radius-card) bg-mercan px-5 py-4 font-semibold text-mercan-ink transition-transform active:scale-[0.98]"
          style={{ animationDelay: '240ms' }}
        >
          Çözmeye Başla
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full border px-3.5 py-2 text-sm transition-colors',
        active ? 'border-mercan bg-mercan/15 font-medium text-mercan' : 'border-line bg-surface text-muted hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
