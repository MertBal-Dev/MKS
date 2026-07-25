/**
 * Soru bankasındaki şıkları karıştırır.
 *
 * Sorun: 480 sorunun 471'inde doğru cevap A idi. Bu hâliyle öğrenci soruyu
 * okumadan hep A işaretleyerek %98 alıyor, istatistikleri anlamını yitiriyor
 * ve gerçek sınavda hazırlıksız kalıyordu.
 *
 * Açıklamalar konuma atıf yapmıyor ("A şıkkı..." gibi ifade yok), bu yüzden
 * metin-açıklama çiftleri bozulmadan yeniden sıralanabilir.
 *
 * Karıştırma soru id'sinden türetilen tohumla yapılır: aynı girdi her zaman
 * aynı çıktıyı verir, tekrar çalıştırmak sonucu değiştirmez.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** id metninden 32-bit tohum (FNV-1a). */
function seedOf(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const dir = 'src/content/questions';
let total = 0;
let moved = 0;
const dist = {};

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = `${dir}/${file}`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const list = Array.isArray(data) ? data : data.questions;

  for (const q of list) {
    const rng = mulberry32(seedOf(q.id));
    const correctText = q.choices.find((c) => c.id === q.correct)?.text;

    // Şıkları id'lerinden ayır, karıştır, sırayla yeniden harflendir
    const bodies = shuffled(
      q.choices.map((c) => ({ text: c.text, explanation: c.explanation })),
      rng,
    );

    q.choices = bodies.map((b, i) => ({ id: LETTERS[i], text: b.text, explanation: b.explanation }));

    const next = q.choices.find((c) => c.text === correctText);
    if (!next) throw new Error(`${q.id}: doğru şık kaybedildi`);
    if (next.id !== q.correct) moved++;
    q.correct = next.id;

    dist[q.correct] = (dist[q.correct] ?? 0) + 1;
    total++;
  }

  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log(`${total} soru işlendi, ${moved} tanesinin doğru şıkkı yer değiştirdi.`);
console.log(
  'Yeni dağılım:',
  LETTERS.filter((l) => dist[l])
    .map((l) => `${l}: ${dist[l]} (%${Math.round((dist[l] / total) * 100)})`)
    .join('  '),
);
