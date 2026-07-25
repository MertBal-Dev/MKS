import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { QuestionCard } from './QuestionCard';
import type { ChoiceId, Question } from '@/lib/types';

interface Props {
  questions: Question[];
  flagged: string[];
  onToggleFlag: (questionId: string) => void;
  /** Her cevapta çağrılır — attempts/wrongPool/srs/streak güncellemesi dışarıda. */
  onAnswer: (question: Question, choice: ChoiceId, isCorrect: boolean) => void;
}

/** Pratik modu: anında geri bildirim, şık açıklamaları, sonda özet. */
export function PracticePlayer({ questions, flagged, onToggleFlag, onAnswer }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<ChoiceId | undefined>();
  const [results, setResults] = useState<boolean[]>([]);

  if (questions.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-surface p-8 text-center">
        <p className="mb-3 text-muted">Bu filtrelerle soru bulunamadı.</p>
        <Link to="/soru-bankasi" className="text-kobalt">
          Filtreleri değiştir
        </Link>
      </div>
    );
  }

  const finished = results.length === questions.length && selected === undefined;
  if (finished) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="rise-in rounded-(--radius-card) border border-line bg-surface p-8 text-center">
        <p className="mb-1 text-xs tracking-widest text-muted">OTURUM TAMAMLANDI</p>
        <p className="font-display my-3 text-5xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {correct}
          <span className="text-2xl text-muted"> / {questions.length}</span>
        </p>
        <p className={['mb-2 font-medium', pct >= 70 ? 'text-turkuaz' : 'text-altin'].join(' ')}>
          {pct >= 70 ? 'Baraj üstü — harika gidiyorsun!' : 'Yanlışlar havuza eklendi; oradan tekrar çözeceksin.'}
        </p>
        <p className="mb-6 text-sm text-muted">
          {pct >= 70
            ? 'Bu istikrar sınav günü de seninle olacak.'
            : 'Her yanlış, sınavdan önce yakalanmış bir puandır — şu an tam olarak yapman gerekeni yapıyorsun.'}
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/soru-bankasi" className="rounded-full border border-line bg-ground px-5 py-2.5 text-sm">
            Yeni oturum
          </Link>
          <Link to="/yanlis-havuzu" className="rounded-full bg-mercan px-5 py-2.5 text-sm font-semibold text-mercan-ink">
            Yanlış havuzu
          </Link>
        </div>
      </div>
    );
  }

  const question = questions[index];
  const revealed = selected !== undefined;
  const isFlagged = flagged.includes(question.id);

  return (
    <div>
      {/* ilerleme çubuğu */}
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-altin transition-all duration-500"
          style={{ width: `${(results.length / questions.length) * 100}%` }}
        />
      </div>

      <div className="mb-3 flex items-start justify-between gap-3">
        <QuestionPosition index={index} total={questions.length} subtopic={question.subtopic} />
        <button
          type="button"
          onClick={() => onToggleFlag(question.id)}
          aria-pressed={isFlagged}
          aria-label={isFlagged ? 'İşareti kaldır' : 'Soruyu işaretle'}
          className={isFlagged ? 'text-altin' : 'text-muted hover:text-ink'}
        >
          <Bookmark size={20} fill={isFlagged ? 'currentColor' : 'none'} />
        </button>
      </div>

      <QuestionCard
        question={question}
        selected={selected}
        revealed={revealed}
        onSelect={(choice) => {
          if (revealed) return;
          setSelected(choice);
          const isCorrect = choice === question.correct;
          setResults((r) => [...r, isCorrect]);
          onAnswer(question, choice, isCorrect);
        }}
      />

      {revealed && (
        <button
          type="button"
          onClick={() => {
            setSelected(undefined);
            setIndex((i) => Math.min(i + 1, questions.length - 1));
          }}
          className="mt-5 w-full rounded-(--radius-card) bg-mercan px-5 py-4 font-semibold text-mercan-ink transition-transform active:scale-[0.98]"
        >
          {results.length === questions.length ? 'Sonucu Gör' : 'Sonraki Soru'}
        </button>
      )}
    </div>
  );
}

function QuestionPosition({ index, total, subtopic }: { index: number; total: number; subtopic: string }) {
  return (
    <div>
      <p className="text-xs tracking-widest text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
        SORU {index + 1} / {total}
      </p>
      <p className="mt-0.5 text-xs text-kobalt">{subtopic}</p>
    </div>
  );
}
