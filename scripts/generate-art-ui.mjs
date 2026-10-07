/**
 * 《小小彩虹牧场》UI 与食物图标生成器
 * 运行：node scripts/generate-art-ui.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');
const INK = '#a8845f';   // 柔和暖棕，替代原来的硬黑描边

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${viewBox.split(' ')[2]}" height="${viewBox.split(' ')[3]}">\n${body}\n</svg>\n`;

const files = {};

/* ============================ UI 图标 ============================ */

// 爱心（PRD 12.5 原样）
files['ui/heart.svg'] = svg(
  '0 0 100 100',
  `  <path d="M50 83S12 61 12 34c0-14 20-22 32-8 3 4 6 8 6 8s3-4 6-8c12-14 32-6 32 8 0 27-38 49-38 49z" fill="#FF6F91" stroke="${INK}" stroke-width="2.6"/>
  <path d="M29 30c5-7 13-8 20-2" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>`,
);

// 天气（PRD 12.6 原样）
files['ui/weather.svg'] = svg(
  '0 0 180 120',
  `  <circle cx="65" cy="52" r="31" fill="#FFD45C" stroke="${INK}" stroke-width="2.6"/>
  <path d="M42 82h88c15 0 25-10 25-22s-10-22-24-22c-6-18-22-28-40-25-18 3-29 17-30 32-15 0-25 10-25 22s11 15 26 15z" fill="#CDE9F5" stroke="${INK}" stroke-width="2.6"/>
  <path d="M65 92l-7 17M91 92l-7 17M117 92l-7 17" stroke="#55A9D6" stroke-width="3.2" stroke-linecap="round"/>`,
);

files['ui/sun.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="60" cy="60" r="30" fill="#FFD45C"/>
    <path d="M60 12v14M60 94v14M12 60h14M94 60h14M26 26l10 10M84 84l10 10M94 26L84 36M36 84L26 94" fill="none"/>
    <circle cx="50" cy="54" r="4" fill="#30251F" stroke="none"/>
    <circle cx="70" cy="54" r="4" fill="#30251F" stroke="none"/>
    <path d="M50 70c6 6 14 6 20 0" fill="none"/>
  </g>`,
);

files['ui/cloud.svg'] = svg(
  '0 0 140 100',
  `  <path d="M32 80h74c14 0 26-10 26-24s-12-24-26-24c-4-14-18-22-32-20-14 2-24 14-24 26-12 0-20 8-20 20s10 22 22 22z" fill="#E4EEF5" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
);

files['ui/rain.svg'] = svg(
  '0 0 140 130',
  `  <path d="M32 62h74c14 0 26-10 26-24s-12-24-26-24c-4-14-18-22-32-20-14 2-24 14-24 26-12 0-20 8-20 20s10 22 22 22z" fill="#CFE3EE" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M44 78l-8 30M74 78l-8 30M104 78l-8 30" stroke="#55A9D6" stroke-width="8" stroke-linecap="round"/>`,
);

files['ui/coin.svg'] = svg(
  '0 0 100 100',
  `  <circle cx="50" cy="50" r="42" fill="#FFD45C" stroke="${INK}" stroke-width="2.6"/>
  <circle cx="50" cy="50" r="30" fill="#FFE9A3" stroke="#E8A93A" stroke-width="4"/>
  <path d="M50 30v40M40 40h16c6 0 10 4 10 10s-4 10-10 10H40" fill="none" stroke="#E8A93A" stroke-width="3.2" stroke-linecap="round"/>`,
);

files['ui/star.svg'] = svg(
  '0 0 110 110',
  `  <path d="M55 8l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z" fill="#FFD45C" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M55 24l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2z" fill="#FFF3B0" stroke="none"/>`,
);

files['ui/rainbow_star.svg'] = svg(
  '0 0 110 110',
  `  <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF9CC1"/><stop offset="50%" stop-color="#FFD45C"/><stop offset="100%" stop-color="#8ED66B"/>
    </linearGradient></defs>
  <path d="M55 6l15 31 34 5-25 23 6 34-30-17-30 17 6-34-25-23 34-5z" fill="url(#rg)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
);

files['ui/bag.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 40h76v66H22z" fill="#E0A96D"/>
    <path d="M40 40c0-18 40-18 40 0" fill="none" stroke="#C98B4B" stroke-width="8"/>
    <path d="M22 62h76" fill="none" stroke="#C98B4B" stroke-width="2.6"/>
    <circle cx="60" cy="76" r="8" fill="#FFD45C"/>
  </g>`,
);

