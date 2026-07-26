/**
 * Üretilen soru ailelerini doğrular ve uygulamaya alır.
 *
 *   node scripts/aile-uygula.mjs [--kuru]
 *
 * scripts/aileler/*.json → src/content/aileler/*.json
 * Şemaya uymayan aile kopyalanmaz; hangi ailenin neden elendiği yazdırılır.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';

const kuru = process.argv.includes('--kuru');
const KAYNAK = 'scripts/aileler';
const HEDEF = 'src/content/aileler';
const HARF = ['A', 'B', 'C', 'D', 'E'];

if (!existsSync(KAYNAK)) {
  console.error(`${KAYNAK} yok — önce aile-uret.mjs çalıştır.`);
  process.exit(1);
}

function soruDenetle(s, etiket) {
  const h = [];
  if (!s?.id) h.push(`${etiket}: id yok`);
  if (!s?.stem?.trim()) h.push(`${etiket}: gövde yok`);
  if (!Array.isArray(s?.choices) || s.choices.length < 4 || s.choices.length > 5) {
    h.push(`${etiket}: şık sayısı ${s?.choices?.length}`);
  } else {
    if (s.choices.some((c, i) => c.id !== HARF[i])) h.push(`${etiket}: şık sırası bozuk`);
    if (s.choices.some((c) => !c.text?.trim())) h.push(`${etiket}: boş şık`);
    if (s.choices.some((c) => !c.explanation?.trim())) h.push(`${etiket}: açıklamasız şık`);
    const metinler = s.choices.map((c) => c.text.trim().toLowerCase());
    if (new Set(metinler).size !== metinler.length) h.push(`${etiket}: tekrar eden şık`);
  }
  if (!HARF.includes(s?.correct)) h.push(`${etiket}: correct geçersiz`);
  else if (!s.choices?.some((c) => c.id === s.correct)) h.push(`${etiket}: correct şıklarda yok`);
  return h;
}

let toplamKabul = 0;
let toplamRet = 0;
const dagilim = {};

if (!kuru && !existsSync(HEDEF)) mkdirSync(HEDEF, { recursive: true });

for (const dosya of readdirSync(KAYNAK).filter((f) => f.endsWith('.json'))) {
  const aileler = JSON.parse(readFileSync(`${KAYNAK}/${dosya}`, 'utf8'));
  const kabul = [];
  const ret = [];

  for (const a of aileler) {
    const h = [];
    if (!a?.id) h.push('aile id yok');
    if (!a?.topicId) h.push('topicId yok');
    if (!a?.cekirdek?.trim()) h.push('çekirdek yok');
    if (!a?.ozet?.trim()) h.push('özet yok');
    if (!a?.kaynak?.examTitle) h.push('kaynak sınav yok');
    h.push(...soruDenetle(a?.kaynak?.soru, 'kaynak'));

    if (!Array.isArray(a?.turevler) || a.turevler.length === 0) h.push('türev yok');
    else a.turevler.forEach((t, i) => h.push(...soruDenetle(t, `türev${i + 1}`)));

    // Türev, kaynak soruyu tekrar etmemeli
    const kaynakGovde = (a?.kaynak?.soru?.stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (a?.turevler?.some((t) => (t.stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim() === kaynakGovde)) {
      h.push('türev kaynak soruyu tekrarlıyor');
    }

    if (h.length) ret.push({ id: a?.id ?? '?', h });
    else {
      kabul.push(a);
      for (const t of a.turevler) dagilim[t.correct] = (dagilim[t.correct] ?? 0) + 1;
    }
  }

  if (!kuru) writeFileSync(`${HEDEF}/${dosya}`, `${JSON.stringify(kabul, null, 2)}\n`, 'utf8');

  toplamKabul += kabul.length;
  toplamRet += ret.length;
  console.log(`${dosya.replace('.json', '').padEnd(24)} kabul ${String(kabul.length).padStart(2)}  elenen ${ret.length}`);
  for (const r of ret) console.log(`     ✗ ${r.id}: ${r.h.slice(0, 3).join(', ')}`);
}

console.log(`\n${kuru ? '[KURU] ' : ''}toplam ${toplamKabul} aile, ${toplamKabul * 3} civarı türev soru; elenen ${toplamRet}`);
console.log('türev doğru dağılımı:', HARF.filter((h) => dagilim[h]).map((h) => `${h}:${dagilim[h]}`).join('  '));
