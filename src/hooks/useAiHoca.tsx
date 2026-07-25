import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { TOPICS } from '@/lib/constants';
import { buildGrounding } from '@/lib/grounding';
import type { ChoiceId, Question } from '@/lib/types';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  pending?: boolean;
}

export interface AiQuestionContext {
  stem: string;
  choices: { id: string; text: string }[];
  correct: string;
  selected?: string;
  topicTitle: string;
  subtopic?: string;
}

export interface AiTopicContext {
  topicTitle: string;
  sectionHeading?: string;
  grounding?: string;
  tricks?: string[];
  examWeight?: number;
}

interface AiHocaState {
  open: boolean;
  title: string;
  question?: AiQuestionContext;
  topic?: AiTopicContext;
  turns: ChatTurn[];
  loading: boolean;
  error: string | null;
}

interface AiHocaApi extends AiHocaState {
  /** Bir soruyu AI Hoca'ya taşır ve yapılandırılmış açıklamayı başlatır. */
  askQuestion: (question: Question, selected?: ChoiceId) => void;
  /** Konu anlatımını (ya da tek bir bölümünü) derinleştirir. */
  expandTopic: (topic: AiTopicContext) => void;
  /** Konu bağlamıyla sohbet açar (derinleştirme metni üretmeden). */
  openTopicChat: (topic: AiTopicContext) => void;
  /** Soru bağlamı olmadan serbest sohbet açar. */
  openFreeChat: (seed?: string) => void;
  send: (text: string) => void;
  close: () => void;
}

const Ctx = createContext<AiHocaApi | null>(null);

/** Aynı soru için tekrar istek atmamak adına oturum içi önbellek. */
const cacheKey = (stem: string) => `mks:ai:${stem.slice(0, 80)}`;

function toContext(question: Question, selected?: ChoiceId): AiQuestionContext {
  return {
    stem: question.stem,
    choices: question.choices.map((c) => ({ id: c.id, text: c.text })),
    correct: question.correct,
    selected,
    topicTitle: TOPICS[question.topicId].title,
    subtopic: question.subtopic,
  };
}

/**
 * Arıza sebebini ayırt eden mesaj. Tek bir "yanıt veremiyor" metni, API'nin hiç
 * bulunmadığı durumla kimlik bilgisi hatasını aynı gösterip teşhisi zorlaştırıyordu.
 */
function hataMesaji(status: number): string {
  if (status === 404)
    return 'AI Hoca bu adreste çalışmıyor. Statik önizlemede (vite preview) sunucu fonksiyonu bulunmaz — geliştirme sunucusunu veya yayındaki siteyi kullan.';
  if (status === 502 || status === 500)
    return 'AI Hoca sunucuya bağlanamadı. Vertex AI kimlik bilgileri (GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GOOGLE_CREDENTIALS_JSON) eksik veya hatalı olabilir.';
  if (status === 400) return 'AI Hoca isteği anlayamadı. Sayfayı yenileyip tekrar dene.';
  if (status === 429) return 'Çok fazla istek gönderildi. Birkaç saniye sonra tekrar dene.';
  return 'AI Hoca şu an yanıt veremiyor. İnternet bağlantını kontrol edip tekrar dene.';
}

async function callApi(payload: unknown): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/ai-hoca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Ağa ulaşılamadı. İnternet bağlantını kontrol et.');
  }
  if (!res.ok) throw new Error(hataMesaji(res.status));
  const data = (await res.json()) as { text: string };
  return data.text;
}

export function AiHocaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiHocaState>({
    open: false,
    title: 'AI Hoca',
    turns: [],
    loading: false,
    error: null,
  });

  const askQuestion = useCallback((question: Question, selected?: ChoiceId) => {
    const ctx = toContext(question, selected);
    const cached = sessionStorage.getItem(cacheKey(question.stem));

    setState({
      open: true,
      title: TOPICS[question.topicId].short,
      question: ctx,
      turns: cached ? [{ role: 'model', text: cached }] : [],
      loading: !cached,
      error: null,
    });

    if (cached) return;

    callApi({ mode: 'explain', question: ctx })
      .then((text) => {
        sessionStorage.setItem(cacheKey(question.stem), text);
        setState((s) => ({ ...s, turns: [{ role: 'model', text }], loading: false }));
      })
      .catch((e: Error) => setState((s) => ({ ...s, loading: false, error: e.message })));
  }, []);

  const expandTopic = useCallback((topic: AiTopicContext) => {
    const key = `mks:ai:konu:${topic.topicTitle}:${topic.sectionHeading ?? 'tam'}`;
    const cached = sessionStorage.getItem(key);

    setState({
      open: true,
      title: topic.sectionHeading ?? topic.topicTitle,
      question: undefined,
      topic,
      turns: cached ? [{ role: 'model', text: cached }] : [],
      loading: !cached,
      error: null,
    });

    if (cached) return;

    callApi({ mode: 'expand', topic })
      .then((text) => {
        sessionStorage.setItem(key, text);
        setState((s) => ({ ...s, turns: [{ role: 'model', text }], loading: false }));
      })
      .catch((e: Error) => setState((s) => ({ ...s, loading: false, error: e.message })));
  }, []);

  const openTopicChat = useCallback((topic: AiTopicContext) => {
    setState({
      open: true,
      title: topic.topicTitle,
      question: undefined,
      topic,
      turns: [],
      loading: false,
      error: null,
    });
  }, []);

  const openFreeChat = useCallback((seed?: string) => {
    setState({
      open: true,
      title: 'AI Hoca',
      question: undefined,
      topic: undefined,
      turns: seed ? [{ role: 'model', text: seed }] : [],
      loading: false,
      error: null,
    });
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setState((s) => {
      const turns: ChatTurn[] = [...s.turns, { role: 'user', text: trimmed }];
      const history = turns.map((t) => ({ role: t.role, text: t.text }));
      // Soru/konu bağlamı yoksa, uygulamanın doğrulanmış notlarından ilgili olanı ekle
      const grounding = !s.question && !s.topic ? buildGrounding(trimmed) : undefined;

      callApi({ mode: 'chat', question: s.question, topic: s.topic, grounding, messages: history })
        .then((answer) =>
          setState((cur) => ({ ...cur, turns: [...cur.turns, { role: 'model', text: answer }], loading: false })),
        )
        .catch((e: Error) => setState((cur) => ({ ...cur, loading: false, error: e.message })));

      return { ...s, turns, loading: true, error: null };
    });
  }, []);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const value = useMemo<AiHocaApi>(
    () => ({ ...state, askQuestion, expandTopic, openTopicChat, openFreeChat, send, close }),
    [state, askQuestion, expandTopic, openTopicChat, openFreeChat, send, close],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAiHoca(): AiHocaApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAiHoca, AiHocaProvider içinde kullanılmalı');
  return ctx;
}