files['ui/order.svg'] = svg(
  '0 0 120 130',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 18h72v100H24z" fill="#FFF7E4"/>
    <path d="M40 12h40v14H40z" fill="#6EC1E4"/>
    <path d="M40 48h40M40 68h40M40 88h26" fill="none" stroke="#C9B79A" stroke-width="3.2"/>
    <circle cx="88" cy="96" r="16" fill="#F26A5B"/>
    <path d="M82 96l5 5 9-10" fill="none" stroke="#FFFFFF" stroke-width="4"/>
  </g>`,
);

files['ui/hand.svg'] = svg(
  '0 0 110 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 96V56c0-6 4-10 10-10s10 4 10 10" fill="#FFE0C2"/>
    <path d="M52 56V36c0-6 4-10 10-10s10 4 10 10v20" fill="#FFE0C2"/>
    <path d="M72 56V44c0-6 4-10 10-10s10 4 10 10v42c0 22-14 34-34 34-14 0-24-6-30-18l-14-24c-3-6 0-12 6-13 5-1 9 2 12 7l6 10" fill="#FFE0C2"/>
  </g>`,
);

files['ui/feed.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 34h52l-8 68H42z" fill="#FFD45C"/>
    <path d="M28 24h64v14H28z" fill="#E8A93A"/>
    <path d="M60 40v58" fill="none" stroke="#E8A93A" stroke-width="4"/>
    <circle cx="60" cy="70" r="9" fill="#F26A5B" stroke-width="4"/>
  </g>`,
);

files['ui/water.svg'] = svg(
  '0 0 110 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M55 16c14 20 26 34 26 52 0 16-12 28-26 28S29 84 29 68c0-18 12-32 26-52z" fill="#6EC1E4"/>
    <path d="M44 74c2-10 6-18 11-24" fill="none" stroke="#FFFFFF" stroke-width="3.2" opacity=".8"/>
  </g>`,
);

files['ui/seed.svg'] = svg(
  '0 0 110 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 44h50l-6 62H36z" fill="#D8B98A"/>
    <path d="M24 32h62v14H24z" fill="#B5754A"/>
    <path d="M55 62c-8 6-10 16-4 24 8 0 12-8 12-16" fill="#8ED66B"/>
  </g>`,
);

files['ui/bucket.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 34h60l-8 70H38z" fill="#D6DEE6"/>
    <path d="M24 24h72v14H24z" fill="#B6C2CC"/>
    <path d="M40 24c0-14 40-14 40 0" fill="none"/>
    <path d="M44 60h32" fill="none" stroke="#9FB0BD" stroke-width="4"/>
  </g>`,
);

files['ui/basket.svg'] = svg(
  '0 0 120 110',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 40h88l-10 56H26z" fill="#E0A96D"/>
    <path d="M34 40c0-22 52-22 52 0" fill="none" stroke="#C98B4B" stroke-width="8"/>
    <path d="M24 60h72M28 80h64" fill="none" stroke="#C98B4B" stroke-width="4"/>
  </g>`,
);

files['ui/decor.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 104V64" fill="none" stroke="#63B96B" stroke-width="8"/>
    <path d="M60 92c-16 0-24-10-24-20 14-2 22 8 24 20zM60 84c14-4 18-16 16-26-14 0-20 12-16 26z" fill="#8ED66B"/>
    <g fill="#FF9CC1"><circle cx="60" cy="34" r="13"/><circle cx="40" cy="30" r="11"/><circle cx="80" cy="30" r="11"/><circle cx="48" cy="50" r="10"/><circle cx="72" cy="50" r="10"/></g>
    <circle cx="60" cy="40" r="9" fill="#FFD45C"/>
  </g>`,
);

files['ui/clock.svg'] = svg(
  '0 0 110 110',
  `  <circle cx="55" cy="55" r="44" fill="#FFF7E4" stroke="${INK}" stroke-width="2.6"/>
  <path d="M55 30v26l18 12" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="55" cy="55" r="4" fill="${INK}" stroke="none"/>`,
);

files['ui/gear.svg'] = svg(
  '0 0 110 110',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linejoin="round">
    <path d="M55 8l8 12 14-4 2 14 14 4-8 12 8 12-14 4-2 14-14-4-8 12-8-12-14 4-2-14-14-4 8-12-8-12 14-4 2-14 14 4z" fill="#B6C2CC"/>
    <circle cx="55" cy="55" r="14" fill="#FFF7E4"/>
  </g>`,
);

files['ui/brush.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 76l30-52 18 12-30 50z" fill="#E0A96D"/>
    <path d="M36 74c10-2 18 2 22 10 2 8-2 16-10 18s-16-2-18-10c-2-8 0-16 6-18z" fill="#FFD45C"/>
  </g>`,
);

