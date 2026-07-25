import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Layers, ListChecks, Timer } from 'lucide-react';
import { CountdownMedallion, CountdownPill, DailyRing } from '@/components/Countdown';
import { ProgressRing } from '@/components/ProgressRing';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { EXAM_DATE, TOPICS, TOPIC_IDS } from '@/lib/constants';
import { generatePlan } from '@/lib/planner';
import { estimateScore, topicAccuracy } from '@/lib/scoring';
import { dueCards } from '@/lib/srs';
import { todayKey } from '@/lib/streak';

/** Güne göre dönen, baskı kurmayan cesaretlendirme cümleleri. */
const MOTIVATION = [
  'Bugün küçük bir adım, sınav günü büyük bir fark. 🌱',
  'Mükemmel gün bekleme — çalışılan her gün mükemmel sayılır.',
  'Şu an zor gelen konu, sınav salonunda senin bölgen olacak.',
  'Yavaş ilerlemek durmak değildir. Devam. 💛',
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

export default function Dashboard() {
  const { state, update } = useAppState();
  const now = new Date();
  const today = todayKey(now);
  const countdownMode = state.settings.countdown;

  const plan = generatePlan(new Date('2026-07-25T00:00:00+03:00'), EXAM_DATE);
  const todayPlan = plan.find((d) => d.date === today);
  const doneToday = todayPlan ? todayPlan.goals.filter((_, i) => state.planProgress[`${todayPlan.id}:${i}`]).length : 0;
  const totalToday = todayPlan?.goals.length ?? 0;

  const due = dueCards(state.srs, now).length;
  const estimate = estimateScore(topicAccuracy(state.attempts, questionBank));
  const motivation = MOTIVATION[dayOfYear(now) % MOTIVATION.length];

  const solvedByTopic = new Map<string, Set<string>>();
  for (const qId of Object.keys(state.attempts)) {
    const q = questionBank.find((x) => x.id === qId);
    if (!q) continue;
    if (!solvedByTopic.has(q.topicId)) solvedByTopic.set(q.topicId, new Set());
    solvedByTopic.get(q.topicId)!.add(qId);
  }

  return (
    <div className="space-y-6">
      {/* Selamlama */}
      <header className="rise-in pt-1">
        <h1 className="font-display text-2xl font-semibold lg:text-3xl">{greeting(now)} ✨</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{motivation}</p>
      </header>

      {/* Hero: masaüstünde iki sütun — solda bugünün planı, sağda günlük halka */}
      <div className="grid gap-5 xl:grid-cols-5">
        {/* Bugünün Planı — asıl kahraman */}
        <section
          className="rise-in rounded-(--radius-card) border border-line bg-surface p-5 xl:col-span-3"
          style={{ animationDelay: '60ms' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Bugünün Planı</h2>
            <Link to="/plan" className="inline-flex items-center gap-1 text-sm text-kobalt">
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
                    <li key={goalId}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ground px-4 py-3 transition-colors">
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
              {doneToday === totalToday && totalToday > 0 && (
                <p className="mt-3 rounded-xl bg-turkuaz/10 px-4 py-3 text-sm text-turkuaz">
                  Bugünü tamamladın — gerisi bonus. Kendine iyi davran. 🎉
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Bugün plan dışı bir gün — istersen serbest tekrar yap.</p>
          )}

          {/* Hızlı başlat */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Link
              to="/pratik?mode=quick"
              className="rounded-xl bg-mercan px-3 py-3.5 text-center text-mercan-ink transition-transform active:scale-95"
            >
              <ListChecks className="mx-auto mb-1" size={20} aria-hidden />
              <span className="block text-xs font-semibold sm:text-sm">10 Soru Çöz</span>
            </Link>
            <Link
              to="/tekrar"
              className="rounded-xl border border-line bg-ground px-3 py-3.5 text-center transition-transform active:scale-95"
            >
              <Layers className="mx-auto mb-1 text-altin" size={20} aria-hidden />
              <span className="block text-xs font-semibold sm:text-sm">
                Kart Tekrarı
                {due > 0 && <span className="ml-1 rounded-full bg-altin px-1.5 text-xs text-ground">{due}</span>}
              </span>
            </Link>
            <Link
              to="/denemeler"
              className="rounded-xl border border-line bg-ground px-3 py-3.5 text-center transition-transform active:scale-95"
            >
              <Timer className="mx-auto mb-1 text-kobalt" size={20} aria-hidden />
              <span className="block text-xs font-semibold sm:text-sm">Denemeye Gir</span>
            </Link>
          </div>
        </section>

        {/* Sağ sütun: günlük halka (soft) veya büyük geri sayım (full) */}
        <section
          className="rise-in rounded-(--radius-card) border border-line bg-surface p-5 text-center xl:col-span-2"
          style={{ animationDelay: '120ms' }}
        >
          {countdownMode === 'full' ? (
            <div className="py-2">
              <CountdownMedallion />
              <div className="mt-9" />
            </div>
          ) : (
            <>
              <DailyRing done={doneToday} total={totalToday} />
              <p className="mt-3 text-sm text-muted">
                Halka her sabah sıfırlanır — bugünü tamamlamak yeter. 💪
              </p>
            </>
          )}

          <div className="mt-4 flex flex-col items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Flame size={16} className={state.streak.current > 0 ? 'text-mercan' : ''} aria-hidden />
              {state.streak.current > 0
                ? state.streak.current >= 3
                  ? `${state.streak.current} gündür buradasın — bu ritim seni taşır 🔥`
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
                    {estimate.toLocaleString('tr-TR')}
                  </strong>
                  {estimate >= 70 && ' — baraj üstündesin! 🌟'}
                </>
              )}
            </span>
            {countdownMode !== 'hidden' && countdownMode !== 'full' && <CountdownPill />}
          </div>
        </section>
      </div>

      {/* Konu ilerlemesi */}
      <section className="rise-in" style={{ animationDelay: '180ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Konu İlerlemen</h2>
          <Link to="/konular" className="inline-flex items-center gap-1 text-sm text-kobalt">
            Konulara git <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
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
