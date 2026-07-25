import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarHeart, Flame, GraduationCap, Layers, ListChecks } from 'lucide-react';
import { AnimatedNumber, CountdownMedallion, CountdownPill, DailyRing } from '@/components/Countdown';
import { ProgressRing } from '@/components/ProgressRing';
import { useAppState } from '@/hooks/useAppState';
import { useAiHoca } from '@/hooks/useAiHoca';
import { questionBank } from '@/content/index';
import { TOPICS, TOPIC_IDS } from '@/lib/constants';
import { currentPlan } from '@/lib/planner';
import { estimateScore, topicAccuracy } from '@/lib/scoring';
import { dueCards } from '@/lib/srs';
import { todayKey } from '@/lib/streak';
import { DAILY_EXAM_PREFIX } from '@/lib/dailyExam';

/** Güne göre dönen, baskı kurmayan cesaretlendirme cümleleri. */
const MOTIVATION = [
  'Bugün küçük bir adım, sınav günü büyük bir fark.',
  'Mükemmel gün bekleme — çalışılan her gün mükemmel sayılır.',
  'Şu an zor gelen konu, sınav salonunda senin bölgen olacak.',
  'Yavaş ilerlemek durmak değildir. Devam.',
  'Dün ne olduysa olsun; bugünün üç küçük hedefi seni bekliyor.',
  'Sen soruları tanıdıkça sorular küçülür.',
  'Bir kart, bir soru, bir sayfa — hepsi birikiyor.',
  'Kaygı, önemsediğinin işareti. Onu enerjiye çevirelim.',
  'Bugün %1 daha hazırsın. Bu matematik hep senin lehine.',
  'Rehberler yolu bilir: adım adım. Sen de öylesin.',
  'Zihnin dinlenmeye de ihtiyaç duyar — mola da plandır.',
  'Barajı geçmek maraton değil; günlük kısa koşular meselesi.',
];

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Dashboard() {
  const { state, update } = useAppState();
  const { openFreeChat } = useAiHoca();
  const now = new Date();
  const today = todayKey(now);
  const countdownMode = state.settings.countdown;

  const plan = currentPlan();
  const todayPlan = plan.find((d) => d.date === today);
  const doneToday = todayPlan ? todayPlan.goals.filter((_, i) => state.planProgress[`${todayPlan.id}:${i}`]).length : 0;
  const totalToday = todayPlan?.goals.length ?? 0;

  const due = dueCards(state.srs, now).length;
  const estimate = estimateScore(topicAccuracy(state.attempts, questionBank));
  const motivation = MOTIVATION[dayOfYear(now) % MOTIVATION.length];
  const dailyDone = state.examResults.some((r) => r.examId === `${DAILY_EXAM_PREFIX}${today}`);

  const solvedByTopic = new Map<string, Set<string>>();
  for (const qId of Object.keys(state.attempts)) {
    const q = questionBank.find((x) => x.id === qId);
    if (!q) continue;
    if (!solvedByTopic.has(q.topicId)) solvedByTopic.set(q.topicId, new Set());
    solvedByTopic.get(q.topicId)!.add(qId);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Selamlama */}
      <motion.header variants={item} className="pt-1">
        <h1 className="font-display text-3xl font-semibold lg:text-4xl">{greeting(now)}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{motivation}</p>
      </motion.header>

      {/* Hero: solda bugünün planı, sağda günlük halka */}
      <div className="grid gap-5 xl:grid-cols-5">
        <motion.section
          variants={item}
          className="rounded-(--radius-card) border border-line bg-surface p-5 xl:col-span-3 xl:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Bugünün Planı</h2>
            <Link to="/plan" className="tap-target inline-flex items-center gap-1 text-sm text-kobalt transition-colors hover:text-ink">
              Tüm plan <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          {todayPlan ? (
            <>
              <p className="mb-3 text-xs tracking-wide text-muted">{todayPlan.label}</p>
              <ul className="space-y-2">
                {todayPlan.goals.map((goal, i) => {
                  const goalId = `${todayPlan.id}:${i}`;
                  const done = state.planProgress[goalId] === true;
                  return (
                    <motion.li key={goalId} whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                      <label
                        className={[
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                          done ? 'border-turkuaz/35 bg-turkuaz/5' : 'border-line bg-ground hover:border-line-hi',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => update((s) => ({ ...s, planProgress: { ...s.planProgress, [goalId]: !done } }))}
                          className="size-4 accent-(--turkuaz)"
                        />
                        <span className={done ? 'text-muted line-through' : ''}>{goal.label}</span>
                      </label>
                    </motion.li>
                  );
                })}
              </ul>
              {doneToday === totalToday && totalToday > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl bg-turkuaz/10 px-4 py-3 text-sm text-turkuaz"
                >
                  Bugünü tamamladın — gerisi bonus. Kendine iyi davran.
                </motion.p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Bugün plan dışı bir gün — istersen serbest tekrar yap.</p>
          )}

          {/* Hızlı başlat */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction to="/pratik?mode=quick" icon={ListChecks} label="10 Soru" primary />
            <QuickAction
              to={`/sinav/${DAILY_EXAM_PREFIX}${today}`}
              icon={CalendarHeart}
              label={dailyDone ? 'Günlük' : 'Günün Seti'}
              accent="altin"
            />
            <QuickAction to="/tekrar" icon={Layers} label="Kartlar" badge={due} accent="altin" />
            <QuickAction to="/ai-hoca" icon={GraduationCap} label="AI Hoca" accent="kobalt" onClick={() => openFreeChat()} />
          </div>
        </motion.section>

        {/* Sağ sütun */}
        <motion.section
          variants={item}
          className="rounded-(--radius-card) border border-line bg-surface p-5 text-center xl:col-span-2 xl:p-6"
        >
          {countdownMode === 'full' ? (
            <div className="py-2">
              <CountdownMedallion />
              <div className="mt-9" />
            </div>
          ) : (
            <>
              <DailyRing done={doneToday} total={totalToday} />
              <p className="mt-3 text-sm text-muted">Halka her sabah sıfırlanır — bugünü tamamlamak yeter.</p>
            </>
          )}

          <div className="mt-5 flex flex-col items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Flame size={16} className={state.streak.current > 0 ? 'text-mercan' : ''} aria-hidden />
              {state.streak.current > 0
                ? state.streak.current >= 3
                  ? `${state.streak.current} gündür buradasın — bu ritim seni taşır`
                  : `${state.streak.current} günlük seri`
                : 'İlk soruyla seri başlar'}
            </span>
            <span className="text-sm text-muted">
              {estimate === null ? (
                'Soru çözdükçe tahmini puanın burada belirecek'
              ) : (
                <>
                  Tahmini puan:{' '}
                  <strong className={estimate >= 70 ? 'text-turkuaz' : 'text-altin'}>
                    <AnimatedNumber value={estimate} decimals={1} />
                  </strong>
                  {estimate >= 70 && ' — baraj üstündesin!'}
                </>
              )}
            </span>
            {countdownMode !== 'hidden' && countdownMode !== 'full' && <CountdownPill />}
          </div>
        </motion.section>
      </div>

      {/* Konu ilerlemesi */}
      <motion.section variants={item}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Konu İlerlemen</h2>
          <Link to="/konular" className="tap-target inline-flex items-center gap-1 text-sm text-kobalt transition-colors hover:text-ink">
            Konulara git <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {TOPIC_IDS.map((id, i) => {
            const total = questionBank.filter((q) => q.topicId === id).length;
            const solved = solvedByTopic.get(id)?.size ?? 0;
            const value = total === 0 ? 0 : solved / total;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.03, duration: 0.35 }}
                whileHover={{ y: -3 }}
              >
                <Link
                  to={`/konular/${id}`}
                  className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-surface p-3 transition-colors hover:border-line-hi hover:bg-surface-hi"
                >
                  <div className="relative grid shrink-0 place-items-center">
                    <ProgressRing value={value} label={`${TOPICS[id].short} ilerleme`} />
                    <span className="absolute text-[10px] text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <span className="text-sm leading-tight">{TOPICS[id].short}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary,
  accent,
  badge,
  onClick,
}: {
  to: string;
  icon: typeof ListChecks;
  label: string;
  primary?: boolean;
  accent?: 'altin' | 'kobalt';
  badge?: number;
  onClick?: () => void;
}) {
  const color = accent === 'kobalt' ? 'text-kobalt' : accent === 'altin' ? 'text-altin' : '';
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
      <Link
        to={to}
        onClick={onClick}
        className={[
          'flex flex-col items-center gap-1.5 rounded-xl px-3 py-3.5 text-center transition-colors',
          primary
            ? 'bg-mercan text-mercan-ink hover:brightness-105'
            : 'border border-line bg-ground hover:border-line-hi hover:bg-raised',
        ].join(' ')}
      >
        <Icon className={primary ? '' : color} size={20} aria-hidden />
        <span className="text-xs font-semibold sm:text-sm">
          {label}
          {badge ? <span className="ml-1 rounded-full bg-altin px-1.5 text-[10px] text-ground">{badge}</span> : null}
        </span>
      </Link>
    </motion.div>
  );
}