files['ui/soap.svg'] = svg(
  '0 0 110 110',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linejoin="round">
    <path d="M20 40h70v50H20z" fill="#A8E3F7"/>
    <path d="M20 40c0-12 16-20 35-20s35 8 35 20z" fill="#7FD1EE"/>
    <circle cx="42" cy="62" r="6" fill="#FFFFFF" stroke="none"/>
    <circle cx="62" cy="72" r="5" fill="#FFFFFF" stroke="none"/>
  </g>`,
);

files['ui/close.svg'] = svg(
  '0 0 100 100',
  `  <circle cx="50" cy="50" r="40" fill="#F26A5B" stroke="${INK}" stroke-width="2.6"/>
  <path d="M36 36l28 28M64 36L36 64" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`,
);

files['ui/check.svg'] = svg(
  '0 0 100 100',
  `  <circle cx="50" cy="50" r="40" fill="#8ED66B" stroke="${INK}" stroke-width="2.6"/>
  <path d="M30 52l14 14 26-30" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
);

files['ui/music.svg'] = svg(
  '0 0 100 100',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 74V26l34-8v48" fill="none"/>
    <ellipse cx="30" cy="76" rx="14" ry="11" fill="#FF9CC1"/>
    <ellipse cx="64" cy="68" rx="14" ry="11" fill="#FF9CC1"/>
  </g>`,
);

files['ui/sound_off.svg'] = svg(
  '0 0 100 100',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 38h14l18-16v56L38 62H24z" fill="#CDE9F5"/>
    <path d="M68 40l20 20M88 40L68 60" fill="none"/>
  </g>`,
);

files['ui/rainbow.svg'] = svg(
  '0 0 200 120',
  `  <g fill="none" stroke-linecap="round" stroke-width="12">
    <path d="M14 112a86 86 0 0 1 172 0" stroke="#F26A5B"/>
    <path d="M30 112a70 70 0 0 1 140 0" stroke="#F5A623"/>
    <path d="M46 112a54 54 0 0 1 108 0" stroke="#FFD45C"/>
    <path d="M62 112a38 38 0 0 1 76 0" stroke="#8ED66B"/>
    <path d="M78 112a22 22 0 0 1 44 0" stroke="#6EC1E4"/>
  </g>`,
);

/* ============================ 食物成品 ============================ */

files['food/milk.svg'] = svg(
  '0 0 110 130',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 40h54v72H28z" fill="#FFFFFF"/>
    <path d="M28 40l8-20h38l8 20z" fill="#EAF2F7"/>
    <path d="M28 40h54v34H28z" fill="#FFFDF5"/>
    <path d="M46 20v20" fill="none" stroke="#CDE9F5" stroke-width="3.2"/>
    <circle cx="44" cy="88" r="5" fill="#CDE9F5" stroke="none"/>
    <circle cx="64" cy="96" r="4" fill="#CDE9F5" stroke="none"/>
  </g>`,
);

files['food/strawberry_milk.svg'] = svg(
  '0 0 120 140',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 34h44l-6 88H46z" fill="#FFC7D8"/>
    <path d="M36 24h52v14H36z" fill="#FF9CC1"/>
    <path d="M64 18v-10" fill="none" stroke="#F0524A" stroke-width="3.2"/>
    <path d="M54 60c8-6 14-6 20 0" fill="none" stroke="#F26A5B" stroke-width="3.2"/>
    <path d="M56 96h16" fill="none" stroke="#FF8FB1" stroke-width="2.6"/>
    <circle cx="52" cy="80" r="5" fill="#F0524A" stroke="none"/>
  </g>`,
);

