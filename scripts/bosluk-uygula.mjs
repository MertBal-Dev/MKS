/**
 * Boşluk doldurma bölümlerini konu anlatımına ekler.
 *
 *   node scripts/bosluk-uygula.mjs <topicId>
 *
 * Partiler birbirinden habersiz çalıştığı için aynı temada birden çok bölüm
 * çıkabiliyor (genel-turizm'de üç ayrı "İletişim" bölümü). Birleştirme MEKANİK
 * yapılır — metne modelin tekrar dokunması yeni hata riski demek olurdu.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const topicId = process.argv[2];
if (!topicId) {
  console.error('Kullanım: node scripts/bosluk-uygula.mjs <topicId>');
  process.exit(1);
}

const yeni = JSON.parse(readFileSync(`scripts/bosluk/${topicId}.json`, 'utf8'));
const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));

function trKucuk(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFC').replace(/̇/g, '');
}

/** Başlıktaki taşıyıcı kelimeler — bölümleri temaya göre eşlemek için. */
const TASIYICI = ['iletişim', 'anatomi', 'biyolojik', 'vücut', 'kültür', 'edebiyat', 'talep', 'ziyaretçi', 'tarih'];

function tema(heading) {
  const h = trKucuk(heading);
  return TASIYICI.find((t) => h.includes(t)) ?? h;
}

// Aynı temadaki bölümleri tek bölümde topla, sırayı koru
const gruplar = new Map();
for (const b of yeni) {
  const t = tema(b.heading);
  if (gruplar.has(t)) {
    const g = gruplar.get(t);
    g.markdown = `${g.markdown.trim()}\n\n${b.markdown.trim()}`;
    // En açıklayıcı başlığı tut (en uzun olan)
    if (b.heading.length > g.heading.length) g.heading = b.heading;
  } else {
    gruplar.set(t, { heading: b.heading, markdown: b.markdown });
  }
}

const birlesik = [...gruplar.values()];

pack.fullNotes = [...pack.fullNotes, ...birlesik];
writeFileSync(`src/content/topics/${topicId}.json`, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');

console.log(`${topicId}`);
console.log(`  yeni bölüm : ${yeni.length} → ${birlesik.length} (tema birleştirmesi)`);
console.log(`  toplam bölüm : ${pack.fullNotes.length}`);
console.log(`  toplam kelime: ${pack.fullNotes.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0)}`);
birlesik.forEach((b) => console.log(`    + ${b.heading}`));
