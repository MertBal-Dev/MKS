const url = 'https://www.trkutuphane.com/ucretsiz-test-deneme/turist-rehberli%C4%9Fi-mesle%C4%9Fe-kabul-s%C4%B1nav%C4%B1-mart-2026';
const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
const m = html.match(/PCFET0NUWVBF[A-Za-z0-9+/=]{500,}/);
const endIdx = m.index + m[0].length;
console.log('blob bitiş konumu:', endIdx);
console.log('kesildiği yerdeki 160 karakter:', JSON.stringify(html.slice(endIdx, endIdx + 160)));
console.log('devamında base64 var mı? sonraki 400:', JSON.stringify(html.slice(endIdx + 160, endIdx + 560)));
