// Resmi 14 başlıklı dağılımı 12 konumuza eşler ve constants.ts'i günceller.
import { readFileSync, writeFileSync } from 'node:fs';

const WEIGHTS = {
  'genel-turizm': 20, // Genel Turizm/Mevzuat 15 + İletişim-Etik 5
  'turizm-cografyasi': 18, // Tarih-Coğrafya 13 + Flora-Fauna 5
  'anadolu-medeniyetleri': 12,
  'roma-yunan-bizans': 8,
  'genel-turk-tarihi': 6,
  'arkeoloji-mitoloji': 6,
  'sanat-tarihi': 6,
  'halk-bilimi-edebiyat': 6,
  'ilk-yardim': 5,
  muzecilik: 5,
  'osmanli-tarihi': 4,
  'dinler-tarihi': 4,
};

const path = 'src/lib/constants.ts';
let src = readFileSync(path, 'utf8');
let updated = 0;

for (const [key, value] of Object.entries(WEIGHTS)) {
  const re = new RegExp(`('?${key}'?:\\s*\\{[\\s\\S]*?examWeight:\\s*)\\d+`);
  if (!re.test(src)) {
    console.log('BULUNAMADI:', key);
    continue;
  }
  src = src.replace(re, `$1${value}`);
  updated++;
}

writeFileSync(path, src, 'utf8');
const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
console.log(`${updated} konu güncellendi • toplam ağırlık: ${total}`);
