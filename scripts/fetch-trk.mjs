// trkutuphane.com'daki ücretsiz MKS oturumlarını indirir (tek seferlik araç).
// Sorular sayfadaki data:text/html;base64 iframe'inin içinde `const questions = [...]` olarak duruyor.
import { writeFileSync } from 'node:fs';

const TARGETS = {
  'subat-2025': 'https://www.trkutuphane.com/ucretsiz-test-deneme/turist-rehberli%C4%9Fi-mesle%C4%9Fe-kabul-s%C4%B1nav%C4%B1-%C5%9Fubat--2025',
  'agustos-2025': 'https://www.trkutuphane.com/ucretsiz-test-deneme/turist-rehberli%C4%9Fi-mesle%C4%9Fe-kabul-s%C4%B1nav%C4%B1-a%C4%9Fustos-2025',
  'mart-2026': 'https://www.trkutuphane.com/ucretsiz-test-deneme/turist-rehberli%C4%9Fi-mesle%C4%9Fe-kabul-s%C4%B1nav%C4%B1-mart-2026',
};

for (const [key, url] of Object.entries(TARGETS)) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' } });
  // Gömülü base64 JSON içinde olduğundan '/' karakterleri '\/' biçiminde kaçırılmış
  const html = (await res.text()).replace(/\\\//g, '/');

  // Gömülü belge base64'ü "<!DOCTYPE" ile başlar → PCFET0NUWVBF
  let inner = '';
  for (const m of html.matchAll(/PCFET0NUWVBF[A-Za-z0-9+/=]{2000,}/g)) {
    const decoded = Buffer.from(m[0], 'base64').toString('utf8');
    if (decoded.length > inner.length) inner = decoded;
  }
  if (!inner) {
    console.log(key, '→ gömülü belge bulunamadı (html', html.length, 'bayt)');
    continue;
  }

  const start = inner.indexOf('const questions');
  if (start === -1) {
    console.log(key, '→ questions dizisi yok');
    continue;
  }
  const arrStart = inner.indexOf('[', start);
  // Dengeli parantez taraması (string içindeki köşeli parantezleri atlar)
  let depth = 0;
  let end = -1;
  let inStr = null;
  for (let i = arrStart; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') inStr = c;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  const literal = inner.slice(arrStart, end);
  // JS nesne literali → JSON: Function ile güvenli biçimde değerlendir
  const data = Function(`"use strict"; return (${literal});`)();
  writeFileSync(`scripts/trk-${key}.json`, JSON.stringify(data, null, 1), 'utf8');
  console.log(key, '→', data.length, 'soru kaydedildi');
}
