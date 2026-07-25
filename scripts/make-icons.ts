/** favicon.svg'den PWA PNG ikonlarını üretir. Kullanım: npx tsx scripts/make-icons.ts */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const pub = path.resolve(import.meta.dirname, '../public');
const svg = readFileSync(path.join(pub, 'favicon.svg'));

const targets = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const t of targets) {
  await sharp(svg, { density: 300 }).resize(t.size, t.size).png().toFile(path.join(pub, t.file));
  console.log(`✓ ${t.file} (${t.size}px)`);
}
