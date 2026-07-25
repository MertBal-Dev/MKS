import { AlertTriangle, Check, X } from 'lucide-react';
import type { ChoiceId, Question } from '@/lib/types';

interface Props {
  question: Question;
  /** Seçilen şık (varsa). */
  selected?: ChoiceId;
  /** true → doğru/yanlış ve açıklamalar gösterilir (pratik modu). */
  revealed: boolean;
  onSelect: (choice: ChoiceId) => void;
  /** Soru numarası etiketi, ör. "7 / 10". */
  positionLabel?: string;
}

/** Tek sorunun gövdesi + şıklar. Pratik ve sınav modlarının ortak parçası. */
export function QuestionCard({ question, selected, revealed, onSelect, positionLabel }: Props) {
  return (
    <div>
      <div className="mb-4">
        {positionLabel && (
          <p className="mb-2 text-xs tracking-widest text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {positionLabel}
          </p>
        )}
        <p className="text-[1.05rem] leading-relaxed">{question.stem}</p>
      </div>

      <div className="space-y-2.5" role="radiogroup" aria-label="Cevap şıkları">
        {question.choices.map((choice) => {
          const isSelected = selected === choice.id;
          const isCorrect = question.correct === choice.id;

          let cls = 'border-line bg-surface hover:bg-raised';
          if (revealed && isCorrect) cls = 'border-turkuaz bg-turkuaz/10 glaze';
          else if (revealed && isSelected && !isCorrect) cls = 'border-kizil bg-kizil/10 shake';
          else if (!revealed && isSelected) cls = 'border-mercan bg-mercan/10';

          return (
            <div key={choice.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={revealed}
                onClick={() => onSelect(choice.id)}
                className={[
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors disabled:cursor-default',
                  cls,
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                    revealed && isCorrect
                      ? 'border-turkuaz bg-turkuaz text-ground'
                      : revealed && isSelected && !isCorrect
                        ? 'border-kizil bg-kizil text-ground'
                        : 'border-line text-muted',
                  ].join(' ')}
                  aria-hidden
                >
                  {revealed && isCorrect ? <Check size={14} /> : revealed && isSelected && !isCorrect ? <X size={14} /> : choice.id}
                </span>
                <span className="leading-snug">{choice.text}</span>
              </button>

              {revealed && (isCorrect || isSelected) && (
                <p
                  className={[
                    'mx-1 mt-1.5 rounded-lg px-3 py-2 text-sm leading-relaxed',
                    isCorrect ? 'bg-turkuaz/8 text-turkuaz' : 'bg-kizil/8 text-kizil',
                  ].join(' ')}
                >
                  {choice.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {revealed && (
        <details className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer text-muted">Tüm şıkların açıklamasını gör</summary>
          <ul className="mt-2 space-y-2">
            {question.choices.map((c) => (
              <li key={c.id} className="leading-relaxed">
                <strong className={c.id === question.correct ? 'text-turkuaz' : 'text-muted'}>{c.id})</strong>{' '}
                {c.explanation}
              </li>
            ))}
          </ul>
        </details>
      )}

      {revealed && question.trick && (
        <div className="mt-3 flex gap-3 rounded-xl border border-altin/40 bg-altin/8 p-4 text-sm">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-altin" aria-hidden />
          <p className="leading-relaxed">
            <strong className="text-altin">Tuzak: </strong>
            {question.trick}
          </p>
        </div>
      )}
    </div>
  );
}
