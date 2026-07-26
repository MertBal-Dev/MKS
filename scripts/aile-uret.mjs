/**
 * Gerçek çıkmış sorulardan "soru ailesi" üretir.
 *
 *   node scripts/aile-uret.mjs <topicId> [adet]
 *
 * Her aile = 1 gerçek soru + aynı çekirdek bilgiyi farklı açılardan yoklayan
 * 3 türev + soruları çözmeden önce okunacak kısa anlatım.
 *
 * Türevler konu notlarına DAYANIR; notlarda olmayan bilgi sorulmaz. Böylece
 * her türevin cevabı öğrencinin okuyabileceği bir yere bağlı olur.
 *
 * Çıktı: scripts/aileler/<topicId>.json — doğrulandıktan sonra uygulanır.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';

const topicId = process.argv[2];
const limit = Number(process.argv[3] ?? 999);
if (!topicId) {
  console.error('Kullanım: node scripts/aile-uret.mjs <topicId> [adet]');
  process.exit(1);
}

const sinavlar = readdirSync('src/content/exams')
  .filter((f) => f.startsWith('cikmis'))
  .map((f) => JSON.parse(readFileSync(`src/content/exams/${f}`, 'utf8')));

const kaynaklar = sinavlar
  .flatMap((s) => s.questions.filter((q) => q.topicId === topicId).map((q) => ({ q, examId: s.id, examTitle: s.title })))
  .slice(0, limit);

if (kaynaklar.length === 0) {
  console.error(`${topicId} için çıkmış soru yok.`);
  process.exit(1);
}

const pack = JSON.parse(readFileSync(`src/content/topics/${topicId}.json`, 'utf8'));
const notlar = pack.fullNotes.map((s) => `## ${s.heading}\n${s.markdown}`).join('\n\n');

const TALIMAT = `Sen MKS (Turist Rehberliği Mesleğe Kabul Sınavı) için çalışma materyali hazırlıyorsun.

Sana GERÇEK bir sınav sorusu ve öğrencinin ders notu verilecek.

Üret:
1. "cekirdek": Bu sorunun ölçtüğü bilgiyi TEK cümlede yaz.
2. "ozet": Soruları çözmeden önce okunacak KISA anlatım (markdown, 60-120 kelime).
   Çekirdek bilgiyi ve etrafındaki 2-3 kilit ayrıntıyı ver. **Kalın** anahtar terim kullan.
   Ders kitabı gibi değil, "şunu bilirsen bu soruların hepsini çözersin" tonunda yaz.
3. "turevler": AYNI çekirdek bilgiyi FARKLI açılardan yoklayan 3 soru.
   - Her biri TAM 5 ŞIKLI (A-E)
   - Doğru cevapları farklı harflere dağıt
   - Tipleri çeşitlendir: biri klasik, biri OLUMSUZ ("hangisi DEĞİLDİR/YANLIŞTIR"),
     biri eşleştirme veya kronoloji olsun
   - Her şık için "explanation": doğru şıkta NEDEN doğru, yanlış şıkta NEDEN yanlış
   - "trick": bu soruyu kaçırtan tuzak, tek cümle

MUTLAK KURALLAR:
- Türevlerin cevapları SANA VERİLEN DERS NOTUNDAN doğrulanabilmeli. Notta olmayan
  bir tarih, sayı veya isim SORMA.
- Gerçek soruyu türev olarak tekrar etme; farklı açı bul.
- Uydurma yapma. Emin olmadığın hiçbir şeyi soruya koyma.

ÇIKTI: yalnızca JSON:
{"cekirdek":"...","ozet":"...","turevler":[{"stem":"...","choices":[{"id":"A","text":"...","explanation":"..."}],"correct":"C","trick":"..."}]}`;

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

const HARF = ['A', 'B', 'C', 'D', 'E'];

async function aileUret({ q, examId, examTitle }, sira) {
  const dogru = q.choices.find((c) => c.id === q.correct);
  const soruMetni = `${q.stem}\n${q.choices.map((c) => `${c.id}) ${c.text}`).join('\n')}\nDOĞRU CEVAP: ${q.correct}) ${dogru?.text ?? ''}`;

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text: `${TALIMAT}\n\nDERS NOTU:\n"""\n${notlar.slice(0, 26000)}\n"""\n\nGERÇEK SINAV SORUSU (${examTitle}):\n${soruMetni}`,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);

  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let obj;
  try {
    obj = JSON.parse(temiz.slice(temiz.indexOf('{'), temiz.lastIndexOf('}') + 1));
  } catch {
    obj = kurtar(temiz)[0];
  }
  if (!obj?.turevler?.length) return null;

  const aileId = `aile-${topicId}-${String(sira + 1).padStart(3, '0')}`;

  // Türevleri normalleştir: harfleri sırayla ata, doğru cevabı yeniden bağla, dengeli dağıt
  const turevler = [];
  obj.turevler.slice(0, 3).forEach((t, i) => {
    const secenekler = (t.choices ?? [])
      .filter((c) => c?.text?.trim() && c?.explanation?.trim())
      .slice(0, 5);
    if (secenekler.length !== 5) return;

    const eskiDogru = String(t.correct ?? '').trim().toUpperCase();
    let idx = secenekler.findIndex((c) => String(c.id).trim().toUpperCase() === eskiDogru);
    if (idx < 0) idx = 0;

    // Doğru cevabı A-E arasında dengeli dağıt
    const hedef = (sira * 3 + i) % 5;
    const govdeler = secenekler.map((c) => ({ text: c.text.trim(), explanation: c.explanation.trim() }));
    const [dogruGovde] = govdeler.splice(idx, 1);
    govdeler.splice(hedef, 0, dogruGovde);

    turevler.push({
      id: `${aileId}-t${i + 1}`,
      stem: String(t.stem ?? '').trim(),
      choices: govdeler.map((g, k) => ({ id: HARF[k], text: g.text, explanation: g.explanation })),
      correct: HARF[hedef],
      trick: String(t.trick ?? '').trim(),
    });
  });

  if (turevler.length === 0 || turevler.some((t) => !t.stem)) return null;

  return {
    id: aileId,
    topicId,
    cekirdek: String(obj.cekirdek ?? '').trim(),
    ozet: String(obj.ozet ?? '').trim(),
    kaynak: {
      examId,
      examTitle,
      soru: {
        id: q.id,
        stem: q.stem,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text, explanation: c.explanation })),
        correct: q.correct,
        trick: q.trick ?? '',
      },
    },
    turevler,
  };
}

const aileler = [];
let atlanan = 0;
for (let i = 0; i < kaynaklar.length; i++) {
  try {
    const a = await aileUret(kaynaklar[i], i);
    if (a?.cekirdek && a?.ozet) aileler.push(a);
    else atlanan++;
  } catch {
    atlanan++;
  }
  process.stdout.write(`  ${i + 1}/${kaynaklar.length} (${aileler.length} aile)\r`);
}

if (!existsSync('scripts/aileler')) mkdirSync('scripts/aileler', { recursive: true });
writeFileSync(`scripts/aileler/${topicId}.json`, `${JSON.stringify(aileler, null, 2)}\n`, 'utf8');

const dagilim = {};
for (const a of aileler) for (const t of a.turevler) dagilim[t.correct] = (dagilim[t.correct] ?? 0) + 1;

console.log(`\n${topicId}`);
console.log(`  kaynak soru : ${kaynaklar.length}`);
console.log(`  üretilen aile: ${aileler.length}  (atlanan ${atlanan})`);
console.log(`  türev soru   : ${aileler.reduce((n, a) => n + a.turevler.length, 0)}`);
console.log(`  doğru dağılımı: ${HARF.filter((h) => dagilim[h]).map((h) => `${h}:${dagilim[h]}`).join('  ')}`);
console.log(`  -> scripts/aileler/${topicId}.json`);