files['food/tomato_salad.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 56h102c0 34-22 52-51 52S14 90 14 56z" fill="#EAF2F7"/>
    <path d="M8 46h114v12H8z" fill="#D6DEE6"/>
    <circle cx="44" cy="44" r="16" fill="#F0524A"/>
    <circle cx="74" cy="40" r="14" fill="#F0524A"/>
    <path d="M96 44c8-8 18-8 22 0-6 8-16 8-22 0z" fill="#8ED66B"/>
    <path d="M30 52c8 6 18 6 26 0" fill="none" stroke="#8ED66B" stroke-width="3.2"/>
  </g>`,
);

files['food/corn_soup.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 52h98c0 32-20 52-49 52S16 84 16 52z" fill="#FFF7E4"/>
    <path d="M8 42h114v12H8z" fill="#D6DEE6"/>
    <path d="M40 42c0-14 50-14 50 0" fill="none" stroke="#FFD45C" stroke-width="8"/>
    <circle cx="52" cy="66" r="7" fill="#FFD45C" stroke-width="4"/>
    <circle cx="78" cy="76" r="6" fill="#FFD45C" stroke-width="4"/>
    <path d="M34 90c8 4 18 4 26 0" fill="none" stroke="#E8A93A" stroke-width="2.6"/>
  </g>`,
);

files['food/pumpkin_pie.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 62h106c0 30-22 46-53 46S12 92 12 62z" fill="#E8A93A"/>
    <path d="M6 50h118v14H6z" fill="#D08C28"/>
    <path d="M32 50c0-16 66-16 66 0" fill="none" stroke="#F5A623" stroke-width="8"/>
    <path d="M40 60l14 12 14-12 14 12" fill="none" stroke="#FFD45C" stroke-width="2.6"/>
  </g>`,
);

files['food/veggie_sandwich.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 46c0-14 20-22 47-22s47 8 47 22z" fill="#F0C682"/>
    <path d="M14 46h102v10H14z" fill="#8ED66B"/>
    <path d="M14 56h102v10H14z" fill="#F0524A"/>
    <path d="M14 66h102v10H14z" fill="#FFD45C"/>
    <path d="M14 76h102v18H14z" fill="#F0C682"/>
    <path d="M34 34h62" fill="none" stroke="#D9A76B" stroke-width="2.6"/>
  </g>`,
);

files['food/rainbow_cup.svg'] = svg(
  '0 0 120 140',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M26 36h68l-8 84H34z" fill="#EAF2F7"/>
    <path d="M26 36h68v12H26z" fill="#D6DEE6"/>
    <circle cx="52" cy="56" r="9" fill="#F0524A" stroke-width="4"/>
    <circle cx="72" cy="62" r="8" fill="#FFD45C" stroke-width="4"/>
    <circle cx="58" cy="80" r="8" fill="#8ED66B" stroke-width="4"/>
    <circle cx="78" cy="92" r="7" fill="#F5A623" stroke-width="4"/>
    <path d="M62 22v14" fill="none" stroke="#FF9CC1" stroke-width="3.2"/>
    <path d="M62 20c8-8 18-4 18 6" fill="none" stroke="#FF9CC1" stroke-width="2.6"/>
  </g>`,
);

files['food/creamy_carrot.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 56h110c0 30-24 50-55 50S10 86 10 56z" fill="#FFF7E4"/>
    <path d="M4 46h122v12H4z" fill="#D6DEE6"/>
    <path d="M40 46c-10-8-4-22 8-18 4-12 22-10 22 2 10-4 18 6 12 16z" fill="#F47A45"/>
    <path d="M56 30c-6-6-4-14 4-16" fill="none" stroke="#63B96B" stroke-width="3.2"/>
    <path d="M40 84c10 5 24 5 34 0" fill="none" stroke="#F47A45" stroke-width="2.6"/>
  </g>`,
);

files['food/fruit.svg'] = svg(
  '0 0 120 120',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="44" cy="70" r="26" fill="#F0524A"/>
    <circle cx="78" cy="74" r="22" fill="#F5A623"/>
    <path d="M44 44V22" fill="none" stroke="#63B96B" stroke-width="3.4"/>
    <path d="M44 30c10-10 22-8 26 0-10 8-20 8-26 0z" fill="#8ED66B"/>
    <path d="M30 58c6-8 12-12 18-14" fill="none" stroke="#FFFFFF" stroke-width="2.6" opacity=".6"/>
  </g>`,
);

files['food/egg_food.svg'] = svg(
  '0 0 120 110',
  `  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 74h96c0 16-20 26-48 26S12 90 12 74z" fill="#FFF7E4"/>
    <path d="M6 68h108v10H6z" fill="#D6DEE6"/>
    <ellipse cx="60" cy="50" rx="34" ry="26" fill="#FFFDF5"/>
    <circle cx="60" cy="50" r="15" fill="#FFD45C"/>
  </g>`,
);

/* ============================ 写入 ============================ */

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}
console.log(`[generate-art-ui] 已生成 ${count} 个 SVG 图标 -> src/assets/`);
