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

const mevcutBasliklar = pack.fullNotes.map((s, i) => `${i + 1}. ${s.heading}`).join('\n');
const mevcutNot = pack.fullNotes.map((s) => `## ${s.heading}\n${s.markdown}`).join('\n\n');

const bilgiler = [
  ...env.cekirdekler.map((c) => `[ÇIKMIŞ SORUDAN] ${c}`),
  ...env.turevler.map((t) => `[TÜREV] ${t}`),
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
