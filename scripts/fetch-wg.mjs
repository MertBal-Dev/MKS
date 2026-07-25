// Wayground'dan verilen quiz id'lerini çeker (tek seferlik araç): node scripts/fetch-wg.mjs <id...>
import { writeFileSync } from 'node:fs';

const strip = (h) =>
  (h || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

for (const id of process.argv.slice(2)) {
  const res = await fetch(`https://wayground.com/api/main/quiz/${id}`, {
    headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
  });
  const j = await res.json();
  const qs = j?.data?.quiz?.info?.questions || [];
  const out = qs.map((q) => {
    const st = q.structure || {};
    let a = st.answer;
    if (Array.isArray(a)) a = a[0];
    return { q: strip(st.query && st.query.text), options: (st.options || []).map((o) => strip(o.text)), answer: a };
  });
  writeFileSync(`scripts/wg-${id}.json`, JSON.stringify(out, null, 1), 'utf8');
  console.log(id, '→', out.length, 'soru |', j?.data?.quiz?.info?.name);
  console.log(JSON.stringify(out.slice(0, 2)));
}
