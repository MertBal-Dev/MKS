import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Timer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { exams } from '@/content/index';
import { EXAM_DURATION_MIN, PASS_SCORE } from '@/lib/constants';

export default function Denemeler() {
  const { state } = useAppState();

  return (
    <div>
      <PageHeader
        title="Denemeler & Çıkmış Sorular"
        subtitle={`Gerçek format: 100 soru • ${EXAM_DURATION_MIN} dk • baraj ${PASS_SCORE}`}
      />

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
