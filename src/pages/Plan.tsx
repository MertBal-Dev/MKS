import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { TOPICS } from '@/lib/constants';
import { currentPlan, planOzeti, PHASE_LABEL, type PlanDay, type PlanGoal, type PlanPhase } from '@/lib/planner';
import { todayKey } from '@/lib/streak';

const PHASE_TONE: Record<PlanPhase, string> = {
  temel: 'bg-kobalt/15 text-kobalt',
  pekistirme: 'bg-altin/15 text-altin',
  final: 'bg-mercan/15 text-mercan',
};

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00+03:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Istanbul',
  });

/** Bir günün ne hakkında olduğunu tek satırda söyler. */
function daySubtitle(day: PlanDay): string {
  if (day.focusTopics.length > 0) return day.focusTopics.map((t) => TOPICS[t].short).join(', ');
  if (day.goals.some((g) => g.kind === 'exam')) return 'Deneme günü';
  return 'Genel tekrar';
}

function GoalRow({ goal, id, done, onToggle }: { goal: PlanGoal; id: string; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={goal.label}
        onClick={onToggle}
        className={[
          'tap-target grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
          done ? 'border-turkuaz bg-turkuaz text-ground' : 'border-line-hi hover:border-turkuaz',
        ].join(' ')}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      {goal.href ? (
        <Link
          to={goal.href}
          className={[
            'group flex min-w-0 flex-1 items-center gap-1.5 text-sm transition-colors',
            done ? 'text-muted line-through' : 'hover:text-mercan',
          ].join(' ')}
        >
          <span className="truncate">{goal.label}</span>
          <ArrowRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ) : (
        <span className={['flex-1 text-sm', done ? 'text-muted line-through' : ''].join(' ')}>{goal.label}</span>
      )}
      <span className="sr-only">{id}</span>
    </li>
  );
}

