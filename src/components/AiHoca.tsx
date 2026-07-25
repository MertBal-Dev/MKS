import { useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { TOPICS } from '@/lib/constants';
import type { ChoiceId, Question } from '@/lib/types';

type Status = 'idle' | 'loading' | 'done' | 'error';

/** Aynı soru için tekrar istek atmamak adına oturum içi önbellek. */
function cacheKey(qId: string): string {
  return `mks:ai:${qId}`;
}

/**
 * AI Hoca: Vertex AI (Gemini) ile sorunun derinlemesine anlatımı.
 * Yalnızca cevap açıklandıktan sonra görünür; internet gerektirir.
 */
export function AiHoca({ question, selected }: { question: Question; selected?: ChoiceId }) {
  const cached = sessionStorage.getItem(cacheKey(question.id));
  const [status, setStatus] = useState<Status>(cached ? 'done' : 'idle');
  const [text, setText] = useState<string>(cached ?? '');

  const ask = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/ai-hoca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stem: question.stem,
          choices: question.choices.map((c) => ({ id: c.id, text: c.text })),
          correct: question.correct,
          selected,
          topicTitle: TOPICS[question.topicId].title,
          subtopic: question.subtopic,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { text: string };
      sessionStorage.setItem(cacheKey(question.id), data.text);
      setText(data.text);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={ask}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-kobalt/40 bg-kobalt/10 px-4 py-3 text-sm font-medium text-kobalt transition-colors hover:bg-kobalt/15"
      >
        <GraduationCap size={17} aria-hidden />
        AI Hoca'ya sor — derinlemesine anlatım
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-kobalt/30 bg-kobalt/5 px-4 py-4 text-sm text-kobalt">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        AI Hoca düşünüyor…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        AI Hoca'ya şu an ulaşılamıyor — internet bağlantını kontrol et.{' '}
        <button type="button" onClick={ask} className="text-kobalt underline underline-offset-2">
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-kobalt/30 bg-surface p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-widest text-kobalt">
        <GraduationCap size={14} aria-hidden /> AI HOCA
      </p>
      <MarkdownView>{text}</MarkdownView>
    </div>
  );
}
