// Wayground kamu API'sinden Şubat 2025 derlemesini çeker (tek seferlik araç)
import { writeFileSync } from 'node:fs';

const res = await fetch('https://wayground.com/api/main/quiz/6882002b309dfb497db6eec5', {
  headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
});
const j = await res.json();
const qs = j?.data?.quiz?.info?.questions || [];
const strip = (h) =>
  (h || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const out = qs.map((q) => {
  const st = q.structure || {};
  let a = st.answer;
  if (Array.isArray(a)) a = a[0];
  return { q: strip(st.query && st.query.text), options: (st.options || []).map((o) => strip(o.text)), answer: a };
});
writeFileSync('scripts/cikmis-raw.json', JSON.stringify(out, null, 1), 'utf8');
console.log('OK', out.length, 'soru');
console.log('ilk3:', JSON.stringify(out.slice(0, 3)));
