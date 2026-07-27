import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { QuestionCard } from '@/components/QuestionCard';
import { exams } from '@/content/index';
import { DAILY_EXAM_PREFIX, MINI_EXAM_PREFIX, resolveDailyExam, resolveMiniExam } from '@/lib/dailyExam';
import { CUSTOM_EXAM_PREFIX, resolveCustomExam } from '@/lib/customSets';
import { PASS_SCORE, TOPICS, type TopicId } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import { useMotivasyon } from '@/hooks/useMotivasyon';
import { sinavKarti } from '@/lib/motivasyon';

export default function SinavSonuc() {
  const { examId } = useParams();
  const { state } = useAppState();
  const { kutla } = useMotivasyon();
  const [openWrong, setOpenWrong] = useState<string | null>(null);

  // Sınav odasıyla AYNI çözümleme zinciri. Ayrı kalırsa mini test ve kendi
  // soru setleri çözülür ama sonucu görünmez — sonuç sayfası sessizce
  // denemeler listesine geri atar.
  const exam =
    exams.find((e) => e.id === examId) ??
    resolveDailyExam(examId) ??
    resolveMiniExam(examId) ??
    resolveCustomExam(examId);
  const result = [...state.examResults].reverse().find((r) => r.examId === examId);

  // Kutlama sonucun kendisine bağlı, sayfaya değil: aynı sonucu tekrar açmak
  // kartı yeniden çıkarmaz, ama farklı bir denemeyi bitirmek çıkarır.
  useEffect(() => {
    if (!result) return;
    const oncekiler = state.examResults.filter((r) => r.finishedAt < result.finishedAt);
    const oncekiEnIyi = oncekiler.length ? Math.max(...oncekiler.map((r) => r.score)) : undefined;

    kutla(`sinav-${result.examId}-${result.finishedAt}`, () =>
      sinavKarti({
        puan: result.score,
        dogru: result.correct,
        yanlis: result.wrong,
        bos: result.blank,
        baraj: PASS_SCORE,
        tur:
          result.examId.startsWith(MINI_EXAM_PREFIX) || result.examId.startsWith(CUSTOM_EXAM_PREFIX)
            ? 'mini'
            : result.examId.startsWith(DAILY_EXAM_PREFIX)
              ? 'gunluk'
              : 'deneme',
        enIyiMi: oncekiEnIyi === undefined || result.score > oncekiEnIyi,
        oncekiEnIyi,
      }),
    );
  }, [result, state.examResults, kutla]);

  if (!exam || !result) return <Navigate to="/denemeler" replace />;

  const passed = result.score >= PASS_SCORE;
  const gap = Math.abs(PASS_SCORE - result.score);
  const wrongQuestions = exam.questions.filter((q) => {
    const a = result.answers[q.id];
    return a !== undefined && a !== q.correct;
  });

  return (
    <div className="mx-auto max-w-xl">
      {/* Puan kartı */}
      <section className="rise-in mb-6 rounded-(--radius-card) border border-line bg-surface p-8 text-center">
        <p className="mb-2 text-xs tracking-widest text-muted">{exam.title.toLocaleUpperCase('tr-TR')}</p>
        <p
          className={['font-display text-7xl font-semibold', passed ? 'text-turkuaz' : 'text-altin'].join(' ')}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {result.score.toLocaleString('tr-TR')}
        </p>
        <p className="mt-2 font-medium">
          {passed ? 'Geçtin! Baraj aşıldı' : `Barajın ${gap.toLocaleString('tr-TR')} puan altında — birlikte kapatacağız.`}
        </p>
        <p className="mt-2 text-sm text-muted">
          {passed
            ? 'Bu puan tesadüf değil; emeğinin karşılığı. Sınav günü de böyle olacak.'
            : 'Unutma: bu yanlışlar artık sınavda karşına çıkamaz — hepsini burada yakaladın. Doğru yoldasın.'}
        </p>
        <p className="mt-3 text-sm text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {result.correct} doğru • {result.wrong} yanlış • {result.blank} boş
        </p>
      </section>

      {/* Konu kırılımı */}
      <section className="rise-in mb-6" style={{ animationDelay: '80ms' }}>
        <h2 className="font-display mb-3 text-lg font-semibold">Konu Kırılımı</h2>
        <div className="space-y-2.5">
          {Object.entries(result.byTopic)
            .sort(([, a], [, b]) => a.correct / Math.max(a.total, 1) - b.correct / Math.max(b.total, 1))
            .map(([topicId, t]) => {
              const pct = t.total === 0 ? 0 : (t.correct / t.total) * 100;
              const color = pct >= 70 ? 'var(--turkuaz)' : pct >= 50 ? 'var(--altin)' : 'var(--kizil)';
              const meta = TOPICS[topicId as TopicId];
              return (
                <div key={topicId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{meta?.short ?? topicId}</span>
                    <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {t.correct}/{t.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Yanlışların çözümleri */}
      {wrongQuestions.length > 0 && (
        <section className="rise-in mb-6" style={{ animationDelay: '140ms' }}>
          <h2 className="font-display mb-3 text-lg font-semibold">
            Yanlışların ({wrongQuestions.length}) — çözümleriyle
          </h2>
          <div className="space-y-3">
            {wrongQuestions.map((q) => (
              <div key={q.id} className="rounded-(--radius-card) border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => setOpenWrong(openWrong === q.id ? null : q.id)}
                  className="w-full px-5 py-4 text-left"
                  aria-expanded={openWrong === q.id}
                >
                  <span className="mr-2 text-xs text-kizil">
                    Senin cevabın: {result.answers[q.id]} • Doğru: {q.correct}
                  </span>
                  <span className="block leading-snug">{q.stem}</span>
                </button>
                {openWrong === q.id && (
                  <div className="border-t border-line px-5 py-4">
                    <QuestionCard question={q} selected={result.answers[q.id]} revealed onSelect={() => {}} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3 pb-6">
        <Link to="/denemeler" className="flex-1 rounded-(--radius-card) border border-line bg-surface px-5 py-3.5 text-center">
          Denemeler
        </Link>
        <Link
          to="/yanlis-havuzu"
          className="flex-1 rounded-(--radius-card) bg-mercan px-5 py-3.5 text-center font-semibold text-mercan-ink"
        >
          Yanlış Havuzu
        </Link>
      </div>
    </div>
  );
}
