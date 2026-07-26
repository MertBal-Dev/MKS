/**
 * Üretilen soruları bankaya katar.
 *
 *   node scripts/merge-generated.mjs [--kuru]
 *
 * scripts/uretilen/*.json dosyalarını okur, son bir kez denetler ve
 * src/content/questions/<topicId>.json içine ekler. --kuru ile yalnızca rapor verir.
 *
 * Mevcut 480 soru 4 şıklı kalır; eklenenler 5 şıklıdır. Şema ikisini de kabul
 * ediyor (min 4, max 5) çünkü sınav Mart 2026'da 4'ten 5'e geçti — yani karışık
 * banka, sınavın kendi tarihini yansıtıyor.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const kuru = process.argv.includes('--kuru');
const KAYNAK = 'scripts/uretilen';
const HEDEF = 'src/content/questions';
const HARF = ['A', 'B', 'C', 'D', 'E'];

if (!existsSync(KAYNAK)) {
  console.error(`${KAYNAK} yok — önce generate-questions.mjs çalıştır.`);
  process.exit(1);
}

function denetle(q, mevcutIdler, mevcutGovdeler) {
  const s = [];
  if (!q.id || mevcutIdler.has(q.id)) s.push('id çakışması');
  if (!q.topicId) s.push('topicId yok');
  if (!q.subtopic?.trim()) s.push('subtopic yok');
  if (![1, 2, 3].includes(q.difficulty)) s.push('zorluk');
  if (!q.stem?.trim()) s.push('gövde yok');

  if (!Array.isArray(q.choices) || q.choices.length !== 5) s.push(`şık sayısı ${q.choices?.length}`);
  else {
    if (q.choices.some((c, i) => c.id !== HARF[i])) s.push('şık sırası');
    if (q.choices.some((c) => !c.text?.trim())) s.push('boş şık metni');
    if (q.choices.some((c) => !c.explanation?.trim())) s.push('boş şık açıklaması');
    // Aynı metinli iki şık soruyu çözümsüz bırakır
    const metinler = q.choices.map((c) => c.text.trim().toLowerCase());
    if (new Set(metinler).size !== metinler.length) s.push('tekrar eden şık');
  }

  if (!HARF.includes(q.correct)) s.push('correct geçersiz');
  else if (!q.choices?.some((c) => c.id === q.correct)) s.push('correct şıklarda yok');

  const anahtar = (q.stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (mevcutGovdeler.has(anahtar)) s.push('gövde tekrarı');

  return s;
}

let toplamEklenen = 0;
let toplamElenen = 0;
const dagilim = {};
const sikSayisi = {};

for (const dosya of readdirSync(KAYNAK).filter((f) => f.endsWith('.json'))) {
  const topicId = dosya.replace(/\.json$/, '');
  const hedefYol = `${HEDEF}/${dosya}`;
  if (!existsSync(hedefYol)) {
    console.log(`${topicId.padEnd(24)} ATLANDI — hedef dosya yok`);
    continue;
  }

  const uretilen = JSON.parse(readFileSync(`${KAYNAK}/${dosya}`, 'utf8'));
  const hedefHam = JSON.parse(readFileSync(hedefYol, 'utf8'));
  const liste = Array.isArray(hedefHam) ? hedefHam : hedefHam.questions;

  const mevcutIdler = new Set(liste.map((q) => q.id));
  const mevcutGovdeler = new Set(liste.map((q) => q.stem.toLowerCase().replace(/\s+/g, ' ').trim()));

  const kabul = [];
  const ret = [];
  for (const q of uretilen) {
    const sorun = denetle(q, mevcutIdler, mevcutGovdeler);
    if (sorun.length) {
      ret.push({ id: q.id, sorun });
    } else {
      mevcutIdler.add(q.id);
      mevcutGovdeler.add(q.stem.toLowerCase().replace(/\s+/g, ' ').trim());
      // Alan sırasını mevcut bankayla aynı tut
      kabul.push({
        id: q.id,
        topicId: q.topicId,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        stem: q.stem,
        choices: q.choices,
        correct: q.correct,
        ...(q.trick ? { trick: q.trick } : {}),
      });
      dagilim[q.correct] = (dagilim[q.correct] ?? 0) + 1;
    }
  }

  if (!kuru && kabul.length) {
    liste.push(...kabul);
    writeFileSync(hedefYol, `${JSON.stringify(hedefHam, null, 2)}\n`, 'utf8');
  }

  for (const q of liste) sikSayisi[q.choices.length] = (sikSayisi[q.choices.length] ?? 0) + 1;

  toplamEklenen += kabul.length;
  toplamElenen += ret.length;
  console.log(
    `${topicId.padEnd(24)} +${String(kabul.length).padStart(2)} eklendi  ` +
      `${String(ret.length).padStart(2)} elendi  → toplam ${liste.length}`,
  );
  for (const r of ret) console.log(`     ✗ ${r.id}: ${r.sorun.join(', ')}`);
}

console.log(`\n${kuru ? '[KURU ÇALIŞMA] ' : ''}eklenen ${toplamEklenen}, elenen ${toplamElenen}`);
console.log('doğru dağılımı :', HARF.filter((h) => dagilim[h]).map((h) => `${h}:${dagilim[h]}`).join('  '));
console.log('banka şık sayısı:', Object.entries(sikSayisi).map(([k, v]) => `${k} şık: ${v}`).join('  '));
