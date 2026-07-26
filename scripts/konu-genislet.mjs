/**
 * Envanterdeki bilgileri konu anlatımına işler.
 *
 *   node scripts/konu-genislet.mjs <topicId>
 *
 * Girdi : scripts/envanter/<topicId>.json  (çekirdek + kesin türevler)
 *         src/content/topics/<topicId>.json (mevcut anlatım)
 * Çıktı : scripts/genisletilmis/<topicId>.json — elle bakıldıktan sonra uygulanır
 *
 * Kural: mevcut anlatım SİLİNMEZ. Model yalnızca eksik bilgileri uygun bölümlere
 * ekler veya yeni bölüm açar. Böylece daha önce doğrulanmış içerik korunur.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';

const topicId = process.argv[2];
if (!topicId) {
  console.error('Kullanım: node scripts/konu-genislet.mjs <topicId>');
  process.exit(1);
}

const env = JSON.parse(readFileSync(`scripts/envanter/${topicId}.json`, 'utf8'));
const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));

/**
 * Türevlerin yalnızca KANITLI olanları kullanılır.
 *
 * Riskli sınıftan rastgele seçilen 6 iddia bağımsız olarak webden kontrol edildi
 * ve 3'ü yanlış çıktı (MTA "ilk ve tek", Nevali Çori 1979-1991, Doxey Irridex
 * 5 aşama). %50 hata oranıyla bu sınıf doğrulanmadan öğrenciye gidemez.
 * Süzgeç sonuçları scripts/turev-siniflari.json içinde; RISKLI olanlar dışarıda,
 * doğrulananlar scripts/turev-dogrulanan.json üzerinden geri alınır.
 */
let izinliTurevler = new Set(env.turevler ?? []);
try {
  const sinif = JSON.parse(readFileSync('scripts/turev-siniflari.json', 'utf8'));
  const riskli = new Set(sinif.RISKLI.filter((r) => r.topicId === topicId).map((r) => r.bilgi));

  let dogrulanan = new Set();
  try {
    const d = JSON.parse(readFileSync('scripts/turev-dogrulanan.json', 'utf8'));
    dogrulanan = new Set((d.dogru ?? []).map((x) => (typeof x === 'string' ? x : x.bilgi)));
  } catch {
    /* henüz doğrulama yapılmadı */
  }

  izinliTurevler = new Set([...izinliTurevler].filter((t) => !riskli.has(t) || dogrulanan.has(t)));
  console.log(`  türev süzgeci: ${env.turevler.length} → ${izinliTurevler.size} (riskli ${riskli.size} elendi)`);
} catch {
  console.warn('  UYARI: turev-siniflari.json yok — süzgeç uygulanmadı');
}

const mevcutBasliklar = pack.fullNotes.map((s, i) => `${i + 1}. ${s.heading}`).join('\n');
const mevcutNot = pack.fullNotes.map((s) => `## ${s.heading}\n${s.markdown}`).join('\n\n');

/**
 * Bilgiler numaralandırılarak verilir, ETİKETSİZ.
 * Önce "[ÇIKMIŞ SORUDAN]" / "[TÜREV]" etiketleriyle gönderiliyordu ve model bu
 * etiketleri öğrenciye giden metne aynen kopyalıyordu (bir konuda 84 kez).
 * Öncelik bilgisini talimatta veriyoruz, veride değil.
 */
const zorunlu = env.cekirdekler;
const ekBilgiler = [...izinliTurevler];

const bilgiler = [
  'A GRUBU — MUTLAKA yer almalı (gerçek sınavda soruldu):',
  ...zorunlu.map((c, i) => `A${i + 1}. ${c}`),
  '',
  'B GRUBU — eklenmeli (sınavda çıkabilecek komşu bilgiler):',
  ...ekBilgiler.map((t, i) => `B${i + 1}. ${t}`),
].join('\n');

const TALIMAT = `Sen MKS (Turist Rehberliği Mesleğe Kabul Sınavı) için ders notu yazıyorsun.

Elinde üç şey var: mevcut ders notu, çıkmış sınav sorularından çıkarılmış bilgiler, ve o bilgilerin
komşuları (türevler).

GÖREVİN: Verilen bilgilerin HEPSİ ders notunda AÇIKÇA yer alacak şekilde notu genişletmek.

KURALLAR:
1. MEVCUT İÇERİĞİ SİLME. Var olan bölümleri koru; eksik bilgiyi ilgili bölüme ekle ya da
   gerekiyorsa yeni bölüm aç.
2. [ÇIKMIŞ SORUDAN] etiketli her bilgi mutlaka notta bulunmalı — bunlar gerçek sınavda soruldu.
3. [TÜREV] etiketli bilgileri de ekle; bunlar sınavda çıkabilecek komşu bilgilerdir.
4. Bilgiyi listeye yığma; mevcut notun ÜSLUBUNU sürdür: kısa paragraflar, **kalın** anahtar terimler,
   uygun yerlerde markdown tablosu, "sınavda sorulur" türü uyarılar.
5. Kendi kafandan YENİ bilgi uydurma. Yalnızca verilen bilgileri ve mevcut notu kullan.
6. Türkçe yaz.
7. Sana verilen listelerin BİÇİMİNİ metne taşıma: "A GRUBU", "B GRUBU", "A1.", "B3.",
   "[ÇIKMIŞ SORUDAN]", "[TÜREV]" gibi hiçbir etiket veya numara ders notunda GEÇMEYECEK.
   Bunlar senin için sıralama işaretleri; öğrenci bunları görmemeli.
8. Aynı cümleyi iki kez yazma. Bir bilgi zaten bir bölümde geçtiyse tekrar etme.

ÇIKTI: yalnızca şu şemada JSON — konunun TÜM bölümleri (eskiler güncellenmiş hâliyle + yeniler):
[{"heading":"Bölüm başlığı","markdown":"Bölüm metni (markdown)"}]`;

