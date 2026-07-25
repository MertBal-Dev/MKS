import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, X } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';
import { useAppState } from '@/hooks/useAppState';
import { exams } from '@/content/index';
import { EXAM_DURATION_MIN, PASS_SCORE } from '@/lib/constants';
import {
  clearSession,
  createSession,
  loadSession,
  remainingMs,
  saveSession,
  type ExamSessionState,
} from '@/lib/examSession';
import { gradeExam } from '@/lib/scoring';
import { DAILY_DURATION_MIN, DAILY_EXAM_PREFIX, resolveDailyExam } from '@/lib/dailyExam';
import { recordAnswer } from '@/lib/wrongPool';
import { wrongToCard } from '@/lib/autoCards';
import { newCard } from '@/lib/srs';
import { bumpStreak, todayKey } from '@/lib/streak';
import type { ChoiceId } from '@/lib/types';

export default function SinavOdasi() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { update } = useAppState();

  const exam = exams.find((e) => e.id === examId) ?? resolveDailyExam(examId);
  const durationMin = exam?.id.startsWith(DAILY_EXAM_PREFIX) ? DAILY_DURATION_MIN : EXAM_DURATION_MIN;

  const [session, setSession] = useState<ExamSessionState | null>(() => {
    const existing = loadSession(sessionStorage);
    return existing && existing.examId === examId ? existing : null;
  });
  const [index, setIndex] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [, tick] = useState(0);

  // Süre göstergesi için saniyelik yeniden çizim
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [session]);

  const submit = useCallback(
    (s: ExamSessionState) => {
      if (!exam) return;
      const result = gradeExam(exam, s.answers);
      const now = new Date();
      update((prev) => {
        let wrongPool = prev.wrongPool;
        const srs = { ...prev.srs };
        for (const q of exam.questions) {
          const a = s.answers[q.id];
          if (!a) continue;
          const ok = a === q.correct;
          wrongPool = recordAnswer(wrongPool, q.id, ok ? 'correct' : 'wrong', now);
          if (!ok) {
            const cardId = wrongToCard(q).id;
            if (!srs[cardId]) srs[cardId] = newCard(now);
          }
        }
        return {
          ...prev,
          examResults: [...prev.examResults, result],
          wrongPool,
          srs,
          streak: bumpStreak(prev.streak, todayKey(now)),
        };
      });
      clearSession(sessionStorage);
      navigate(`/sinav/${exam.id}/sonuc`);
    },
    [exam, navigate, update],
  );

  // Süre dolunca otomatik teslim
  const msLeft = session ? remainingMs(session, new Date(), durationMin) : null;
  useEffect(() => {
    if (session && msLeft === 0) submit(session);
  }, [session, msLeft, submit]);

  const answeredCount = useMemo(
    () => (session ? Object.keys(session.answers).length : 0),
    [session],
  );

  if (!exam) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <p className="mb-3 text-muted">Sınav bulunamadı.</p>
        <Link to="/denemeler" className="text-kobalt">
          Denemelere dön
        </Link>
      </div>
    );
  }

  // Başlangıç ekranı
  if (!session) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-xl place-items-center p-6">
        <div className="rise-in w-full rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <p className="mb-1 text-xs tracking-widest text-muted">
            {exam.kind === 'deneme' ? 'DENEME SINAVI' : 'ÇIKMIŞ SINAV'}
          </p>
          <h1 className="font-display mb-4 text-2xl font-semibold">{exam.title}</h1>
          <ul className="mb-6 space-y-1 text-sm text-muted">
            <li>{exam.questions.length} soru • {durationMin} dakika</li>
            <li>Baraj: {PASS_SCORE} puan • Yanlış, doğruyu götürmez</li>
            <li>Cevaplar sınav bitene kadar gösterilmez</li>
          </ul>
          {exam.note && <p className="mb-3 text-xs text-muted">{exam.note}</p>}
          <p className="mb-6 rounded-xl bg-altin/10 px-4 py-3 text-sm text-altin">
            Bu bir prova — puan değil, öğrenmek için buradasın. Her deneme seni gerçek sınava biraz daha hazırlar. 💛
          </p>
          <button
            type="button"
            onClick={() => {
              const s = createSession(exam.id, new Date());
              saveSession(sessionStorage, s);
              setSession(s);
              setIndex(0);
            }}
            className="w-full rounded-(--radius-card) bg-mercan px-5 py-4 font-semibold text-mercan-ink transition-transform active:scale-[0.98]"
          >
            Sınavı Başlat
          </button>
          <Link to="/denemeler" className="mt-4 block text-sm text-muted hover:text-ink">
            Vazgeç
          </Link>
        </div>
      </div>
    );
  }

  const question = exam.questions[index];
  const minutes = Math.floor((msLeft ?? 0) / 60_000);
  const seconds = Math.floor(((msLeft ?? 0) % 60_000) / 1000);
  const urgent = (msLeft ?? 0) < 10 * 60_000;
  const isMarked = session.marked.includes(question.id);

  const patch = (fn: (s: ExamSessionState) => ExamSessionState) => {
    setSession((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      saveSession(sessionStorage, next);
      return next;
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-6">
      {/* Üst çubuk: süre + ilerleme */}
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-ground/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span
            className={['font-display text-lg font-semibold', urgent ? 'text-mercan' : ''].join(' ')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            role="timer"
            aria-label={`Kalan süre ${minutes} dakika`}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-sm text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {answeredCount} / {exam.questions.length} cevaplandı
          </span>
          <button
            type="button"
            onClick={() => setConfirmFinish(true)}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:text-ink"
          >
            Bitir
          </button>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-raised">
          <div
            className={['h-full rounded-full transition-all', urgent ? 'bg-mercan' : 'bg-altin'].join(' ')}
            style={{ width: `${((msLeft ?? 0) / (durationMin * 60_000)) * 100}%` }}
          />
        </div>
      </header>

      {/* Soru */}
      <div className="flex-1">
        <div className="mb-3 flex items-start justify-between">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="text-xs tracking-widest text-muted underline-offset-4 hover:underline"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            SORU {index + 1} / {exam.questions.length} — haritayı aç
          </button>
          <button
            type="button"
            onClick={() =>
              patch((s) => ({
                ...s,
                marked: isMarked ? s.marked.filter((id) => id !== question.id) : [...s.marked, question.id],
              }))
            }
            aria-pressed={isMarked}
            aria-label={isMarked ? 'İşareti kaldır' : 'Sonra dönmek için işaretle'}
            className={isMarked ? 'text-altin' : 'text-muted'}
          >
            <Bookmark size={20} fill={isMarked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <QuestionCard
          question={question}
          selected={session.answers[question.id]}
          revealed={false}
          onSelect={(choice: ChoiceId) =>
            patch((s) => ({ ...s, answers: { ...s.answers, [question.id]: choice } }))
          }
        />
      </div>

      {/* Gezinme */}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          className="flex-1 rounded-(--radius-card) border border-line bg-surface px-5 py-3.5 disabled:opacity-40"
        >
          Önceki
        </button>
        <button
          type="button"
          disabled={index === exam.questions.length - 1}
          onClick={() => setIndex(index + 1)}
          className="flex-1 rounded-(--radius-card) bg-mercan px-5 py-3.5 font-semibold text-mercan-ink disabled:opacity-40"
        >
          Sonraki
        </button>
      </div>

      {/* Soru haritası */}
      {mapOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Soru haritası">
          <button type="button" aria-label="Kapat" className="absolute inset-0 bg-black/60" onClick={() => setMapOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold">Soru Haritası</h2>
              <button type="button" onClick={() => setMapOpen(false)} aria-label="Kapat" className="text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
              {exam.questions.map((q, i) => {
                const answered = session.answers[q.id] !== undefined;
                const marked = session.marked.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setMapOpen(false);
                    }}
                    className={[
                      'relative grid aspect-square place-items-center rounded-lg border text-xs font-medium transition-colors',
                      i === index
                        ? 'border-mercan bg-mercan text-mercan-ink'
                        : answered
                          ? 'border-turkuaz/50 bg-turkuaz/15 text-turkuaz'
                          : 'border-line bg-ground text-muted',
                    ].join(' ')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                    aria-label={`Soru ${i + 1}${answered ? ', cevaplandı' : ''}${marked ? ', işaretli' : ''}`}
                  >
                    {i + 1}
                    {marked && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-altin" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bitirme onayı */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="Vazgeç" className="absolute inset-0 bg-black/60" onClick={() => setConfirmFinish(false)} />
          <div className="rise-in relative w-full max-w-sm rounded-(--radius-card) border border-line bg-surface p-6 text-center">
            <h2 className="font-display mb-2 text-lg font-semibold">Sınavı bitir?</h2>
            <p className="mb-5 text-sm text-muted">
              {answeredCount} soru cevapladın{exam.questions.length - answeredCount > 0 && (
                <>
                  , <strong className="text-altin">{exam.questions.length - answeredCount} soru boş</strong>
                </>
              )}
              . Teslimden sonra geri dönüş yok.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
              >
                Devam et
              </button>
              <button
                type="button"
                onClick={() => submit(session)}
                className="flex-1 rounded-full bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
              >
                Teslim et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
