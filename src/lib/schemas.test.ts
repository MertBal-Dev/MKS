import { describe, expect, it } from 'vitest';
import { QuestionSchema, TopicSchema, ExamSchema } from './schemas';
import { TOPICS, TOPIC_IDS } from './constants';

const validQuestion = {
  id: 'arkeoloji-mitoloji-001',
  topicId: 'arkeoloji-mitoloji',
  subtopic: 'Yunan mitolojisi',
  difficulty: 2,
  stem: 'Zeus ile Leto\'nun ikiz çocukları aşağıdakilerden hangileridir?',
  choices: [
    { id: 'A', text: 'Apollon ve Artemis', explanation: 'Doğru — Leto, Delos adasında Apollon ve Artemis\'i doğurmuştur.' },
    { id: 'B', text: 'Ares ve Athena', explanation: 'Ares, Zeus ile Hera\'nın oğludur; Athena Zeus\'un başından doğmuştur.' },
    { id: 'C', text: 'Hermes ve Dionysos', explanation: 'Hermes\'in annesi Maia, Dionysos\'un annesi Semele\'dir.' },
    { id: 'D', text: 'Kastor ve Polluks', explanation: 'Dioskurlar\'ın annesi Leda\'dır, Leto değil.' },
  ],
  correct: 'A',
};

describe('QuestionSchema', () => {
  it('geçerli soruyu kabul eder', () => {
    expect(QuestionSchema.parse(validQuestion)).toMatchObject({ id: 'arkeoloji-mitoloji-001' });
  });

  it('3 şıklı soruyu reddeder', () => {
    const q = { ...validQuestion, choices: validQuestion.choices.slice(0, 3) };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });

  it('şık sırası A-D dışıysa reddeder', () => {
    const q = { ...validQuestion, choices: [...validQuestion.choices].reverse() };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });

  it('correct mevcut olmayan şıksa reddeder', () => {
    const q = { ...validQuestion, correct: 'E' };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });

  it('açıklamasız şıkkı reddeder', () => {
    const q = {
      ...validQuestion,
      choices: validQuestion.choices.map((c, i) => (i === 1 ? { ...c, explanation: '' } : c)),
    };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });

  it('geçersiz topicId reddeder', () => {
    const q = { ...validQuestion, topicId: 'uzay-tarihi' };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });
});

describe('TopicSchema', () => {
  const validTopic = {
    id: 'muzecilik',
    fullNotes: [
      { heading: 'Müzeciliğin Tarihçesi', markdown: 'Osman Hamdi Bey…' },
      { heading: 'Müze Türleri', markdown: 'Arkeoloji müzeleri…' },
      { heading: 'Eser Kaçakçılığı', markdown: '1970 UNESCO Sözleşmesi…' },
    ],
    shortNotes: 'Sınav sabahı özeti…',
    tricks: ['Tuzak 1', 'Tuzak 2', 'Tuzak 3', 'Tuzak 4', 'Tuzak 5'],
    flashcards: Array.from({ length: 20 }, (_, i) => ({
      id: `muzecilik-k${String(i + 1).padStart(3, '0')}`,
      front: `Soru ${i + 1}`,
      back: `Cevap ${i + 1}`,
    })),
  };

  it('geçerli konuyu kabul eder', () => {
    expect(TopicSchema.parse(validTopic).id).toBe('muzecilik');
  });

  it('3 bölümden az fullNotes reddeder', () => {
    expect(() => TopicSchema.parse({ ...validTopic, fullNotes: validTopic.fullNotes.slice(0, 2) })).toThrow();
  });
});

describe('ExamSchema', () => {
  const mkQuestion = (n: number) => ({
    ...validQuestion,
    id: `deneme-1-${String(n).padStart(3, '0')}`,
  });

  it('100 soruluk denemeyi kabul eder', () => {
    const exam = {
      id: 'deneme-1',
      title: 'Deneme Sınavı 1',
      kind: 'deneme',
      questions: Array.from({ length: 100 }, (_, i) => mkQuestion(i + 1)),
    };
    expect(ExamSchema.parse(exam).questions).toHaveLength(100);
  });

  it('99 soruluk denemeyi reddeder', () => {
    const exam = {
      id: 'deneme-1',
      title: 'Deneme Sınavı 1',
      kind: 'deneme',
      questions: Array.from({ length: 99 }, (_, i) => mkQuestion(i + 1)),
    };
    expect(() => ExamSchema.parse(exam)).toThrow();
  });

  it('çıkmış derlemede 50 soru altını reddeder', () => {
    const exam = {
      id: 'cikmis-x',
      title: 'Çıkmış',
      kind: 'cikmis',
      questions: Array.from({ length: 49 }, (_, i) => mkQuestion(i + 1)),
    };
    expect(() => ExamSchema.parse(exam)).toThrow();
  });
});

describe('TOPICS', () => {
  it('12 konu vardır ve examWeight toplamı 100 eder', () => {
    expect(TOPIC_IDS).toHaveLength(12);
    const total = TOPIC_IDS.reduce((sum, id) => sum + TOPICS[id].examWeight, 0);
    expect(total).toBe(100);
  });
});