const istem = `KONU: ${topicId}

MEVCUT BÖLÜM BAŞLIKLARI:
${mevcutBasliklar}

MEVCUT DERS NOTU:
"""
${mevcutNot}
"""

NOTTA YER ALMASI GEREKEN BİLGİLER:
${bilgiler}

Bu bilgilerin hepsini kapsayan, mevcut içeriği koruyan genişletilmiş ders notunu üret.`;

/** Kesik JSON'dan tam nesneleri kurtar. */
function kurtar(govde) {
  const out = [];
  let derinlik = 0, basla = -1, str = false, kacis = false;
  for (let i = 0; i < govde.length; i++) {
    const ch = govde[i];
    if (kacis) { kacis = false; continue; }
    if (ch === '\\') { kacis = true; continue; }
    if (ch === '"') { str = !str; continue; }
    if (str) continue;
    if (ch === '{') { if (derinlik === 0) basla = i; derinlik++; }
    else if (ch === '}') {
      derinlik--;
      if (derinlik === 0 && basla >= 0) {
        try { out.push(JSON.parse(govde.slice(basla, i + 1))); } catch { /* yut */ }
        basla = -1;
      }
    }
  }
  return out;
}

const res = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'generate', text: `${TALIMAT}\n\n${istem}` }),
});
if (!res.ok) throw new Error(`API ${res.status}`);

const { text } = await res.json();
const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
const bas = temiz.indexOf('[');
if (bas < 0) throw new Error('JSON dizisi bulunamadı');

let bolumler;
try {
  bolumler = JSON.parse(temiz.slice(bas, temiz.lastIndexOf(']') + 1));
} catch {
  bolumler = kurtar(temiz.slice(bas));
}

bolumler = bolumler.filter((b) => b?.heading?.trim() && b?.markdown?.trim());
if (bolumler.length < 3) throw new Error(`Yalnızca ${bolumler.length} bölüm döndü — şema en az 3 istiyor`);

/**
 * İç etiketlerin öğrenciye giden metne sızmadığını doğrula.
 * Bu bir kez sessizce oldu; bir daha olursa üretim burada durur.
 */
const govde = bolumler.map((b) => `${b.heading}\n${b.markdown}`).join('\n');
const sizinti = govde.match(/\[ÇIKMIŞ SORUDAN\]|\[TÜREV\]|\bA GRUBU\b|\bB GRUBU\b|(?:^|\s)[AB]\d{1,3}\.\s/g) ?? [];
if (sizinti.length > 0) {
  throw new Error(
    `İç etiket sızıntısı: ${sizinti.length} adet (${[...new Set(sizinti.map((s) => s.trim()))].slice(0, 4).join(', ')}). ` +
      'Metin uygulanmadı.',
  );
}

const oncekiKelime = pack.fullNotes.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);
const sonrakiKelime = bolumler.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);

// Kapsama denetimi: hangi bilgiler metne girmemiş?
const govdeMetni = bolumler.map((b) => `${b.heading} ${b.markdown}`).join(' ').toLowerCase();
function anahtarKelimeler(c) {
  return (c.match(/[A-ZÇĞİÖŞÜ][a-zçğıöşü]{3,}/g) ?? []).slice(0, 3).map((w) => w.toLowerCase());
}
const girmeyen = env.cekirdekler.filter((c) => {
  const kelimeler = anahtarKelimeler(c);
  return kelimeler.length > 0 && !kelimeler.some((w) => govdeMetni.includes(w));
});

if (!existsSync('scripts/genisletilmis')) mkdirSync('scripts/genisletilmis', { recursive: true });
writeFileSync(`scripts/genisletilmis/${topicId}.json`, `${JSON.stringify(bolumler, null, 2)}\n`, 'utf8');

console.log(`${topicId}`);
console.log(`  bölüm  : ${pack.fullNotes.length} → ${bolumler.length}`);
console.log(`  kelime : ${oncekiKelime} → ${sonrakiKelime}  (+%${Math.round(((sonrakiKelime - oncekiKelime) / oncekiKelime) * 100)})`);
console.log(`  işlenen bilgi : ${env.cekirdekler.length} çekirdek + ${env.turevler.length} türev`);
if (girmeyen.length) {
  console.log(`  ⚠ metne girmemiş olabilecek çekirdek: ${girmeyen.length}`);
  girmeyen.slice(0, 5).forEach((c) => console.log(`     - ${c.slice(0, 90)}`));
}
console.log(`  -> scripts/genisletilmis/${topicId}.json`);
