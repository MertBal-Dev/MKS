import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PracticePlayer } from '@/components/PracticePlayer';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { TOPIC_IDS, type TopicId } from '@/lib/constants';
import { buildPracticeSet, type PracticeFilters } from '@/lib/practiceSet';
import { wrongToCard } from '@/lib/autoCards';
import { recordAnswer } from '@/lib/wrongPool';
import { newCard } from '@/lib/srs';
import { bumpStreak, todayKey } from '@/lib/streak';

export default function Pratik() {
  const [params] = useSearchParams();
  const { state, update } = useAppState();

  // Soru seti yalnızca giriş anında kurulur — cevaplar setin sırasını değiştirmez.
  const questions = useMemo(() => {
    const filters: PracticeFilters = {};
    const topic = params.get('topic');
    if (topic && TOPIC_IDS.includes(topic as TopicId)) filters.topics = [topic as TopicId];

    const difficulty = params.get('difficulty');
    if (difficulty) {
      filters.difficulty = difficulty
        .split(',')
        .map(Number)
        .filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3);
    }

    const status = params.get('status');
    if (status === 'unseen' || status === 'wrong' || status === 'flagged') filters.status = status;

    const count = Number(params.get('count'));
    filters.count = Number.isFinite(count) && count > 0 ? count : params.get('mode') === 'quick' ? 10 : 20;

    return buildPracticeSet(questionBank, state.attempts, state.wrongPool, state.flagged, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/soru-bankasi" className="tap-target mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden /> Soru Bankası
      </Link>

      <PracticePlayer
        questions={questions}
        flagged={state.flagged}
        onToggleFlag={(qId) =>
          update((s) => ({
            ...s,
            flagged: s.flagged.includes(qId) ? s.flagged.filter((id) => id !== qId) : [...s.flagged, qId],
          }))
        }
        onAnswer={(question, _choice, isCorrect) => {
          const now = new Date();
          update((s) => {
            const prev = s.attempts[question.id] ?? { correct: 0, wrong: 0, lastResult: 'correct' as const, lastAt: '' };
            const srs = { ...s.srs };
            if (!isCorrect) {
              // Yanlış → otomatik tekrar kartı (yoksa) oluştur
              const cardId = wrongToCard(question).id;
              if (!srs[cardId]) srs[cardId] = newCard(now);
            }
            return {
              ...s,
              attempts: {
                ...s.attempts,
                [question.id]: {
                  correct: prev.correct + (isCorrect ? 1 : 0),
                  wrong: prev.wrong + (isCorrect ? 0 : 1),
                  lastResult: isCorrect ? 'correct' : 'wrong',
                  lastAt: now.toISOString(),
                },
              },
              wrongPool: recordAnswer(s.wrongPool, question.id, isCorrect ? 'correct' : 'wrong', now),
              srs,
              streak: bumpStreak(s.streak, todayKey(now)),
            };
          });
        }}
      />
    </div>
  );
}
