/**
 * Karantinadaki riskli türevleri tek tek doğrular.
 *
 *   node scripts/turev-dogrula.mjs <topicId> [adet]
 *
 * Her iddia için bağımsız bir web araması yapılır ve model YALNIZCA arama
 * sonucuna bakarak karar verir. Kendi hafızasına dayanması yasak — hatanın
 * kaynağı zaten oydu.
 *
 * Sonuç scripts/turev-dogrulanan.json dosyasına işlenir:
 *   dogru[]  → kaynağıyla birlikte; konu anlatımına geri alınır
 *   yanlis[] → düzeltmesiyle birlikte; bir daha üretilirse yakalanır
 *   belirsiz[] → kaynak bulunamadı; karantinada kalır
 *
 * Yavaş ve kasıtlı bir süreçtir; partiler hâlinde çalıştırılır.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';
const SEARCH = process.env.MKS_SEARCH; // dışarıdan sağlanan arama uç noktası (yoksa elle mod)

const topicId = process.argv[2];
const adet = Number(process.argv[3] ?? 10);

if (!topicId) {
  console.error('Kullanım: node scripts/turev-dogrula.mjs <topicId> [adet]');
  process.exit(1);
}

const DOSYA = 'scripts/turev-dogrulanan.json';
const kayit = existsSync(DOSYA)
  ? JSON.parse(readFileSync(DOSYA, 'utf8'))
  : { _aciklama: '', dogru: [], yanlis: [], belirsiz: [] };
kayit.dogru ??= [];
kayit.yanlis ??= [];
kayit.belirsiz ??= [];

const islenmis = new Set([
  ...kayit.dogru.map((x) => (typeof x === 'string' ? x : x.bilgi)),
  ...kayit.yanlis.map((x) => (typeof x === 'string' ? x : x.bilgi)),
  ...kayit.belirsiz.map((x) => (typeof x === 'string' ? x : x.bilgi)),
]);

const siniflar = JSON.parse(readFileSync('scripts/turev-siniflari.json', 'utf8'));
const bekleyen = siniflar.RISKLI.filter((r) => r.topicId === topicId && !islenmis.has(r.bilgi)).slice(0, adet);

if (bekleyen.length === 0) {
  console.log(`${topicId}: doğrulanmayı bekleyen riskli türev yok.`);
  process.exit(0);
}

/**
 * Arama sonucuna göre karar verdirir.
 * Modelin kendi bilgisine dayanması açıkça yasaklanır; kanıt metinde olmalı.
 */
async function karar(iddia, kanit) {
  const istem = `Bir iddia ve onunla ilgili WEB ARAMA SONUÇLARI vereceğim.

İDDİA: "${iddia}"

ARAMA SONUÇLARI:
"""
${kanit.slice(0, 12000)}
"""

Görevin: SADECE yukarıdaki arama sonuçlarına dayanarak karar ver.
KENDİ HAFIZANA DAYANMA. Arama sonuçlarında kanıt yoksa "belirsiz" de.

- "dogru"    : Arama sonuçları iddiayı açıkça destekliyor.
- "yanlis"   : Arama sonuçları iddiayla çelişiyor. "duzeltme" alanına doğrusunu yaz.
- "belirsiz" : Sonuçlar bu iddia hakkında yeterli bilgi vermiyor.

Küçük ama önemli farkları yakala: "ilk" ile "ilk ve tek", "1979" ile "1983",
"dört aşama" ile "beş aşama" gibi farklar iddiayı YANLIŞ yapar.

ÇIKTI: yalnızca JSON:
{"karar":"dogru","duzeltme":"","gerekce":"tek cümle"}`;

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'generate', text: istem }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);

  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const bas = temiz.indexOf('{');
  const son = temiz.lastIndexOf('}');
  if (bas < 0 || son < bas) return { karar: 'belirsiz', gerekce: 'yanıt ayrıştırılamadı' };
  try {
    return JSON.parse(temiz.slice(bas, son + 1));
  } catch {
    return { karar: 'belirsiz', gerekce: 'yanıt ayrıştırılamadı' };
  }
}

/** Arama uç noktası yoksa iddiaları dosyaya yazıp elle doldurulmasını ister. */
if (!SEARCH) {
  const liste = bekleyen.map((b, i) => `${i + 1}. ${b.bilgi}`).join('\n');
  writeFileSync(`scripts/dogrulanacak-${topicId}.txt`, `${liste}\n`, 'utf8');
  console.log(`MKS_SEARCH tanımlı değil — arama sonuçları dışarıdan sağlanmalı.`);
  console.log(`${bekleyen.length} iddia yazıldı: scripts/dogrulanacak-${topicId}.txt`);
  process.exit(0);
}

let d = 0, y = 0, b = 0;
for (const item of bekleyen) {
  const res = await fetch(`${SEARCH}?q=${encodeURIComponent(item.bilgi)}`);
  const kanit = await res.text();
  const sonuc = await karar(item.bilgi, kanit);

  if (sonuc.karar === 'dogru') {
    kayit.dogru.push({ bilgi: item.bilgi, kaynak: 'web araması', not: sonuc.gerekce });
    d++;
  } else if (sonuc.karar === 'yanlis') {
    kayit.yanlis.push({ bilgi: item.bilgi, sorun: sonuc.duzeltme || sonuc.gerekce, kaynak: 'web araması' });
    y++;
  } else {
    kayit.belirsiz.push({ bilgi: item.bilgi, not: sonuc.gerekce });
    b++;
  }
  process.stdout.write(`  ${d + y + b}/${bekleyen.length}\r`);
}

writeFileSync(DOSYA, `${JSON.stringify(kayit, null, 2)}\n`, 'utf8');
console.log(`\n${topicId}: doğru ${d} | yanlış ${y} | belirsiz ${b}`);
console.log(`  toplam doğrulanmış: ${kayit.dogru.length}, reddedilen: ${kayit.yanlis.length}`);
