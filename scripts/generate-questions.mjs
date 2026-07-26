/**
 * Doğrulanmış konu içeriğinden YENİ 5 şıklı soru üretir.
 *
 *   node scripts/generate-questions.mjs <topicId> [adet]
 *
 * Neden kendi içeriğimizden?
 * Gerçek çıkmış MKS sorularının tamamı (3 oturum) zaten uygulamada. Kalan
 * üçüncü taraf bankalar ya ücretli ya da "yapay zeka ile üretildi, doğruluğu
 * garanti edilmez" ibaresi taşıyor. Kendi notlarımız kaynaklarına karşı
 * doğrulandığı için sorunun dayanağı belli oluyor.
 *
 * Çıktı doğrudan bankaya YAZILMAZ; scripts/uretilen/<topicId>.json içine
 * konur, elle gözden geçirildikten sonra alınır.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';

const topicId = process.argv[2];
const adet = Number(process.argv[3] ?? 20);

if (!topicId) {
  console.error('Kullanım: node scripts/generate-questions.mjs <topicId> [adet]');
  process.exit(1);
}

const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));
const mevcut = JSON.parse(readFileSync(`src/content/questions/${topicId}.json`, 'utf8'));
const mevcutListe = Array.isArray(mevcut) ? mevcut : mevcut.questions;

const notlar = pack.fullNotes.map((s) => `## ${s.heading}\n${s.markdown}`).join('\n\n');
const tuzaklar = (pack.tricks ?? []).join('\n- ');
// Aynı bilgiyi ikinci kez sormamak için mevcut soru gövdelerini modele göster.
const mevcutGovdeler = mevcutListe.map((q) => `- ${q.stem}`).join('\n');

const TALIMAT = `Sen MKS (Turist Rehberliği Mesleğe Kabul Sınavı) için soru yazan deneyimli bir sınav hazırlayıcısısın.

MUTLAK KURALLAR:
1. Her sorunun cevabı SANA VERİLEN NOTLARDAN türetilebilmeli. Notlarda olmayan bir bilgiyi sorma.
   Emin olmadığın hiçbir şeyi soruya koyma.
2. Her soru TAM 5 ŞIKLI olacak (A, B, C, D, E). Çeldiriciler makul olmalı — saçma şıklar soruyu kolaylaştırır.
3. Doğru cevabı A'dan E'ye DENGELİ dağıt. Arka arkaya aynı harfi verme.
4. Aşağıdaki MEVCUT SORULAR listesindekilerle aynı bilgiyi sorma. Farklı açı, farklı ayrıntı seç.
5. Her şık için "explanation" yaz: doğru şıkta NEDEN doğru olduğu, yanlış şıklarda NEDEN yanlış olduğu
   (örn. "Bergama değil, Efes'tedir"). Tek cümle yeter ama bilgi versin.
6. "trick" alanına sınavda bu soruyu kaçırtan tuzağı yaz (örn. "Savaşı Muvatalli yaptı, antlaşmayı Hattuşili imzaladı").

SORU TİPİ DAĞILIMI — bu oranlara UY:
- %55 klasik ("Aşağıdakilerden hangisidir?")
- %20 OLUMSUZ ("Aşağıdakilerden hangisi ... DEĞİLDİR / YANLIŞTIR")
- %15 EŞLEŞTİRME ("hangi eşleştirme yanlıştır" veya "X - Y eşleştirmelerinden hangisi doğrudur")
- %10 KRONOLOJİ / SIRALAMA ("hangisi daha öncedir", "doğru sıralama hangisidir")

ZORLUK: %25 kolay (1), %50 orta (2), %25 zor (3).

ÇIKTI: Yalnızca şu şemada JSON dizisi döndür, başka metin yazma:
[
  {
    "subtopic": "Lidyalılar",
    "difficulty": 2,
    "stem": "soru metni",
    "choices": [
      {"id":"A","text":"...","explanation":"..."},
      {"id":"B","text":"...","explanation":"..."},
      {"id":"C","text":"...","explanation":"..."},
      {"id":"D","text":"...","explanation":"..."},
      {"id":"E","text":"...","explanation":"..."}
    ],
    "correct": "C",
    "trick": "..."
  }
]`;

const istem = `KONU: ${topicId}

DOĞRULANMIŞ NOTLAR (soruların tek dayanağı bunlar):
"""
${notlar.slice(0, 24000)}
"""

BİLİNEN TUZAKLAR:
- ${tuzaklar}

MEVCUT SORULAR (bunlarla aynı bilgiyi SORMA):
${mevcutGovdeler.slice(0, 6000)}

Yukarıdaki notlara dayanan {ADET} adet YENİ, 5 şıklı soru yaz.`;

/**
 * Kesilmiş JSON dizisinden tamamlanmış nesneleri kurtarır.
 * 5 şıklı ve açıklamalı sorular uzun; çıktı bütçesi zaman zaman ortada bitiyor.
 * Yarım kalan son nesneyi atıp gerisini kullanmak, partiyi tümden çöpe atmaktan iyi.
 */
