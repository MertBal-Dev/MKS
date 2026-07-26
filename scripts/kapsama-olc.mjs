/**
 * Notlarımız gerçek sınav sorularının ne kadarını karşılıyor?
 *
 *   node scripts/kapsama-olc.mjs [ornekSayisi]
 *
 * Çıkmış 3 oturumdan rastgele soru seçer ve her biri için modele sorar:
 * "Bu sorunun cevabı, verilen konu notlarından çıkarılabilir mi?"
 *
 * "İçerik yeterli mi?" sorusunu görüşle değil sayıyla yanıtlamak için var.
 * Eksik çıkan sorular, hangi konuyu derinleştirmemiz gerektiğini de söyler.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const API = process.env.MKS_API ?? 'http://localhost:5173/api/ai-hoca';
const ORNEK = Number(process.argv[2] ?? 60);
/** İsteğe bağlı: yalnızca tek konuyu ölç (genişletme sonrası doğrulama için). */
const KONU_FILTRE = process.argv[3];
const PARTI = 6;

// Çıkmış sınavlar (deneme değil) — gerçek soru dağılımını yansıtsın
const sinavlar = readdirSync('src/content/exams')
  .filter((f) => f.startsWith('cikmis'))
  .map((f) => JSON.parse(readFileSync(`src/content/exams/${f}`, 'utf8')));

const tumSorular = sinavlar
  .flatMap((s) => s.questions.map((q) => ({ ...q, kaynak: s.title })))
  .filter((q) => !KONU_FILTRE || q.topicId === KONU_FILTRE);

// Deterministik örnekleme — tekrar çalıştırınca aynı örneklem
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260726);
const karisik = [...tumSorular].sort(() => rng() - 0.5).slice(0, ORNEK).sort((a,b)=>a.topicId.localeCompare(b.topicId));

/**
 * Notlar konu konu tutulur ve her soruya YALNIZCA kendi konusunun notu verilir.
 * Hepsini tek gövdede göndermek 177 bin karakter ediyor; kırpınca son sıradaki
 * konular hiç gitmiyor ve "notlarda yok" diye sayılıyordu. Konu bazlı eşleme
 * hem doğru hem ucuz.
 */
const notlarByTopic = {};
for (const f of readdirSync('src/content/topics').filter((x) => x.endsWith('.json'))) {
  const t = JSON.parse(readFileSync(`src/content/topics/${f}`, 'utf8'));
  notlarByTopic[t.id] = t.fullNotes.map((s) => `${s.heading}\n${s.markdown}`).join('\n\n');
}

const TALIMAT = `Sana bir sınav sorusu listesi ve bir ders notu bütünü vereceğim.

Her soru için TEK karar ver: bu sorunun DOĞRU CEVABI, verilen notlardan çıkarılabilir mi?

- "tam": Notlarda cevabı doğrudan yazıyor.
- "kismi": Notlar konuya değiniyor ama bu spesifik ayrıntı yok; öğrenci notlardan emin olamaz.
- "yok": Notlarda bu konu/ayrıntı hiç geçmiyor.

Cömert davranma. Öğrencinin YALNIZCA bu notları okuyup soruyu doğru çözebilmesi gerekir.

ÇIKTI: yalnızca JSON dizisi:
[{"no":1,"karar":"tam","eksik":""},{"no":2,"karar":"kismi","eksik":"Sinan'ın çıraklık eseri belirtilmemiş"}]
"eksik" alanına, tam değilse notlarda bulunmayan bilgiyi kısaca yaz.`;

async function partiSor(grup, ofset) {
  const liste = grup
    .map((q, i) => {
      const dogru = q.choices.find((c) => c.id === q.correct);
      return `${i + 1}. ${q.stem}\n   DOĞRU CEVAP: ${dogru?.text ?? q.correct}`;
    })
    .join('\n\n');

  // Partideki soruların konularının notları — tekrarsız
  const konular = [...new Set(grup.map((q) => q.topicId))];
  const notlar = konular
    .map((k) => `### KONU: ${k}\n${notlarByTopic[k] ?? '(bu konunun notu yok)'}`)
    .join('\n\n');

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text: `${TALIMAT}\n\nDERS NOTLARI:\n"""\n${notlar}\n"""\n\nSORULAR:\n${liste}`,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const { text } = await res.json();
  const temiz = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const bas = temiz.indexOf('[');
  const son = temiz.lastIndexOf(']');
  if (bas < 0 || son < bas) return [];
  try {
    return JSON.parse(temiz.slice(bas, son + 1)).map((r) => ({ ...r, mutlakNo: ofset + (r.no ?? 0) }));
  } catch {
    return [];
  }
}

const sonuclar = [];
for (let i = 0; i < karisik.length; i += PARTI) {
  const grup = karisik.slice(i, i + PARTI);
  const r = await partiSor(grup, i);
  sonuclar.push(...r);
  process.stdout.write(`  ${Math.min(i + PARTI, karisik.length)}/${karisik.length}\r`);
}

const sayim = { tam: 0, kismi: 0, yok: 0 };
const eksikler = [];
for (const r of sonuclar) {
  const k = ['tam', 'kismi', 'yok'].includes(r.karar) ? r.karar : 'yok';
  sayim[k]++;
  if (k !== 'tam') {
    const soru = karisik[r.mutlakNo - 1];
    eksikler.push({ konu: soru?.topicId ?? '?', karar: k, eksik: r.eksik, stem: soru?.stem?.slice(0, 80) });
  }
}

const n = sonuclar.length || 1;
console.log(`\n\n=== KAPSAMA (${sonuclar.length} gerçek çıkmış soru) ===`);
console.log(`  TAM   : ${sayim.tam}  (%${Math.round((sayim.tam / n) * 100)})`);
console.log(`  KISMİ : ${sayim.kismi}  (%${Math.round((sayim.kismi / n) * 100)})`);
console.log(`  YOK   : ${sayim.yok}  (%${Math.round((sayim.yok / n) * 100)})`);

const konuBazli = {};
for (const e of eksikler) konuBazli[e.konu] = (konuBazli[e.konu] ?? 0) + 1;
console.log('\n=== EN ÇOK EKSİK OLAN KONULAR ===');
for (const [k, v] of Object.entries(konuBazli).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(24)} ${v} soru`);
}

writeFileSync('scripts/kapsama-raporu.json', `${JSON.stringify({ sayim, eksikler }, null, 2)}\n`, 'utf8');
console.log('\nAyrıntı: scripts/kapsama-raporu.json');
