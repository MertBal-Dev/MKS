/**
 * Soru ailelerinde kalite denetimi.
 *
 *   node scripts/aile-kalite.mjs
 *
 * Yapısal (otomatik) kontroller — model yargısına gerek yok:
 *   - Her sorunun 5 şıkkı, her şıkkın açıklaması var mı
 *   - Doğru cevap gerçekten şıklar arasında mı
 *   - Şıklar birbirini tekrar ediyor mu (soruyu çözümsüz bırakır)
 *   - Çeldiriciler makul mü: uzunluk dengesi (doğru şık en uzunsa ipucu verir)
 *   - "Hepsi/hiçbiri" gibi tembel çeldiriciler
 *   - Doğru cevap dağılımı A-E dengeli mi
 *   - Türev, kaynak soruyu tekrar ediyor mu
 *   - Soru tipi çeşitliliği (klasik / olumsuz / eşleştirme)
 *   - Her ailenin anlatımı (özet) var mı ve yeterince uzun mu
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const DIZIN = 'src/content/aileler';
if (!existsSync(DIZIN)) {
  console.error('Aile dosyası yok.');
  process.exit(1);
}

const HARF = ['A', 'B', 'C', 'D', 'E'];
const trKucuk = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFC').replace(/̇/g, '');

const TEMBEL = /hepsi|hiçbiri|yukarıdakilerin tümü|yalnız i+$|verilenlerin hepsi/i;

const aileler = readdirSync(DIZIN)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(`${DIZIN}/${f}`, 'utf8')));

const sorunlar = [];
const dagilim = {};
const tipler = { klasik: 0, olumsuz: 0, eslestirme: 0, kronoloji: 0 };
let toplamSoru = 0;
let turevSoru = 0;
let ozetKelime = 0;
let aciklamaKelime = 0;
let dogruEnUzun = 0;
let tembelCeldirici = 0;

function soruDenetle(s, ailerId, etiket, sadeceTurev) {
  toplamSoru++;
  if (sadeceTurev) turevSoru++;
  const ekle = (m) => sorunlar.push(`${ailerId} · ${etiket}: ${m}`);

  if (!Array.isArray(s.choices) || s.choices.length < 4) {
    ekle(`şık sayısı ${s.choices?.length}`);
    return;
  }
  if (sadeceTurev && s.choices.length !== 5) ekle(`türev ${s.choices.length} şıklı (5 olmalı)`);

  // Harf sırası
  if (s.choices.some((c, i) => c.id !== HARF[i])) ekle('şık harfleri sırasız');

  // Açıklama kapsamı
  const eksikAciklama = s.choices.filter((c) => !c.explanation || c.explanation.trim().length < 10);
  if (eksikAciklama.length) ekle(`${eksikAciklama.length} şıkta açıklama yok/çok kısa`);
  for (const c of s.choices) aciklamaKelime += (c.explanation ?? '').split(/\s+/).length;

  // Doğru cevap tutarlılığı
  const dogru = s.choices.find((c) => c.id === s.correct);
  if (!dogru) { ekle('doğru cevap şıklarda yok'); return; }
  dagilim[s.correct] = (dagilim[s.correct] ?? 0) + 1;

  // Tekrar eden şık — soruyu çözümsüz bırakır
  const metinler = s.choices.map((c) => trKucuk(c.text.trim()));
  if (new Set(metinler).size !== metinler.length) ekle('tekrar eden şık metni');

  // Tembel çeldirici
  if (s.choices.some((c) => TEMBEL.test(c.text))) { tembelCeldirici++; }

  // Uzunluk ipucu: doğru şık belirgin biçimde en uzunsa öğrenci okumadan bulur
  const uz = s.choices.map((c) => c.text.length);
  const enUzun = Math.max(...uz);
  const ortDiger = (uz.reduce((a, b) => a + b, 0) - dogru.text.length) / (uz.length - 1);
  if (dogru.text.length === enUzun && dogru.text.length > ortDiger * 1.8 && dogru.text.length > 25) {
    dogruEnUzun++;
  }

  // Boş / çok kısa gövde
  if (!s.stem || s.stem.trim().length < 15) ekle('soru gövdesi çok kısa');

  // Tip sınıflandırma
  const g = trKucuk(s.stem);
  if (/değildir|yanlıştır|olamaz|hangisi yanlış/.test(g)) tipler.olumsuz++;
  else if (/eşleştir/.test(g)) tipler.eslestirme++;
  else if (/sıralama|kronoloj|önce mi|hangisi daha/.test(g)) tipler.kronoloji++;
  else tipler.klasik++;
}

for (const a of aileler) {
  if (!a.ozet || a.ozet.trim().length < 60) sorunlar.push(`${a.id}: anlatım (özet) yok veya çok kısa`);
  else ozetKelime += a.ozet.split(/\s+/).length;

  if (!a.cekirdek?.trim()) sorunlar.push(`${a.id}: çekirdek bilgi yok`);

  soruDenetle(a.kaynak.soru, a.id, 'kaynak', false);
  a.turevler.forEach((t, i) => soruDenetle(t, a.id, `türev${i + 1}`, true));

  // Türev kaynağı tekrar ediyor mu
  const kg = trKucuk(a.kaynak.soru.stem).replace(/\s+/g, ' ').trim();
  for (const t of a.turevler) {
    if (trKucuk(t.stem).replace(/\s+/g, ' ').trim() === kg) sorunlar.push(`${a.id}: türev kaynak soruyu tekrarlıyor`);
  }
}

const n = Object.values(dagilim).reduce((a, b) => a + b, 0) || 1;
const beklenen = n / 5;
const sapma = HARF.map((h) => Math.abs((dagilim[h] ?? 0) - beklenen) / beklenen);
const enBuyukSapma = Math.round(Math.max(...sapma) * 100);

console.log('=== SORULARLA ÖĞRENİYORUM — KALİTE RAPORU ===\n');
console.log(`  aile              : ${aileler.length}`);
console.log(`  toplam soru       : ${toplamSoru}  (kaynak ${aileler.length} + türev ${turevSoru})`);
console.log(`  ortalama anlatım  : ${Math.round(ozetKelime / (aileler.length || 1))} kelime`);
console.log(`  ortalama şık açıklaması: ${Math.round(aciklamaKelime / (toplamSoru * 5 || 1))} kelime`);
console.log('');
console.log('  DOĞRU CEVAP DAĞILIMI');
console.log('   ', HARF.map((h) => `${h}:${dagilim[h] ?? 0}`).join('  '), `— en büyük sapma %${enBuyukSapma}`);
console.log('');
console.log('  SORU TİPİ DAĞILIMI');
console.log(`    klasik ${tipler.klasik} · olumsuz ${tipler.olumsuz} · eşleştirme ${tipler.eslestirme} · kronoloji ${tipler.kronoloji}`);
console.log(`    çeşitlilik: %${Math.round(((toplamSoru - tipler.klasik) / (toplamSoru || 1)) * 100)} klasik dışı`);
console.log('');
console.log('  ÇELDİRİCİ SAĞLIĞI');
console.log(`    doğru şık belirgin biçimde en uzun : ${dogruEnUzun} soru (ipucu sızdırır)`);
console.log(`    tembel çeldirici (hepsi/hiçbiri)   : ${tembelCeldirici} soru`);
console.log('');
console.log(`  YAPISAL SORUN: ${sorunlar.length}`);
sorunlar.slice(0, 20).forEach((s) => console.log(`    ✗ ${s}`));
if (sorunlar.length > 20) console.log(`    … ve ${sorunlar.length - 20} tane daha`);
