/**
 * Çıkmış sorulardan bilgi envanteri çıkarır.
 *
 *   node scripts/soru-envanteri.mjs <topicId>
 *
 * Her gerçek sınav sorusu için iki şey üretir:
 *   1. cekirdek  — sorunun test ettiği bilgi (soru zaten gerçek, bu yüzden bu bilgi kesin)
 *   2. turevler  — aynı konudan sınavda çıkabilecek komşu bilgiler
 *
 * Çekirdekler güvenlidir çünkü kaynakları gerçek sınav. Türevler modelin
 * katkısıdır ve "emin değilsen yazma" kuralına tabidir; ayrıca guven alanıyla
 * işaretlenir ki konu anlatımına girmeden önce süzülebilsin.
 *
 * Çıktı: scripts/envanter/<topicId>.json
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';
const PARTI = 6;

const topicId = process.argv[2];
if (!topicId) {
  console.error('Kullanım: node scripts/soru-envanteri.mjs <topicId>');
  process.exit(1);
}

const sorular = readdirSync('src/content/exams')
  .filter((f) => f.startsWith('cikmis'))
  .flatMap((f) => JSON.parse(readFileSync(`src/content/exams/${f}`, 'utf8')).questions)
  .filter((q) => q.topicId === topicId);

if (sorular.length === 0) {
  console.error(`${topicId} için çıkmış soru yok.`);
  process.exit(1);
}

const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));
const mevcutNot = pack.fullNotes.map((s) => `${s.heading}\n${s.markdown}`).join('\n\n');

const TALIMAT = `Sana GERÇEK bir sınavda çıkmış sorular ve öğrencinin elindeki mevcut ders notu verilecek.

Görevin, ders notunun bu soruları karşılayacak şekilde neyi içermesi gerektiğini çıkarmak.

Her soru için şunları üret:
1. "cekirdek": Sorunun ölçtüğü bilgiyi TEK, NET bir cümlede yaz. Soruyu tekrarlama; arkasındaki
   olguyu yaz. Örnek: soru "Parşömen nerede geliştirildi?" ise çekirdek
   "Parşömen, Mısır'ın papirüs ambargosu üzerine Bergama'da geliştirilmiştir; adını Pergamon'dan alır."
2. "notlardaVar": Bu bilgi mevcut ders notunda AÇIKÇA yazıyor mu? true/false.
3. "turevler": Aynı konu başlığından sınavda çıkabilecek 2-4 KOMŞU bilgi. Her biri
   {"bilgi": "...", "guven": "kesin"|"supheli"} biçiminde olmalı. Tek cümle, sorulabilir bir olgu.
   Örnek: {"bilgi":"Bergama Kütüphanesi yaklaşık 200.000 rulo ile antik dünyanın ikinci büyük kütüphanesidir.","guven":"kesin"}

ÇEKİRDEK HAKKINDA ÖNEMLİ: Sana verilen sorular GERÇEK sınavda çıkmıştır ve doğru cevapları
resmîdir. Bu yüzden çekirdek bilgiyi ASLA "emin değilim" diye atlamak yok — doğru cevap zaten
elinde. Çekirdeği her soru için mutlaka yaz.

GÜVEN YALNIZCA TÜREVLER İÇİN: Kendi eklediğin komşu bilgilerde emin değilsen "supheli" işaretle
ya da hiç yazma. Tarih, sayı ve isimlerde emin değilsen o türevi atla. Uydurma yapma.

ÇIKTI: yalnızca JSON dizisi:
[{"no":1,"cekirdek":"...","notlardaVar":false,"turevler":[{"bilgi":"...","guven":"kesin"}]}]`;

async function parti(grup, ofset) {
  const liste = grup
    .map((q, i) => {
      const d = q.choices.find((c) => c.id === q.correct);
      return `${i + 1}. ${q.stem}\n   DOĞRU CEVAP: ${d?.text ?? q.correct}`;
    })
    .join('\n\n');

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text: `${TALIMAT}\n\nMEVCUT DERS NOTU:\n"""\n${mevcutNot.slice(0, 30000)}\n"""\n\nGERÇEK SINAV SORULARI:\n${liste}`,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);

  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const bas = temiz.indexOf('[');
  if (bas < 0) return [];

  const govde = temiz.slice(bas);
  try {
    return JSON.parse(govde.slice(0, govde.lastIndexOf(']') + 1)).map((r) => ({ ...r, soruNo: ofset + (r.no ?? 0) }));
  } catch {
    // Kesik yanıttan tam nesneleri kurtar
    const out = [];
    let derinlik = 0, basla = -1, str = false, kacis = false;
    for (let i = 1; i < govde.length; i++) {
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
    return out.map((r) => ({ ...r, soruNo: ofset + (r.no ?? 0) }));
  }
}

const kayitlar = [];
for (let i = 0; i < sorular.length; i += PARTI) {
  const r = await parti(sorular.slice(i, i + PARTI), i);
  kayitlar.push(...r);
  process.stdout.write(`  ${Math.min(i + PARTI, sorular.length)}/${sorular.length}\r`);
}

/**
 * Çekirdekler her zaman tutulur: kaynakları gerçek sınav sorusu ve resmî cevabı.
 * Güven süzgeci yalnızca modelin kendi eklediği türevlere uygulanır.
 */
const cekirdekler = kayitlar.map((k) => k.cekirdek).filter(Boolean);

const turevKesin = [];
const turevSupheli = [];
for (const k of kayitlar) {
  for (const t of k.turevler ?? []) {
    // Eski biçim (düz metin) de kabul edilsin
    const bilgi = typeof t === 'string' ? t : t?.bilgi;
    const guven = typeof t === 'string' ? 'kesin' : (t?.guven ?? 'kesin');
    if (!bilgi) continue;
    (guven === 'supheli' ? turevSupheli : turevKesin).push(bilgi);
  }
}

const turevler = [...new Set(turevKesin)];
const supheliTurevler = [...new Set(turevSupheli)];
const notlardaOlmayan = kayitlar.filter((k) => k.notlardaVar === false).length;

if (!existsSync('scripts/envanter')) mkdirSync('scripts/envanter', { recursive: true });
writeFileSync(
  `scripts/envanter/${topicId}.json`,
  `${JSON.stringify({ topicId, soruSayisi: sorular.length, cekirdekler, turevler, supheliTurevler }, null, 2)}\n`,
  'utf8',
);

console.log(`\n${topicId}`);
console.log(`  gerçek soru            : ${sorular.length}`);
console.log(`  çekirdek bilgi         : ${cekirdekler.length}  (hepsi tutuldu)`);
console.log(`  türev — kesin          : ${turevler.length}`);
console.log(`  türev — şüpheli (dışta): ${supheliTurevler.length}`);
console.log(`  çekirdeklerden notlarda OLMAYAN : ${notlardaOlmayan}/${kayitlar.length}`);
console.log(`  -> scripts/envanter/${topicId}.json`);
