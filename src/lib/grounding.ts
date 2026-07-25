import { topics } from '@/content/index';
import { TOPICS, type TopicId } from '@/lib/constants';

/**
 * Serbest sohbet için hafif konu getirimi.
 * Kullanıcının sorusunu uygulamadaki doğrulanmış notlarla eşleştirir ve
 * en ilgili iki konunun özet + tuzak metnini bağlam olarak döndürür.
 * Amaç: modelin kendi hafızasından yanlış olgu üretmesini engellemek
 * (ör. "ilk özel müze" sorusunda doğru cevabın not içinde bulunması).
 */

const STOPWORDS = new Set([
  'bir', 'bu', 'şu', 'için', 'ile', 'ama', 've', 'veya', 'nedir', 'kimdir', 'nerede',
  'hangi', 'hangisi', 'ne', 'nasıl', 'niye', 'neden', 'mı', 'mi', 'mu', 'mü', 'da', 'de',
  'çok', 'daha', 'en', 'olan', 'olarak', 'kaç', 'yılında', 'bana', 'misin', 'musun',
]);

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Bir konunun aranabilir metni: başlık + kısa anlatım + tuzaklar. */
function topicHaystack(topicId: TopicId): string {
  const pack = topics.find((t) => t.id === topicId);
  if (!pack) return TOPICS[topicId].title;
  return [TOPICS[topicId].title, pack.shortNotes, pack.tricks.join('\n')].join('\n');
}

export interface GroundingHit {
  topicId: TopicId;
  score: number;
}

/** Soruya en çok benzeyen konuları puanlar. */
export function rankTopics(question: string): GroundingHit[] {
  const words = tokenize(question);
  if (words.length === 0) return [];

  return topics
    .map((pack) => {
      const hay = topicHaystack(pack.id as TopicId).toLocaleLowerCase('tr-TR');
      let score = 0;
      for (const w of words) {
        // Kelime kökünü de yakala: "müze" → "müzesi", "müzecilik"
        const stem = w.length > 5 ? w.slice(0, Math.max(4, w.length - 2)) : w;
        if (hay.includes(stem)) score += 1;
      }
      return { topicId: pack.id as TopicId, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Soruya en uygun 2 konunun doğrulanmış notlarını tek metinde toplar.
 * Eşleşme yoksa boş döner; o durumda model kendi bilgisini kullanır.
 */
export function buildGrounding(question: string): string | undefined {
  const hits = rankTopics(question).slice(0, 2);
  if (hits.length === 0) return undefined;

  const blocks = hits.map(({ topicId }) => {
    const pack = topics.find((t) => t.id === topicId);
    if (!pack) return '';
    return [
      `## ${TOPICS[topicId].title}`,
      pack.shortNotes,
      '### Bilinen tuzaklar',
      pack.tricks.map((t) => `- ${t}`).join('\n'),
    ].join('\n');
  });

  return blocks.filter(Boolean).join('\n\n');
}
