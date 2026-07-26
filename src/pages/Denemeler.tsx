import { Link } from 'react-router-dom';
import { CalendarHeart, ChevronRight, FileText, Timer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { exams } from '@/content/index';
import { EXAM_DURATION_MIN, PASS_SCORE } from '@/lib/constants';
import { DAILY_DURATION_MIN, DAILY_EXAM_PREFIX, DAILY_QUESTION_COUNT } from '@/lib/dailyExam';
import { todayKey } from '@/lib/streak';

export default function Denemeler() {
  const { state } = useAppState();

  const today = todayKey();
  const todayId = `${DAILY_EXAM_PREFIX}${today}`;
  const todayResult = [...state.examResults].reverse().find((r) => r.examId === todayId);
  const todayLabel = new Date(`${today}T12:00:00+03:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'Europe/Istanbul',
  });
  const pastDailies = state.examResults
    .filter((r) => r.examId.startsWith(DAILY_EXAM_PREFIX) && r.examId !== todayId)
    .slice(-7)
    .reverse();

  return (
    <div>
      <PageHeader eyebrow="SINAV PROVASI" title="Denemeler & Çıkmış Sorular"
        subtitle={`Gerçek format: 100 soru • ${EXAM_DURATION_MIN} dk • baraj ${PASS_SCORE}`}
      />

      {/* Günün Denemesi */}
      <section className="rise-in mb-6 rounded-(--radius-card) border border-altin/40 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-altin/15 text-altin" aria-hidden>
              <CalendarHeart size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display font-semibold">Günün Denemesi</h2>
              <p className="mt-0.5 text-xs text-muted">
                {todayLabel} • {DAILY_QUESTION_COUNT} soru • {DAILY_DURATION_MIN} dk — her güne özel yeni set
              </p>
            </div>
          </div>
          {todayResult ? (
            <div className="flex items-center gap-3">
              <span
                className={['font-display text-2xl font-semibold', todayResult.score >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'].join(' ')}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {todayResult.score.toLocaleString('tr-TR')}
              </span>
              <Link to={`/sinav/${todayId}/sonuc`} className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink">
                Sonucu Gör
              </Link>
            </div>
          ) : (
            <Link
              to={`/sinav/${todayId}`}
              className="rounded-full bg-altin px-5 py-2.5 text-sm font-semibold text-ground transition-transform active:scale-95"
            >
              Bugünün Setini Çöz
            </Link>
          )}
        </div>
        {todayResult && (
          <p className="mt-3 text-sm text-turkuaz">Bugünün seti tamam — yarın sabah yepyeni 50 soru burada olacak.</p>
        )}
        {/*
          Arşiv bağlantısı: setler tarihten üretildiği için geçmiş her gün
          yeniden kurulabilir. Önceden yalnızca ÇÖZÜLMÜŞ günler listeleniyordu,
          kaçırılan bir gün erişilemez oluyordu.
        */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap gap-2">
            {pastDailies.map((r) => {
              const d = r.examId.slice(DAILY_EXAM_PREFIX.length);
              const lbl = new Date(`${d}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' });
              return (
                <Link
                  key={r.examId + r.finishedAt}
                  to={`/sinav/${r.examId}/sonuc`}
                  className="rounded-full border border-line bg-ground px-3 py-1.5 text-xs text-muted hover:text-ink"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {lbl}: <strong className={r.score >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'}>{Math.round(r.score)}</strong>
                </Link>
              );
            })}
          </div>
          <Link to="/gunluk-denemeler" className="shrink-0 text-xs font-medium text-kobalt hover:underline">
            Tüm günlük arşiv — kaçırdıklarını çöz →
          </Link>
        </div>
      </section>

      {exams.length === 0 ? (
        <div className="rounded-(--radius-card) border border-line bg-surface p-8 text-center text-muted">
          Denemeler hazırlanıyor — çok yakında burada olacak.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, i) => {
            const results = state.examResults.filter((r) => r.examId === exam.id);
            const best = results.length > 0 ? Math.max(...results.map((r) => r.score)) : null;

            return (
              <Link
                key={exam.id}
                to={`/sinav/${exam.id}`}
                className="rise-in flex items-center gap-4 rounded-(--radius-card) border border-line bg-surface p-4 transition-colors hover:bg-raised"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className={[
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    exam.kind === 'deneme' ? 'bg-mercan/15 text-mercan' : 'bg-kobalt/15 text-kobalt',
                  ].join(' ')}
                  aria-hidden
                >
                  {exam.kind === 'deneme' ? <Timer size={20} /> : <FileText size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{exam.title}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className={exam.kind === 'deneme' ? 'text-mercan' : 'text-kobalt'}>
                      {exam.kind === 'deneme' ? 'Deneme' : 'Çıkmış'}
                    </span>
                    {' • '}
                    {exam.questions.length} soru
                    {results.length > 0 && (
                      <>
                        {' • '}
                        {results.length} kez çözüldü — en iyi:{' '}
                        <strong className={best! >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'}>
                          {best!.toLocaleString('tr-TR')}
                        </strong>
                      </>
                    )}
                  </p>
                  {exam.note && <p className="mt-1 text-xs text-muted">{exam.note}</p>}
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
