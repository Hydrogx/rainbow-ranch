/**
 * 补充美术资源：动物用品、装饰、以及由作物图自动合成的种子袋图标。
 * 运行：node scripts/generate-art-extra.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');
const INK = '#5A3D2E';

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${viewBox.split(' ')[2]}" height="${viewBox.split(' ')[3]}">\n${body}\n</svg>\n`;

const files = {};

files['props/wool.svg'] = svg(
  '0 0 120 110',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="44" cy="58" r="26" fill="#FFFDF7"/>
    <circle cx="76" cy="52" r="28" fill="#FFFDF7"/>
    <circle cx="60" cy="34" r="24" fill="#FFFDF7"/>
    <circle cx="62" cy="72" r="26" fill="#FFFDF7"/>
    <path d="M42 44c8-6 18-8 28-6" fill="none" stroke="#E7DFD2" stroke-width="4"/>
    <path d="M50 70c10 4 22 4 32-2" fill="none" stroke="#E7DFD2" stroke-width="4"/>
  </g>`,
);

files['props/feed_bag.svg'] = svg(
  '0 0 120 130',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 40h64l-6 80H34z" fill="#E8C48A"/>
    <path d="M24 28h72v16H24z" fill="#C99A5B"/>
    <path d="M40 28c0-14 40-14 40 0" fill="none"/>
    <path d="M60 60c-10 4-14 14-10 24 10 4 20-4 20-14" fill="#FFD45C"/>
    <path d="M36 84h18M62 92h16" fill="none" stroke="#C99A5B" stroke-width="4"/>
  </g>`,
);

files['props/bell.svg'] = svg(
  '0 0 110 120',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 34c0-16 16-24 35-24s35 8 35 24" fill="none"/>
    <path d="M28 40h54l-6 44H34z" fill="#FFD45C"/>
    <path d="M42 92h26c0 8-6 14-13 14s-13-6-13-14z" fill="#E8A93A"/>
    <circle cx="55" cy="66" r="7" fill="#E8A93A" stroke-width="4"/>
  </g>`,
);

files['props/ball.svg'] = svg(
  '0 0 110 110',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="55" cy="55" r="44" fill="#6EC1E4"/>
    <path d="M11 55h88M55 11v88" fill="none"/>
    <path d="M22 24c18 20 48 20 66 0M22 86c18-20 48-20 66 0" fill="none" stroke="#FFFFFF" stroke-width="6"/>
    <circle cx="38" cy="38" r="7" fill="#FFD45C" stroke-width="4"/>
  </g>`,
);

files['props/fence.svg'] = svg(
  '0 0 140 120',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 24h14v84H24zM102 24h14v84h-14z" fill="#E0A96D"/>
    <path d="M8 44h124v14H8zM8 76h124v14H8z" fill="#F0C682"/>
    <path d="M31 16l-9 12h18zM109 16l-9 12h18z" fill="#E0A96D"/>
  </g>`,
);

files['props/path.svg'] = svg(
  '0 0 120 90',
  `  <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
    <ellipse cx="60" cy="46" rx="52" ry="34" fill="#E3D6BF"/>
    <ellipse cx="40" cy="40" rx="14" ry="10" fill="#D3C3A6"/>
    <ellipse cx="74" cy="54" rx="16" ry="11" fill="#D3C3A6"/>
    <ellipse cx="62" cy="30" rx="11" ry="8" fill="#D3C3A6"/>
  </g>`,
);

/* ------------------------------------------------------------------ */
/* 种子袋：把作物图形缩放进小纸袋里，一眼就能看出是什么种子            */
/* ------------------------------------------------------------------ */

const crops = ['carrot', 'tomato', 'corn', 'pumpkin', 'lettuce', 'strawberry'];
const packetColors = {
  carrot: { bag: '#FFD8B0', band: '#F47A45' },
  tomato: { bag: '#FFD2CE', band: '#F0524A' },
  corn: { bag: '#FFF0B8', band: '#F5A623' },
  pumpkin: { bag: '#FFDCC0', band: '#F58A2E' },
  lettuce: { bag: '#DDF3C9', band: '#63B96B' },
  strawberry: { bag: '#FFD7E4', band: '#F0524A' },
};

for (const crop of crops) {
  const file = join(outDir, 'crops', `${crop}.svg`);
  if (!existsSync(file)) {
    console.warn(`[extra] 跳过 ${crop}：缺少作物图`);
    continue;
  }
  const raw = readFileSync(file, 'utf8');
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(raw);
  const w = box ? parseFloat(box[1]) : 120;
  const h = box ? parseFloat(box[2]) : 140;
  const target = 62;
  const scale = target / Math.max(w, h);
  const tx = 24 + (target - w * scale) / 2;
  const ty = 34 + (target - h * scale) / 2;
  const c = packetColors[crop];

  files[`crops/seed_${crop}.svg`] = svg(
    '0 0 110 130',
    `  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round">
    <path d="M14 26h82v92H14z" fill="${c.bag}"/>
    <path d="M14 26l10-16h62l10 16z" fill="${c.band}"/>
    <path d="M24 60h62v44H24z" fill="#FFFDF5" stroke-width="4"/>
    <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">${inner}</g>
    <path d="M30 44h50" fill="none" stroke="${c.band}" stroke-width="6"/>
    <circle cx="55" cy="14" r="4" fill="${INK}" stroke="none"/>
  </g>`,
  );
}

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}
console.log(`[generate-art-extra] 已生成 ${count} 个 SVG -> src/assets/`);
