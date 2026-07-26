/**
 * Konu anlatımındaki boşlukları YALNIZCA çekirdek bilgilerle doldurur.
 *
 *   node scripts/bosluk-doldur.mjs <topicId>
 *
 * Neden ayrı bir hat?
 * konu-genislet tüm konuyu yeniden ürettiriyor; büyük konularda (genel-turizm:
 * 84 çekirdek) çıktı bütçesi dolduğu için bilgiler metne sığmıyordu — 9 çekirdek
 * dışarıda kalmıştı. Bu hat mevcut metne DOKUNMAZ, yalnızca eksik çekirdekleri
 * kapsayan YENİ bölümler üretip sona ekler.
 *
 * Güvenlik: sadece çekirdek bilgi kullanılır. Çekirdekler gerçek sınav
 * sorularının resmî cevaplarından çıkarıldığı için doğrulama gerektirmez.
 * Karantinadaki riskli türevlere hiç dokunulmaz.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';
const PARTI = 10;

const topicId = process.argv[2];
if (!topicId) {
  console.error('Kullanım: node scripts/bosluk-doldur.mjs <topicId>');
  process.exit(1);
}

const env = JSON.parse(readFileSync(`scripts/envanter/${topicId}.json`, 'utf8'));
const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));
const mevcut = pack.fullNotes.map((s) => `${s.heading}\n${s.markdown}`).join('\n\n');

/** Türkçe küçültme — JS toLowerCase() İ'yi birleşik noktalı i'ye çevirir. */
function trKucuk(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFC').replace(/̇/g, '');
}

const DURAK = new Set(
  ('ve veya ile bir bu şu olarak olan için gibi göre kadar daha çok en her hangi ise ancak ama ' +
    'sonra önce üzere yılında adlı ait olduğu değildir vardır')
    .split(' '),
);

function anahtar(s) {
  return trKucuk(s)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !DURAK.has(w));
}

// Mevcut metinde karşılığı olmayan çekirdekleri bul
const mevcutK = trKucuk(mevcut);
const eksik = env.cekirdekler.filter((c) => {
  const k = anahtar(c);
  if (k.length === 0) return false;
  const gecen = k.filter((w) => mevcutK.includes(w)).length;
  return gecen / k.length < 0.5; // yarısından azı geçiyorsa bilgi yok say
});

console.log(`${topicId}`);
console.log(`  çekirdek toplam : ${env.cekirdekler.length}`);
console.log(`  metinde eksik   : ${eksik.length}`);

if (eksik.length === 0) {
  console.log('  boşluk yok, işlem gerekmedi.');
  process.exit(0);
}

const TALIMAT = `Sen MKS (Turist Rehberliği Mesleğe Kabul Sınavı) için ders notu yazıyorsun.

Sana bir konunun MEVCUT bölüm başlıkları ve ders notunda EKSİK olan bilgiler verilecek.
Bu bilgilerin hepsi gerçek sınavda soruldu, yani hepsi mutlaka yer almalı.

GÖREVİN: Eksik bilgileri kapsayan YENİ bölümler yazmak.

KURALLAR:
1. Mevcut bölümleri tekrar yazma — yalnızca YENİ bölümler üret.
2. Verilen her bilgi yeni bölümlerden birinde AÇIKÇA yer almalı.
3. İlgili bilgileri aynı bölümde topla; dağınık tek cümlelik bölümler açma.
4. Üslup: kısa paragraflar, **kalın** anahtar terimler, uygun yerlerde markdown tablosu,
   "sınavda sorulur" türü uyarılar.
5. Sana verilmeyen bilgi EKLEME. Uydurma yapma. Yalnızca listedeki bilgileri işle.
6. Liste numaralarını ("1.", "2.") ve etiketleri metne taşıma.
7. Türkçe yaz.

ÇIKTI: yalnızca JSON dizisi — SADECE yeni bölümler:
[{"heading":"Yeni bölüm başlığı","markdown":"Bölüm metni"}]`;

/** Kesik JSON'dan tam nesneleri kurtar. */
function kurtar(govde) {
  const out = [];
  let d = 0, b = -1, str = false, esc = false;
  for (let i = 0; i < govde.length; i++) {
    const ch = govde[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { str = !str; continue; }
    if (str) continue;
    if (ch === '{') { if (d === 0) b = i; d++; }
    else if (ch === '}') { d--; if (d === 0 && b >= 0) { try { out.push(JSON.parse(govde.slice(b, i + 1))); } catch { /* yut */ } b = -1; } }
  }
  return out;
}

async function parti(grup) {
  const liste = grup.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text:
        `${TALIMAT}\n\nKONU: ${topicId}\n\nMEVCUT BÖLÜM BAŞLIKLARI (tekrar yazma):\n` +
        `${pack.fullNotes.map((s) => `- ${s.heading}`).join('\n')}\n\n` +
        `DERS NOTUNDA EKSİK OLAN BİLGİLER:\n${liste}`,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const bas = temiz.indexOf('[');
  if (bas < 0) return [];
  const govde = temiz.slice(bas);
  try {
    return JSON.parse(govde.slice(0, govde.lastIndexOf(']') + 1));
  } catch {
    return kurtar(govde);
  }
}

const yeniBolumler = [];
for (let i = 0; i < eksik.length; i += PARTI) {
  const r = await parti(eksik.slice(i, i + PARTI));
  yeniBolumler.push(...r.filter((b) => b?.heading?.trim() && b?.markdown?.trim()));
  process.stdout.write(`  ${Math.min(i + PARTI, eksik.length)}/${eksik.length}\r`);
}

// Etiket sızıntısı koruması — bir kez sessizce olmuştu
const govde = yeniBolumler.map((b) => `${b.heading}\n${b.markdown}`).join('\n');
const sizinti = govde.match(/\[ÇIKMIŞ SORUDAN\]|\[TÜREV\]|\bA GRUBU\b|\bB GRUBU\b|(?:^|\s)\d{1,3}\.\s(?=[A-ZÇĞİÖŞÜ][a-z]{2,}\s(?:kavramı|bilgisi)\b)/g) ?? [];
if (sizinti.length > 0) throw new Error(`İç etiket sızıntısı: ${sizinti.length} adet. Metin uygulanmadı.`);

const kalan = eksik.filter((c) => {
  const k = anahtar(c);
  const g = trKucuk(govde);
  return k.length > 0 && k.filter((w) => g.includes(w)).length / k.length < 0.5;
});

if (!existsSync('scripts/bosluk')) mkdirSync('scripts/bosluk', { recursive: true });
writeFileSync(`scripts/bosluk/${topicId}.json`, `${JSON.stringify(yeniBolumler, null, 2)}\n`, 'utf8');

console.log(`\n  yeni bölüm      : ${yeniBolumler.length}`);
console.log(`  yeni kelime     : ${govde.split(/\s+/).length}`);
console.log(`  hâlâ karşılıksız: ${kalan.length}`);
kalan.slice(0, 4).forEach((c) => console.log(`     - ${c.slice(0, 85)}`));
console.log(`  -> scripts/bosluk/${topicId}.json`);
