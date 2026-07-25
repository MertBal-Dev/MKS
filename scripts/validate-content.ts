/**
 * İçerik doğrulayıcı: src/content altındaki tüm JSON dosyalarını zod
 * şemalarıyla parse eder ve çapraz kuralları denetler.
 * Kullanım: npm run validate:content
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { QuestionSchema, TopicSchema, ExamSchema } from '../src/lib/schemas';

const CONTENT_DIR = path.resolve(import.meta.dirname, '../src/content');
const errors: string[] = [];
const seenQuestionIds = new Map<string, string>();
const seenFlashcardIds = new Map<string, string>();

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
}

function parseFile<T>(file: string, parse: (raw: unknown) => T): T | null {
  const rel = path.relative(CONTENT_DIR, file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (e) {
    errors.push(`${rel}: JSON parse hatası — ${(e as Error).message}`);
    return null;
  }
  try {
    return parse(raw);
  } catch (e) {
    errors.push(`${rel}: şema hatası — ${(e as Error).message.split('\n').slice(0, 6).join(' ')}`);
    return null;
  }
}

function checkQuestionIds(questions: { id: string; choices: { explanation: string }[] }[], source: string) {
  for (const q of questions) {
    const prev = seenQuestionIds.get(q.id);
    if (prev) errors.push(`Soru id çakışması: '${q.id}' hem ${prev} hem ${source} içinde`);
    else seenQuestionIds.set(q.id, source);
  }
}

// Konular
let topicCount = 0;
for (const file of listJson(path.join(CONTENT_DIR, 'topics'))) {
  const topic = parseFile(file, (raw) => TopicSchema.parse(raw));
  if (!topic) continue;
  topicCount++;
  const expected = path.basename(file, '.json');
  if (topic.id !== expected) errors.push(`${expected}.json: dosya adı ile topic.id ('${topic.id}') uyuşmuyor`);
  for (const card of topic.flashcards) {
    const prev = seenFlashcardIds.get(card.id);
    if (prev) errors.push(`Kart id çakışması: '${card.id}' hem ${prev} hem ${topic.id} içinde`);
    else seenFlashcardIds.set(card.id, topic.id);
  }
}

// Soru bankası
let bankCount = 0;
for (const file of listJson(path.join(CONTENT_DIR, 'questions'))) {
  const expected = path.basename(file, '.json');
  const questions = parseFile(file, (raw) => {
    if (!Array.isArray(raw)) throw new Error('dizi bekleniyordu');
    return raw.map((q, i) => {
      try {
        return QuestionSchema.parse(q);
      } catch (e) {
        throw new Error(`soru #${i + 1} (${(q as { id?: string })?.id ?? 'id yok'}): ${(e as Error).message.split('\n')[0]}`);
      }
    });
  });
  if (!questions) continue;
  bankCount += questions.length;
  checkQuestionIds(questions, `questions/${expected}`);
  for (const q of questions) {
    if (q.topicId !== expected) errors.push(`questions/${expected}.json: '${q.id}' topicId='${q.topicId}' — dosya adıyla uyuşmuyor`);
  }
}

// Sınavlar
let examCount = 0;
for (const file of listJson(path.join(CONTENT_DIR, 'exams'))) {
  const exam = parseFile(file, (raw) => ExamSchema.parse(raw));
  if (!exam) continue;
  examCount++;
  const expected = path.basename(file, '.json');
  if (exam.id !== expected) errors.push(`exams/${expected}.json: dosya adı ile exam.id ('${exam.id}') uyuşmuyor`);
  checkQuestionIds(exam.questions, `exams/${exam.id}`);
}

if (errors.length > 0) {
  console.error(`\n✗ İçerik doğrulaması BAŞARISIZ (${errors.length} hata):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(
  `✓ İçerik doğrulandı: ${topicCount} konu, ${bankCount} banka sorusu, ${examCount} sınav, ${seenFlashcardIds.size} kart.`,
);