function diziyiKurtar(temiz) {
  const bas = temiz.indexOf('[');
  if (bas < 0) return [];
  const govde = temiz.slice(bas);

  try {
    return JSON.parse(govde.slice(0, govde.lastIndexOf(']') + 1));
  } catch {
    /* kesilmiş; nesne nesne ayıkla */
  }

  const cikti = [];
  let derinlik = 0;
  let basla = -1;
  let stringde = false;
  let kacis = false;

  for (let i = 1; i < govde.length; i++) {
    const ch = govde[i];
    if (kacis) { kacis = false; continue; }
    if (ch === '\\') { kacis = true; continue; }
    if (ch === '"') { stringde = !stringde; continue; }
    if (stringde) continue;

    if (ch === '{') { if (derinlik === 0) basla = i; derinlik++; }
    else if (ch === '}') {
      derinlik--;
      if (derinlik === 0 && basla >= 0) {
        try { cikti.push(JSON.parse(govde.slice(basla, i + 1))); } catch { /* bozuk nesne */ }
        basla = -1;
      }
    }
  }
  return cikti;
}

async function partiUret(adetBu) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text: `${TALIMAT}\n\n${istem.replace('{ADET}', String(adetBu))}`,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return diziyiKurtar(temiz);
}

/** Tek istekte 8'den fazla soru istemek çıktı bütçesini taşırıyor. */
const PARTI = 8;

async function uret() {
  const hepsi = [];
  let kalan = adet;
  while (kalan > 0) {
    const bu = Math.min(PARTI, kalan);
    const parti = await partiUret(bu);
    if (parti.length === 0) break;
    hepsi.push(...parti);
    kalan -= parti.length;
    process.stdout.write(`  parti: +${parti.length} (toplam ${hepsi.length}/${adet})\n`);
  }
  return hepsi;
}

const HARF = ['A', 'B', 'C', 'D', 'E'];

