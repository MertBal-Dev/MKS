/**
 * Konu anlatımını derinleştirir.
 *
 *   node scripts/apply-topic.mjs <topicId>
 *
 * scripts/topics/<topicId>.mjs dosyasından { fullNotes, shortNotes?, tricks?, flashcards? }
 * okur ve src/content/topics/<topicId>.json içine yazar. Verilmeyen alanlara dokunmaz —
 * mevcut kartlar ve tuzaklar korunur.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const id = process.argv[2];
if (!id) {
  console.error('Kullanım: node scripts/apply-topic.mjs <topicId>');
  process.exit(1);
}

const target = resolve(`src/content/topics/${id}.json`);
const source = resolve(`scripts/topics/${id}.mjs`);

const pack = JSON.parse(await readFile(target, 'utf8'));
const next = (await import(pathToFileURL(source).href)).default;

const before = pack.fullNotes.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);

if (next.fullNotes) pack.fullNotes = next.fullNotes;
if (next.shortNotes) pack.shortNotes = next.shortNotes;
if (next.tricks) pack.tricks = next.tricks;
if (next.flashcards) pack.flashcards = [...pack.flashcards, ...next.flashcards];

const after = pack.fullNotes.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);

await writeFile(target, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');

console.log(
  `${id.padEnd(24)} bölüm ${String(pack.fullNotes.length).padStart(2)}  ` +
    `kelime ${before} → ${after}  (+${Math.round(((after - before) / before) * 100)}%)  ` +
    `tuzak ${pack.tricks.length}  kart ${pack.flashcards.length}`,
);