export default function Plan() {
  const { state, update } = useAppState();
  const today = todayKey();
  const plan = useMemo(() => currentPlan(), []);
  const ozet = useMemo(() => planOzeti(plan), [plan]);
  const [dagilimAcik, setDagilimAcik] = useState(false);

  const doneCount = (day: PlanDay) => day.goals.filter((_, i) => state.planProgress[`${day.id}:${i}`]).length;
  const dayPct = (day: PlanDay) => (day.goals.length === 0 ? 0 : doneCount(day) / day.goals.length);

  const toggle = (goalId: string, done: boolean) =>
    update((s) => ({ ...s, planProgress: { ...s.planProgress, [goalId]: !done } }));

  const weeks = useMemo(() => {
    const map = new Map<number, PlanDay[]>();
    for (const day of plan) {
      if (!map.has(day.weekNo)) map.set(day.weekNo, []);
      map.get(day.weekNo)!.push(day);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  const todayDay = plan.find((d) => d.date === today);
  const currentWeek = todayDay?.weekNo ?? weeks[0]?.[0] ?? 1;
  const [openWeek, setOpenWeek] = useState<number | null>(currentWeek);

  // Genel ilerleme: tamamlanan hedef / toplam hedef
  const totals = useMemo(() => {
    let goals = 0;
    let done = 0;
    for (const day of plan) {
      goals += day.goals.length;
      done += day.goals.filter((_, i) => state.planProgress[`${day.id}:${i}`]).length;
    }
    const remainingDays = plan.filter((d) => d.date >= today).length;
    return { goals, done, pct: goals === 0 ? 0 : done / goals, remainingDays };
  }, [plan, state.planProgress, today]);

  return (
    <div>
      <PageHeader
        eyebrow="DERS PROGRAMI"
        title="Çalışma Planı"
        subtitle="Plan senin için düşünür — sen yalnızca bugüne odaklan. Günler birikir, baraj geçilir."
      />

      {/* Nerede olduğunu tek bakışta gösterir */}
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line md:grid-cols-4">
        {[
          // "Kalan gün" demiyoruz: yan panel sınava kalan günü sayıyor, bu ise
          // planda kalan çalışma gününü. İkisi bir gün farkla çelişik görünüyordu.
          { value: totals.remainingDays, label: 'plan günü kaldı' },
          { value: `%${Math.round(totals.pct * 100)}`, label: 'plan tamamlandı' },
          { value: `${totals.done}/${totals.goals}`, label: 'hedef' },
          { value: todayDay ? PHASE_LABEL[todayDay.phase] : '—', label: 'bugünkü evre' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-3.5">
            <p className="font-display text-xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bugün — planın tek gerçek eylem çağrısı */}
      {todayDay && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 rounded-(--radius-card) border border-mercan bg-surface p-5"
        >
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-mercan">Bugün</p>
              <h2 className="font-display mt-1 text-xl font-semibold">{daySubtitle(todayDay)}</h2>
            </div>
            <span className="shrink-0 text-sm text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {doneCount(todayDay)}/{todayDay.goals.length}
            </span>
          </div>
          <ul className="space-y-3">
            {todayDay.goals.map((goal, i) => {
              const goalId = `${todayDay.id}:${i}`;
              const done = state.planProgress[goalId] === true;
              return <GoalRow key={goalId} goal={goal} id={goalId} done={done} onToggle={() => toggle(goalId, done)} />;
            })}
          </ul>
        </motion.section>
      )}

      {/* Konu ağırlığı — planın neden böyle kurulduğunu gösterir */}
      <section className="mb-8 overflow-hidden rounded-(--radius-card) border border-line bg-surface">
        <button
          type="button"
          onClick={() => setDagilimAcik(!dagilimAcik)}
          aria-expanded={dagilimAcik}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold">Konu ağırlığına göre dağılım</h2>
            <p className="mt-0.5 text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Sınava kadar {ozet.toplamSoru.toLocaleString('tr-TR')} soru • günde ortalama {ozet.gunlukSoru} •{' '}
              {ozet.konuGunu} konu günü, {ozet.denemeGunu} deneme günü, {ozet.finalGunu} gün son tekrar
            </p>
          </div>
          <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${dagilimAcik ? 'rotate-180' : ''}`} />
        </button>

        {dagilimAcik && (
          <div className="border-t border-line px-4 py-4">
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Denemede çok soru çıkan konuya daha çok gün ve daha çok soru düşüyor. Ağırlıklar geçmiş oturumlara
              dayanan tahmindir — Bakanlık başlık başına soru sayısı yayımlamıyor.
            </p>
            <ul className="space-y-2.5">
              {ozet.konuDagilimi.map((k) => {
                const enCok = Math.max(...ozet.konuDagilimi.map((x) => x.soru), 1);
                return (
                  // Dar ekranda satır kırılır: yan yana sıkıştırılan çubuk
                  // 60 piksele düşüyor ve karşılaştırma anlamını yitiriyordu.
                  <li key={k.topicId} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <Link
                      to={`/konular/${k.topicId}`}
                      className="truncate text-xs transition-colors hover:text-mercan sm:w-40 sm:shrink-0"
                    >
                      {TOPICS[k.topicId].short}
                    </Link>
                    <div className="flex w-full items-center gap-3 sm:flex-1">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                        <div className="h-full rounded-full bg-mercan" style={{ width: `${(k.soru / enCok) * 100}%` }} />
                      </div>
                      <span
                        className="w-24 shrink-0 text-right text-[11px] text-muted sm:w-28"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {k.soru} soru • {k.gun} gün
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Haftalar — yalnızca içinde bulunulan hafta açık gelir */}
      <div className="space-y-3">
        {weeks.map(([weekNo, days]) => {
          const isOpen = openWeek === weekNo;
          const goals = days.reduce((n, d) => n + d.goals.length, 0);
          const done = days.reduce((n, d) => n + doneCount(d), 0);
          const pct = goals === 0 ? 0 : done / goals;
          const phase = days[Math.floor(days.length / 2)].phase;

          return (
            <section key={weekNo} className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
              <button
                type="button"
                onClick={() => setOpenWeek(isOpen ? null : weekNo)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold">{weekNo}. Hafta</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PHASE_TONE[phase]}`}>
                      {PHASE_LABEL[phase].toUpperCase()}
                    </span>
                    {weekNo === currentWeek && (
                      <span className="rounded-full bg-mercan/15 px-2 py-0.5 text-[10px] font-semibold text-mercan">
                        BU HAFTA
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {shortDate(days[0].date)} – {shortDate(days[days.length - 1].date)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-raised">
                    <div
                      className={pct === 1 ? 'h-full bg-turkuaz' : 'h-full bg-mercan'}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    %{Math.round(pct * 100)}
                  </span>
                  <ChevronDown className={`size-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-line">
                  {days.map((day) => {
                    const isToday = day.date === today;
                    const isPast = day.date < today;
                    const pctDay = dayPct(day);
                    const missed = isPast && pctDay < 1;

                    return (
                      <details key={day.id} open={isToday} className="border-b border-line last:border-b-0">
                        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-raised">
                          <span
                            className={[
                              'grid size-9 shrink-0 place-items-center rounded-lg text-[11px] font-semibold',
                              pctDay === 1
                                ? 'bg-turkuaz text-ground'
                                : isToday
                                  ? 'bg-mercan text-mercan-ink'
                                  : 'bg-raised text-muted',
                            ].join(' ')}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {pctDay === 1 ? <Check className="size-4" strokeWidth={3} /> : shortDate(day.date).split(' ')[0]}
                            <span className="sr-only">{shortDate(day.date)}</span>
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              <span className="truncate">{daySubtitle(day)}</span>
                              {isToday && (
                                <span className="shrink-0 rounded-full bg-mercan/15 px-2 py-0.5 text-[10px] font-semibold text-mercan">
                                  BUGÜN
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted">
                              {day.label.split(' • ')[1]}
                              {missed && ' • telafi edilebilir'}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 text-xs ${missed ? 'text-altin' : 'text-muted'}`}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {doneCount(day)}/{day.goals.length}
                          </span>
                        </summary>

                        <ul className="space-y-3 bg-ground/30 px-4 pb-4 pt-1 pl-[3.25rem]">
                          {day.goals.map((goal, i) => {
                            const goalId = `${day.id}:${i}`;
                            const goalDone = state.planProgress[goalId] === true;
                            return (
                              <GoalRow
                                key={goalId}
                                goal={goal}
                                id={goalId}
                                done={goalDone}
                                onToggle={() => toggle(goalId, goalDone)}
                              />
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
