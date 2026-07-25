import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { EXAM_DATE, TOPICS } from '@/lib/constants';
import { generatePlan, type PlanDay } from '@/lib/planner';
import { todayKey } from '@/lib/streak';

export default function Plan() {
  const { state, update } = useAppState();
  const today = todayKey();

  const weeks = useMemo(() => {
    const plan = generatePlan(new Date('2026-07-25T00:00:00+03:00'), EXAM_DATE);
    const map = new Map<string, PlanDay[]>();
    for (const day of plan) {
      const w = day.label.split(' • ')[0];
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(day);
    }
    return [...map.entries()];
  }, []);

  const dayPct = (day: PlanDay) => {
    const done = day.goals.filter((_, i) => state.planProgress[`${day.id}:${i}`]).length;
    return day.goals.length === 0 ? 0 : done / day.goals.length;
  };

  return (
    <div>
      <PageHeader
        title="Sprint Planı"
        subtitle="Plan senin için düşünür — sen yalnızca bugüne odaklan. Günler birikir, baraj geçilir. 💛"
      />

      <div className="space-y-6">
        {weeks.map(([week, days]) => (
          <section key={week} className="rise-in">
            <h2 className="font-display mb-3 text-lg font-semibold">{week}</h2>
            <div className="space-y-2.5">
              {days.map((day) => {
                const isToday = day.date === today;
                const isPast = day.date < today;
                const pct = dayPct(day);
                const dateLabel = new Date(`${day.date}T12:00:00+03:00`).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'Europe/Istanbul',
                });

                return (
                  <details
                    key={day.id}
                    open={isToday}
                    className={[
                      'rounded-(--radius-card) border bg-surface',
                      isToday ? 'border-mercan' : 'border-line',
                      isPast && pct < 1 ? 'opacity-70' : '',
                    ].join(' ')}
                  >
                    <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
                      <span
                        className={[
                          'grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold',
                          pct === 1 ? 'bg-turkuaz text-ground' : isToday ? 'bg-mercan text-mercan-ink' : 'bg-raised text-muted',
                        ].join(' ')}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {dateLabel.split(' ')[0]}
                        <span className="sr-only">{dateLabel}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {day.label.split(' • ')[1]}
                          {isToday && <span className="ml-2 rounded-full bg-mercan/15 px-2 py-0.5 text-[10px] font-semibold text-mercan">BUGÜN</span>}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {day.focusTopics.length > 0
                            ? day.focusTopics.map((t) => TOPICS[t].short).join(', ')
                            : day.goals.some((g) => g.kind === 'exam')
                              ? 'Deneme günü'
                              : 'Genel tekrar'}
                        </p>
                      </div>
                      <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </summary>
                    <ul className="space-y-2 border-t border-line px-4 py-3">
                      {day.goals.map((goal, i) => {
                        const goalId = `${day.id}:${i}`;
                        const done = state.planProgress[goalId] === true;
                        return (
                          <li key={goalId}>
                            <label className="flex cursor-pointer items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() =>
                                  update((s) => ({ ...s, planProgress: { ...s.planProgress, [goalId]: !done } }))
                                }
                                className="size-4 accent-(--turkuaz)"
                              />
                              <span className={done ? 'text-muted line-through' : ''}>{goal.label}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
