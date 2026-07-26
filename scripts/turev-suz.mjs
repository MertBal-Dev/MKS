/**
 * Türev bilgileri risk sınıfına ayırır.
 *
 *   node scripts/turev-suz.mjs
 *
 * Amaç: 720 türevin hepsini webden aramak yerine, gerçekten doğrulama
 * gerektirenleri ayırmak. Sınıflar:
 *
 *   ZATEN_DOGRU  — bilgi, önceden kaynaklarına doğrulanmış notlarda zaten var
 *   CEKIRDEK     — bilgi, gerçek sınav sorusunun cevabını tekrar ediyor (resmî)
 *   RISKLI       — sayı, tarih, "ilk/en/tek", kurum bağlantısı içeriyor → web doğrulaması şart
 *   TANIM        — genel tanım/kavram, spesifik olgu iddiası yok → düşük risk
 *
 * Çıktı: scripts/turev-siniflari.json
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

/** Türkçe küçültme — JS toLowerCase() İ'yi birleşik noktalı i'ye çevirir. */
function trKucuk(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFC').replace(/̇/g, '');
}

/** Anlamlı kelimeler — kısa bağlaçlar elenir. */
const DURAK = new Set(
  ('ve veya ile bir bu şu o da de ki mi mı mu mü için gibi olarak olan olduğu ise ancak ama ' +
    'daha çok en her hangi kadar sonra önce göre üzere yılında yılı adlı adı ait')
    .split(' '),
);

function kelimeler(s) {
  return trKucuk(s)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !DURAK.has(w));
}

/** İki metin aynı bilgiyi mi anlatıyor? Anahtar kelime örtüşmesine bakar. */
function ortusme(a, b) {
  const A = new Set(kelimeler(a));
  const B = new Set(kelimeler(b));
  if (A.size === 0) return 0;
  let ortak = 0;
  for (const w of A) if (B.has(w)) ortak++;
  return ortak / A.size;
}

/** Cümle ortasında geçen özel isimler — kaynağı belirsiz spesifik iddianın işareti. */
function ozelIsimler(t) {
  // Cümle başındaki ilk kelime büyük harfli olduğu için atlanır.
  return (t.slice(1).match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ']{2,}/g) ?? []).filter(
    (w) => !/^(Bu|Şu|Ancak|Ayrıca|Örneğin|Türkiye|Türk|Anadolu|Osmanlı)$/.test(w),
  );
}

/**
 * Doğrulanması şart olan iddialar.
 *
 * İlk sürüm yalnızca sayı/superlatif/kurum arıyordu ve "Kula-Salihli Jeoparkı
 * peri bacalarıyla ünlüdür" gibi spesifik ama sayısız iddiaları kaçırıyordu.
 * Artık doğrulanmış notlarda geçmeyen bir özel isim taşıyan her iddia da riskli.
 */
function riskli(t, not) {
  const k = trKucuk(t);

  const kalip =
    /\d{3,4}/.test(t) ||                                   // yıl / büyük sayı
    /\b\d+[.,]?\d*\s*(km|m²|metre|hektar|milyon|bin|adet|cilt|rulo|kişi)/i.test(t) ||
    /\bilk\b|\ben\s|\btek\b|\bbiricik\b|\bsonuncu\b/.test(k) ||   // superlatif
    /bağlı|bünyesinde|müdürlüğü|bakanlığı|kurumu|birliği/.test(k) || // kurum bağlantısı
    /müzesinde|müzesindedir|sergilenmekte/.test(k) ||       // eser-müze eşleşmesi
    /düşünülmekte|sanılmakta|rivayet|olabilir|muhtemel/.test(k);   // spekülatif dil

  if (kalip) return true;

  // Notlarda hiç geçmeyen özel isim → dayanağı belirsiz spesifik iddia
  const notK = trKucuk(not);
  return ozelIsimler(t).some((isim) => !notK.includes(trKucuk(isim)));
}

const envanterler = readdirSync('scripts/envanter')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`scripts/envanter/${f}`, 'utf8')));

const notlar = {};
for (const f of readdirSync('src/content/topics').filter((x) => x.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(`src/content/topics/${f}`, 'utf8'));
  notlar[p.id] = p.fullNotes.map((s) => `${s.heading} ${s.markdown}`).join('\n');
}

const sonuc = { ZATEN_DOGRU: [], CEKIRDEK: [], RISKLI: [], TANIM: [] };

for (const env of envanterler) {
  const not = notlar[env.topicId] ?? '';
  const cekirdekler = env.cekirdekler ?? [];

  for (const t of env.turevler ?? []) {
    const kayit = { topicId: env.topicId, bilgi: t };

    // 1) Zaten doğrulanmış notta var mı?
    if (ortusme(t, not) >= 0.75) {
      sonuc.ZATEN_DOGRU.push(kayit);
      continue;
    }
    // 2) Gerçek sınav cevabını mı tekrarlıyor?
    if (cekirdekler.some((c) => ortusme(t, c) >= 0.7)) {
      sonuc.CEKIRDEK.push(kayit);
      continue;
    }
    // 3) Doğrulanması şart mı?
    if (riskli(t, not)) {
      sonuc.RISKLI.push(kayit);
      continue;
    }
    sonuc.TANIM.push(kayit);
  }
}

writeFileSync('scripts/turev-siniflari.json', `${JSON.stringify(sonuc, null, 2)}\n`, 'utf8');

const toplam = Object.values(sonuc).reduce((n, a) => n + a.length, 0);
console.log(`=== ${toplam} TÜREV SINIFLANDIRILDI ===`);
for (const [k, v] of Object.entries(sonuc)) {
  console.log(`  ${k.padEnd(14)} ${String(v.length).padStart(3)}  (%${Math.round((v.length / toplam) * 100)})`);
}
console.log(`\nWeb doğrulaması gereken: ${sonuc.RISKLI.length}`);

const konuBazli = {};
for (const r of sonuc.RISKLI) konuBazli[r.topicId] = (konuBazli[r.topicId] ?? 0) + 1;
console.log('\nRiskli türevlerin konu dağılımı:');
for (const [k, v] of Object.entries(konuBazli).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(24)} ${v}`);
}
console.log('\n-> scripts/turev-siniflari.json');
