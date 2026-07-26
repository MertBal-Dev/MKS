/**
 * Genişletilmiş konu anlatımındaki olgusal iddiaları kaynağına bağlar.
 *
 *   node scripts/iddia-denetle.mjs <topicId>
 *
 * Üç kaynak vardır ve her iddia bunlardan birine dayanmalıdır:
 *   1. CIKMIS  — gerçek sınav sorusundan çıkan çekirdek bilgi (en sağlam)
 *   2. TUREV   — modelin eklediği, "kesin" işaretli komşu bilgi
 *   3. ONCEKI  — genişletmeden önceki, kaynaklarına doğrulanmış not
 *
 * Hiçbirine dayanmayan iddia = model yazarken uydurmuş olabilir → DAYANAKSIZ.
 * Amaç, öğrenciye yanlış bilgi gitmesini önlemek.
 *
 * Çıktı: scripts/denetim/<topicId>.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';
const PARTI = 12;

const topicId = process.argv[2];
if (!topicId) {
  console.error('Kullanım: node scripts/iddia-denetle.mjs <topicId>');
  process.exit(1);
}

const env = JSON.parse(readFileSync(`scripts/envanter/${topicId}.json`, 'utf8'));
const yeni = JSON.parse(readFileSync(`scripts/genisletilmis/${topicId}.json`, 'utf8'));

// Genişletmeden ÖNCEKİ not: git'teki son sürüm
let onceki = '';
try {
  const ham = execSync(`git show HEAD:src/content/topics/${topicId}.json`, { encoding: 'utf8', maxBuffer: 20e6 });
  onceki = JSON.parse(ham).fullNotes.map((s) => `${s.heading}\n${s.markdown}`).join('\n\n');
} catch {
  console.warn('  (önceki sürüm okunamadı — yalnızca envantere göre denetlenecek)');
}

const yeniMetin = yeni.map((b) => `## ${b.heading}\n${b.markdown}`).join('\n\n');

const TALIMAT = `Sana bir ders notu ve o notun dayanması gereken KAYNAK BİLGİ listesi verilecek.

Görevin: ders notundaki her SPESİFİK OLGUSAL İDDİAYI (tarih, sayı, isim, yer, "ilk/en" ifadeleri,
kurum bağlantısı, eser-müze eşleşmesi) çıkarmak ve her birinin kaynaklara dayanıp dayanmadığını söylemek.

Her iddia için:
- "iddia": iddiayı tek cümlede yaz
- "dayanak": "kaynakta_var" (kaynak listesinde açıkça geçiyor) | "genel_bilgi" (kaynakta yok ama
  ders kitabı düzeyinde tartışmasız yerleşik bilgi) | "dayanaksiz" (kaynakta yok ve doğruluğundan
  emin olunamaz)
- "dogruMu": "dogru" | "yanlis" | "emin_degilim"  — iddianın kendisi olgusal olarak doğru mu?

ÖNEMLİ: "dayanaksiz" veya "yanlis" işaretlemekten çekinme. Bu denetimin amacı hata bulmak.
Genel kültür seviyesinde herkesin bildiği şeyleri (örn. "Ankara Türkiye'nin başkentidir")
"genel_bilgi" say, her cümleyi iddia diye listeleme — YALNIZCA sınavda sorulabilecek
spesifik olguları çıkar.

ÇIKTI: yalnızca JSON dizisi:
[{"iddia":"...","dayanak":"kaynakta_var","dogruMu":"dogru"}]`;

const kaynaklar = [
  ...env.cekirdekler.map((c) => `[ÇIKMIŞ SINAV] ${c}`),
  ...env.turevler.map((t) => `[TÜREV] ${t}`),
].join('\n');

/** Uzun notu bölüm bölüm denetle — tek istekte hepsi sığmıyor. */
async function bolumDenetle(bolum) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text:
        `${TALIMAT}\n\nKAYNAK BİLGİLER:\n"""\n${kaynaklar}\n"""\n\n` +
        `ÖNCEKİ DOĞRULANMIŞ NOT (bu da kaynak sayılır):\n"""\n${onceki.slice(0, 40000)}\n"""\n\n` +
        `DENETLENECEK BÖLÜM:\n"""\n## ${bolum.heading}\n${bolum.markdown}\n"""`,
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
}

const tum = [];
for (const bolum of yeni) {
  const r = await bolumDenetle(bolum);
  tum.push(...r.map((x) => ({ ...x, bolum: bolum.heading })));
  process.stdout.write(`  ${tum.length} iddia\r`);
}

const sayim = { kaynakta_var: 0, genel_bilgi: 0, dayanaksiz: 0 };
const dogruluk = { dogru: 0, yanlis: 0, emin_degilim: 0 };
for (const i of tum) {
  if (sayim[i.dayanak] !== undefined) sayim[i.dayanak]++;
  if (dogruluk[i.dogruMu] !== undefined) dogruluk[i.dogruMu]++;
}

const sorunlu = tum.filter((i) => i.dayanak === 'dayanaksiz' || i.dogruMu === 'yanlis' || i.dogruMu === 'emin_degilim');

if (!existsSync('scripts/denetim')) mkdirSync('scripts/denetim', { recursive: true });
writeFileSync(`scripts/denetim/${topicId}.json`, `${JSON.stringify({ topicId, sayim, dogruluk, sorunlu }, null, 2)}\n`, 'utf8');

console.log(`\n${topicId} — ${tum.length} olgusal iddia denetlendi`);
console.log(`  kaynakta var : ${sayim.kaynakta_var}`);
console.log(`  genel bilgi  : ${sayim.genel_bilgi}`);
console.log(`  DAYANAKSIZ   : ${sayim.dayanaksiz}`);
console.log(`  doğru ${dogruluk.dogru} | YANLIŞ ${dogruluk.yanlis} | emin değil ${dogruluk.emin_degilim}`);
if (sorunlu.length) {
  console.log(`\n  ⚠ İNCELENMESİ GEREKEN ${sorunlu.length} İDDİA:`);
  sorunlu.slice(0, 12).forEach((s) => console.log(`   [${s.dayanak}/${s.dogruMu}] ${s.iddia.slice(0, 105)}`));
}
console.log(`\n  -> scripts/denetim/${topicId}.json`);
