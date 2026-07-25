import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Layers, ListChecks, Timer } from 'lucide-react';
import { CountdownMedallion } from '@/components/Countdown';
import { ProgressRing } from '@/components/ProgressRing';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { EXAM_DATE, TOPICS, TOPIC_IDS } from '@/lib/constants';
import { generatePlan } from '@/lib/planner';
import { estimateScore, topicAccuracy } from '@/lib/scoring';
import { dueCards } from '@/lib/srs';
import { todayKey } from '@/lib/streak';

export default function Dashboard() {
  const { state, update } = useAppState();

  const today = todayKey();
  const plan = generatePlan(new Date('2026-07-25T00:00:00+03:00'), EXAM_DATE);
  const todayPlan = plan.find((d) => d.date === today);
  const due = dueCards(state.srs, new Date()).length;
  const estimate = estimateScore(topicAccuracy(state.attempts, questionBank));

  const solvedByTopic = new Map<string, Set<string>>();
  for (const qId of Object.keys(state.attempts)) {
    const q = questionBank.find((x) => x.id === qId);
    if (!q) continue;
    if (!solvedByTopic.has(q.topicId)) solvedByTopic.set(q.topicId, new Set());
    solvedByTopic.get(q.topicId)!.add(qId);
  }

  return (
    <div className="space-y-6">
      {/* Selamlama + madalyon */}
      <section className="rise-in pt-2 text-center">
        <p className="mb-5 text-sm tracking-widest text-muted">TURİST REHBERLİĞİ • MESLEĞE KABUL SINAVI</p>
        <CountdownMedallion />
        <div className="mt-10 flex items-center justify-center gap-6 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Flame size={16} className={state.streak.current > 0 ? 'text-mercan' : ''} aria-hidden />
            {state.streak.current > 0 ? `${state.streak.current} günlük seri` : 'Bugün seriyi başlat'}
          </span>
          <span className="text-muted" aria-hidden>
            •
          </span>
          <span className="text-muted">
            {estimate === null ? (
              'Tahmini puan için soru çöz'
            ) : (
              <>
                Tahmini puan:{' '}
                <strong className={estimate >= 70 ? 'text-turkuaz' : 'text-altin'}>
                  {estimate.toLocaleString('tr-TR')}
                </strong>
              </>
            )}
          </span>
        </div>
      </section>

      {/* Hızlı başlat */}
      <section className="rise-in grid grid-cols-3 gap-3" style={{ animationDelay: '80ms' }}>
        <Link
          to="/pratik?mode=quick"
          className="rounded-(--radius-card) bg-mercan px-4 py-4 text-center text-mercan-ink transition-transform active:scale-95"
        >
          <ListChecks className="mx-auto mb-1.5" size={22} aria-hidden />
          <span className="block text-sm font-semibold">10 Soru Çöz</span>
        </Link>
        <Link
          to="/tekrar"
          className="rounded-(--radius-card) border border-line bg-surface px-4 py-4 text-center transition-transform active:scale-95"
        >
          <Layers className="mx-auto mb-1.5 text-altin" size={22} aria-hidden />
          <span className="block text-sm font-semibold">
            Kart Tekrarı
            {due > 0 && <span className="ml-1 rounded-full bg-altin px-1.5 text-xs text-ground">{due}</span>}
          </span>
        </Link>
        <Link
          to="/denemeler"
          className="rounded-(--radius-card) border border-line bg-surface px-4 py-4 text-center transition-transform active:scale-95"
        >
          <Timer className="mx-auto mb-1.5 text-kobalt" size={22} aria-hidden />
          <span className="block text-sm font-semibold">Denemeye Gir</span>
        </Link>
      </section>

      {/* Bugünün planı */}
      {todayPlan && (
        <section
          className="rise-in rounded-(--radius-card) border border-line bg-surface p-5"
          style={{ animationDelay: '140ms' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Bugünün Planı</h2>
            <Link to="/plan" className="inline-flex items-center gap-1 text-sm text-kobalt">
              Tüm plan <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <p className="mb-3 text-xs tracking-wide text-muted">{todayPlan.label}</p>
          <ul className="space-y-2">
            {todayPlan.goals.map((goal, i) => {
              const goalId = `${todayPlan.id}:${i}`;
              const done = state.planProgress[goalId] === true;
              return (
                <li key={goalId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ground px-4 py-3 transition-colors">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() =>
                        update((s) => ({
                          ...s,
                          planProgress: { ...s.planProgress, [goalId]: !done },
                        }))
                      }
                      className="size-4 accent-(--turkuaz)"
                    />
                    <span className={done ? 'text-muted line-through' : ''}>{goal.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Konu ilerlemesi */}
      <section className="rise-in" style={{ animationDelay: '200ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Konu İlerlemen</h2>
          <Link to="/konular" className="inline-flex items-center gap-1 text-sm text-kobalt">
            Konulara git <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOPIC_IDS.map((id) => {
            const total = questionBank.filter((q) => q.topicId === id).length;
            const solved = solvedByTopic.get(id)?.size ?? 0;
            const value = total === 0 ? 0 : solved / total;
            return (
              <Link
                key={id}
                to={`/konular/${id}`}
                className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-surface p-3 transition-colors hover:bg-raised"
              >
                <div className="relative grid shrink-0 place-items-center">
                  <ProgressRing value={value} label={`${TOPICS[id].short} ilerleme`} />
                  <span className="absolute text-[10px] text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <span className="text-sm leading-tight">{TOPICS[id].short}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