/** Şemaya uymayan, eksik veya kopya soruları eler. */
function denetle(ham) {
  const kabul = [];
  const ret = [];
  const govdeler = new Set(mevcutListe.map((q) => q.stem.toLowerCase().replace(/\s+/g, ' ').trim()));

  for (const q of ham) {
    const sorun = [];
    if (!q.stem || typeof q.stem !== 'string') sorun.push('gövde yok');
    if (!Array.isArray(q.choices) || q.choices.length !== 5) sorun.push(`şık sayısı ${q.choices?.length}`);
    else {
      if (q.choices.some((c, i) => c.id !== HARF[i])) sorun.push('şık harfleri bozuk');
      if (q.choices.some((c) => !c.text?.trim())) sorun.push('boş şık');
      if (q.choices.some((c) => !c.explanation?.trim())) sorun.push('açıklamasız şık');
    }
    if (!HARF.includes(q.correct)) sorun.push('correct geçersiz');
    if (![1, 2, 3].includes(q.difficulty)) sorun.push('zorluk geçersiz');
    if (!q.subtopic?.trim()) sorun.push('alt konu yok');

    const anahtar = (q.stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (govdeler.has(anahtar)) sorun.push('mevcut soruyla aynı');

    if (sorun.length) ret.push({ stem: (q.stem ?? '').slice(0, 60), sorun });
    else {
      govdeler.add(anahtar);
      kabul.push(q);
    }
  }
  return { kabul, ret };
}

/**
 * Doğru cevabı A-E'ye eşit dağıtır.
 *
 * Model kendi haline bırakılınca doğru şıkkı bir harfte topluyor (ilk denemede
 * 15 sorunun 8'i C çıktı). Bankanın tamamının A olması sorununu daha yeni
 * düzeltmiştik; yenisini aynı hatayla üretmenin anlamı yok.
 * Şık metni ile açıklaması birlikte taşınır.
 */
function dengele(sorular) {
  return sorular.map((q, i) => {
    const hedef = i % 5;
    const suAn = q.choices.findIndex((c) => c.id === q.correct);
    if (suAn < 0) return q;

    const govdeler = q.choices.map((c) => ({ text: c.text, explanation: c.explanation }));
    const [dogru] = govdeler.splice(suAn, 1);
    govdeler.splice(hedef, 0, dogru);

    return {
      ...q,
      choices: govdeler.map((g, k) => ({ id: HARF[k], text: g.text, explanation: g.explanation })),
      correct: HARF[hedef],
    };
  });
}

/** Türkçe'de "DEĞİL".toLowerCase() birleşik noktalı i üretir; onu sadeleştir. */
function trKucuk(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFC').replace(/̇/g, '');
}

const ham = await uret();
const denetim = denetle(ham);
const kabul = dengele(denetim.kabul);
const ret = denetim.ret;

// Dağılım raporu — dengesizlik erken görülsün
const dagilim = {};
const zorluk = {};
let olumsuz = 0;
for (const q of kabul) {
  dagilim[q.correct] = (dagilim[q.correct] ?? 0) + 1;
  zorluk[q.difficulty] = (zorluk[q.difficulty] ?? 0) + 1;
  if (/değildir|yanlıştır|olamaz|hangisi yanlış/.test(trKucuk(q.stem))) olumsuz++;
}

// Kimlik ver
const enBuyuk = mevcutListe
  .map((q) => Number(String(q.id).split('-').pop()))
  .filter((n) => Number.isFinite(n))
  .reduce((a, b) => Math.max(a, b), 0);

kabul.forEach((q, i) => {
  q.id = `${topicId}-${String(enBuyuk + i + 1).padStart(3, '0')}`;
  q.topicId = topicId;
});

if (!existsSync('scripts/uretilen')) mkdirSync('scripts/uretilen', { recursive: true });
const cikti = `scripts/uretilen/${topicId}.json`;
writeFileSync(cikti, `${JSON.stringify(kabul, null, 2)}\n`, 'utf8');

console.log(`\n${topicId}`);
console.log(`  üretilen : ${ham.length}`);
console.log(`  kabul    : ${kabul.length}`);
console.log(`  elenen   : ${ret.length}`);
for (const r of ret) console.log(`     - ${r.sorun.join(', ')} :: ${r.stem}`);
console.log(`  doğru dağılımı : ${HARF.filter((h) => dagilim[h]).map((h) => `${h}:${dagilim[h]}`).join('  ')}`);
console.log(`  zorluk         : ${Object.entries(zorluk).map(([k, v]) => `${k}:${v}`).join('  ')}`);
console.log(`  olumsuz soru   : ${olumsuz}/${kabul.length}`);
console.log(`  -> ${cikti}`);
