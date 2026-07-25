import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { PASS_SCORE, TOPICS, TOPIC_IDS } from '@/lib/constants';
import { estimateScore, topicAccuracy } from '@/lib/scoring';

export default function Istatistik() {
  const { state } = useAppState();
  const acc = topicAccuracy(state.attempts, questionBank);
  const estimate = estimateScore(acc);

  const totalAttempts = Object.values(state.attempts).reduce((s, a) => s + a.correct + a.wrong, 0);
  const cardReviews = Object.keys(state.srs).length;
  const examScores = state.examResults.map((r) => r.score);

  return (
    <div>
      <PageHeader title="İstatistik" subtitle="Nerede güçlüsün, neresi çalışmak istiyor — hepsi burada" />

      {/* Tahmini puan */}
      <section className="rise-in mb-6 rounded-(--radius-card) border border-line bg-surface p-6 text-center">
        <p className="mb-1 text-xs tracking-widest text-muted">TAHMİNİ SINAV PUANIN</p>
        {estimate === null ? (
          <p className="mt-3 text-sm text-muted">
            Henüz veri yok —{' '}
            <Link to="/soru-bankasi" className="text-kobalt">
              soru çözmeye başla
            </Link>
            , tahmin burada belirsin.
          </p>
        ) : (
          <>
            <p
              className={['font-display text-6xl font-semibold', estimate >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'].join(' ')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {estimate.toLocaleString('tr-TR')}
            </p>
            <p className="mt-2 text-sm text-muted">
              {estimate >= PASS_SCORE
                ? `Baraj ${PASS_SCORE} — şu an üstündesin, temponu koru.`
                : `Baraja ${(PASS_SCORE - estimate).toLocaleString('tr-TR')} puan var. Aşağıdaki kırmızı konulara yüklen.`}
            </p>
          </>
        )}
      </section>

      {/* Sayaçlar */}
      <section className="rise-in mb-6 grid grid-cols-3 gap-3 text-center" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'çözülen soru', value: totalAttempts },
          { label: 'tekrar kartı', value: cardReviews },
          { label: 'en uzun seri', value: state.streak.best },
        ].map((stat) => (
          <div key={stat.label} className="rounded-(--radius-card) border border-line bg-surface px-3 py-4">
            <p className="font-display text-2xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stat.value.toLocaleString('tr-TR')}
            </p>
            <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Konu doğruluğu */}
      <section className="rise-in mb-6" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display mb-3 text-lg font-semibold">Konu Doğruluğun</h2>
        <div className="space-y-2.5">
          {TOPIC_IDS.map((id) => {
            const t = acc[id];
            const pct = t.pct;
            const color = pct === null ? 'var(--line)' : pct >= 70 ? 'var(--turkuaz)' : pct >= 50 ? 'var(--altin)' : 'var(--kizil)';
            return (
              <div key={id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{TOPICS[id].short}</span>
                  <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pct === null ? 'veri yok' : `%${pct.toLocaleString('tr-TR')} • ${t.correct}/${t.total}`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct ?? 0}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Deneme puanları */}
      <section className="rise-in" style={{ animationDelay: '180ms' }}>
        <h2 className="font-display mb-3 text-lg font-semibold">Deneme Puanların</h2>
        {examScores.length === 0 ? (
          <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
            Henüz deneme çözmedin.{' '}
            <Link to="/denemeler" className="text-kobalt">
              İlk denemene gir
            </Link>{' '}
            — grafik burada büyüsün.
          </p>
        ) : (
          <ScoreChart scores={examScores} />
        )}
      </section>
    </div>
  );
}

/** Bağımlılıksız SVG çizgi grafiği: deneme puanları + 70 baraj çizgisi. */
function ScoreChart({ scores }: { scores: number[] }) {
  const W = 320;
  const H = 140;
  const PAD = 14;
  const n = scores.length;
  const x = (i: number) => (n === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1));
  const y = (score: number) => H - PAD - (score / 100) * (H - PAD * 2);
  const path = scores.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s)}`).join(' ');

  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Deneme puanları: ${scores.join(', ')}`}>
        {/* baraj çizgisi */}
        <line x1={PAD} x2={W - PAD} y1={y(PASS_SCORE)} y2={y(PASS_SCORE)} stroke="var(--altin)" strokeWidth="1" strokeDasharray="4 4" />
        <text x={W - PAD} y={y(PASS_SCORE) - 4} textAnchor="end" fontSize="9" fill="var(--altin)">
          baraj {PASS_SCORE}
        </text>
        {n > 1 && <path d={path} fill="none" stroke="var(--kobalt)" strokeWidth="2" strokeLinejoin="round" />}
        {scores.map((s, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(s)} r="4" fill={s >= PASS_SCORE ? 'var(--turkuaz)' : 'var(--kizil)'} />
            <text x={x(i)} y={y(s) - 8} textAnchor="middle" fontSize="10" fill="var(--ink)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(s)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
