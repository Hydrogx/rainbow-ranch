/**
 * 《小小彩虹牧场》美术资源生成器
 * ------------------------------------------------------------
 * 所有画面资源都是矢量 SVG，保存在 src/assets/ 下：
 *   - 运行时通过 Vite 的 `?raw` 直接打包进 JS，再用 Canvas 栅格化成 Phaser 贴图，
 *     因此游戏不依赖任何 CDN / 外部图片，离线也能玩。
 *   - 同时由 scripts/sync-assets.mjs 复制到 public/assets/，
 *     方便美术直接替换文件（目录结构与 PRD 第 11.2 节一致）。
 *
 * 运行：node scripts/generate-art.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');

/** 统一描边风格：暖棕色圆头圆角描边 */
const INK = '#5A3D2E';

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${viewBox.split(' ')[2]}" height="${viewBox.split(' ')[3]}">\n${body}\n</svg>\n`;

const files = {};

/* ============================================================
 * 动物
 * ------------------------------------------------------------
 * 三种动物的单帧素材与全部动作帧改由 scripts/generate-animal-anim.mjs 生成
 * （见 npm run art 的执行顺序），这里不再重复定义，避免两份美术不一致。
 * ============================================================ */

/* ============================================================
 * 主人公（统一 120x200 坐标系，便于叠加装扮）
 * ============================================================ */

const FEET = `    <path d="M50 134v34M70 134v34" fill="none" stroke="#FFD9B8" stroke-width="14"/>
    <path d="M40 168c0-3 3-5 6-5h9c3 0 5 2 5 5v9c0 3-2 5-5 5H46c-3 0-6-2-6-5z" fill="#F47A45"/>
    <path d="M60 168c0-3 2-5 5-5h9c3 0 6 2 6 5v9c0 3-3 5-6 5H65c-3 0-5-2-5-5z" fill="#F47A45"/>`;

const FACE = `    <circle cx="48" cy="56" r="5" fill="#30251F" stroke="none"/>
    <circle cx="72" cy="56" r="5" fill="#30251F" stroke="none"/>
    <circle cx="49.5" cy="54" r="1.8" fill="#FFFFFF" stroke="none"/>
    <circle cx="73.5" cy="54" r="1.8" fill="#FFFFFF" stroke="none"/>
    <path d="M53 68c4 5 10 5 14 0" fill="none"/>
    <circle cx="38" cy="65" r="6" fill="#FFB3B3" stroke="none" opacity=".85"/>
    <circle cx="82" cy="65" r="6" fill="#FFB3B3" stroke="none" opacity=".85"/>`;

files['characters/boy.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
${FEET}
    <path d="M40 96c-6 5-9 16-10 26" fill="none" stroke="#FFD9B8" stroke-width="13"/>
    <path d="M80 96c6 5 9 16 10 26" fill="none" stroke="#FFD9B8" stroke-width="13"/>
    <path d="M38 92c0-7 10-11 22-11s22 4 22 11v26c0 9-10 13-22 13s-22-4-22-13z" fill="#67C7F0"/>
    <path d="M38 116h44v14c0 9-10 13-22 13s-22-4-22-13z" fill="#5B8DEF"/>
    <ellipse cx="60" cy="54" rx="33" ry="32" fill="#FFE0C2"/>
    <path d="M27 48c2-22 17-33 33-33s31 11 33 33c-8-11-18-15-33-15s-25 4-33 15z" fill="#8B5A2B"/>
${FACE}
  </g>`,
);

files['characters/girl.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="24" cy="66" r="13" fill="#C4622D"/>
    <circle cx="96" cy="66" r="13" fill="#C4622D"/>
${FEET}
    <path d="M40 96c-6 5-9 16-10 26" fill="none" stroke="#FFD9B8" stroke-width="13"/>
    <path d="M80 96c6 5 9 16 10 26" fill="none" stroke="#FFD9B8" stroke-width="13"/>
    <path d="M40 90c0-6 9-9 20-9s20 3 20 9l14 42c2 6-3 10-9 10H35c-6 0-11-4-9-10z" fill="#FF9CC1"/>
    <path d="M46 111h28" fill="none"/>
    <ellipse cx="60" cy="54" rx="33" ry="32" fill="#FFE0C2"/>
    <path d="M25 58c-4-26 12-43 35-43s39 17 35 43c-4-6-6-12-6-20-10 6-22 9-29 9s-19-3-29-9c0 8-2 14-6 20z" fill="#C4622D"/>
${FACE}
  </g>`,
);

// 帽子（叠在头顶）
files['characters/hat_straw.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="60" cy="34" rx="46" ry="14" fill="#F2C879"/>
    <path d="M30 32c0-22 12-32 30-32s30 10 30 32z" fill="#FFDF9E"/>
    <path d="M30 26h60" fill="none" stroke="#E05A6B" stroke-width="7"/>
  </g>`,
);

files['characters/hat_rain.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 36c0-24 18-38 42-38s42 14 42 38z" fill="#FFD45C"/>
    <path d="M18 34c-4 8 4 12 10 10M102 34c4 8-4 12-10 10" fill="none"/>
    <path d="M22 40h76" fill="none"/>
  </g>`,
);

files['characters/hat_chef.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 24c-14-4-16-24 0-24 4-10 20-10 24 0 10-8 22-2 22 10 12 2 12 14 2 14z" fill="#FFFFFF"/>
    <path d="M30 24h60v12H30z" fill="#F4F7FA"/>
    <path d="M36 20v12M60 20v12M84 20v12" fill="none" stroke="#D8E3EC"/>
  </g>`,
);

files['characters/ears.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 26L14 2l22 8z" fill="#FFB3C7"/>
    <path d="M98 26l8-24-22 8z" fill="#FFB3C7"/>
    <path d="M40 22h40" fill="none" stroke="#FF8FB1" stroke-width="8"/>
  </g>`,
);

files['characters/hairpin.svg'] = svg(
  '0 0 120 200',
  `  <path d="M30 22l4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1z" fill="#FFD45C" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
);

files['characters/scarf.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M38 84h44v12H38z" fill="#FF6F91"/>
    <path d="M72 92h16l4 34-16 4z" fill="#FF9CC1"/>
    <path d="M36 88h48" fill="none" stroke="#FFD45C" stroke-width="4"/>
  </g>`,
);

files['characters/overalls.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M38 112h44v20c0 9-10 13-22 13s-22-4-22-13z" fill="#5B8DEF"/>
    <path d="M46 96v18M74 96v18" fill="none" stroke="#5B8DEF" stroke-width="9"/>
    <circle cx="46" cy="112" r="4" fill="#FFD45C" stroke-width="3"/>
    <circle cx="74" cy="112" r="4" fill="#FFD45C" stroke-width="3"/>
  </g>`,
);

files['characters/raincoat.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 88c0-8 11-12 24-12s24 4 24 12v30c0 10-11 14-24 14s-24-4-24-14z" fill="#FFD45C"/>
    <path d="M60 78v52" fill="none" stroke="#E8A93A"/>
    <circle cx="60" cy="102" r="4" fill="#E8A93A"/>
  </g>`,
);

files['characters/boots.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 140h12v30c0 3-2 5-5 5H46c-3 0-6-2-6-5z" fill="#67C7F0"/>
    <path d="M64 140h12v30c0 3-2 5-5 5H66c-3 0-6-2-6-5z" fill="#67C7F0"/>
    <path d="M38 160h22v10c0 3-2 5-5 5H44c-3 0-6-2-6-5z" fill="#3E9BD1"/>
    <path d="M62 160h22v10c0 3-3 5-6 5H65c-3 0-5-2-5-5z" fill="#3E9BD1"/>
  </g>`,
);

files['characters/sneakers.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 166c0-3 3-5 6-5h9c3 0 5 2 5 5v11c0 3-2 5-5 5H46c-3 0-6-2-6-5z" fill="#B6E36B"/>
    <path d="M60 166c0-3 2-5 5-5h9c3 0 6 2 6 5v11c0 3-3 5-6 5H65c-3 0-5-2-5-5z" fill="#B6E36B"/>
    <path d="M42 175h18M62 175h18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
  </g>`,
);

files['characters/backpack.svg'] = svg(
  '0 0 120 200',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 104c0-8 6-14 14-14h28c8 0 14 6 14 14v26c0 8-6 14-14 14H46c-8 0-14-6-14-14z" fill="#A97BE0"/>
    <path d="M44 90c0-6 6-10 16-10s16 4 16 10" fill="none"/>
    <path d="M48 122h24" fill="none" stroke="#FFD45C" stroke-width="5"/>
  </g>`,
);

/* ============================================================
 * 蔬菜（成熟期）
 * ============================================================ */

files['crops/carrot.svg'] = svg(
  '0 0 120 140',
  `  <path d="M60 47C43 68 34 95 60 126c26-31 17-58 0-79z" fill="#F47A45" stroke="${INK}" stroke-width="5"/>
  <path d="M60 52C43 36 25 39 19 25M60 52c17-16 35-13 41-27M60 49C58 28 68 16 84 12" fill="none" stroke="#63B96B" stroke-width="10" stroke-linecap="round"/>
  <path d="M49 72c7 4 14 4 21 0M46 88c9 4 19 4 28 0" fill="none" stroke="#D95834" stroke-width="4" stroke-linecap="round"/>`,
);

files['crops/tomato.svg'] = svg(
  '0 0 120 140',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 40v18" fill="none" stroke="#63B96B" stroke-width="8"/>
    <path d="M60 58c-8-10-22-10-28 0-6 12-4 24-4 30 0 18 14 30 32 30s32-12 32-30c0-6 2-18-4-30-6-10-20-10-28 0z" fill="#F0524A"/>
    <path d="M42 44c8 2 28 2 36 0-4 10-10 14-18 14s-14-4-18-14z" fill="#63B96B"/>
    <path d="M44 84c6-10 10-16 12-22" fill="none" stroke="#FFFFFF" stroke-width="6" opacity=".55"/>
  </g>`,
);

files['crops/corn.svg'] = svg(
  '0 0 120 140',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M56 30c-10 8-14 24-12 44 2 26 8 40 16 44 8-4 14-18 16-44 2-20-2-36-12-44z" fill="#FFD45C"/>
    <path d="M54 44c8 4 14 4 20 0M52 62c10 5 18 5 26 0M52 80c10 5 18 5 26 0M54 98c8 4 14 4 20 0" fill="none" stroke="#E8A93A" stroke-width="4"/>
    <path d="M44 44c-16 10-22 34-14 54 10 2 18-6 22-18" fill="#63B96B"/>
    <path d="M78 44c16 10 22 34 14 54-10 2-18-6-22-18" fill="#63B96B"/>
  </g>`,
);

files['crops/pumpkin.svg'] = svg(
  '0 0 140 140',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M70 34c-6-14 4-24 16-24" fill="none" stroke="#63B96B" stroke-width="9"/>
    <path d="M70 30c30 0 52 18 52 44s-22 46-52 46-52-20-52-46 22-44 52-44z" fill="#F58A2E"/>
    <path d="M70 30c-16 10-24 26-24 44s8 34 24 46M70 30c16 10 24 26 24 44s-8 34-24 46" fill="none" stroke="#D96A15" stroke-width="4"/>
  </g>`,
);

files['crops/lettuce.svg'] = svg(
  '0 0 130 140',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M65 122c-30 0-48-16-48-36 0-12 8-18 14-18-4-14 8-26 20-22 2-14 24-16 28-2 12-4 24 8 20 22 6 0 14 6 14 18 0 20-18 38-48 38z" fill="#8ED66B"/>
    <path d="M65 122V74M65 96c-8-6-14-14-16-24M65 96c8-6 14-14 16-24" fill="none" stroke="#5FA845" stroke-width="4"/>
    <path d="M45 60c8-4 16-6 24-6" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".5"/>
  </g>`,
);

files['crops/strawberry.svg'] = svg(
  '0 0 120 140',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 36v14" fill="none" stroke="#63B96B" stroke-width="8"/>
    <path d="M60 48c-24 0-38 14-38 32 0 20 20 42 38 42s38-22 38-42c0-18-14-32-38-32z" fill="#F0524A"/>
    <path d="M34 52c10-6 18-8 26-8s16 2 26 8c-6 12-14 16-26 16s-20-4-26-16z" fill="#63B96B"/>
    <g fill="#FFF3C4" stroke="none">
      <circle cx="46" cy="78" r="2.6"/><circle cx="62" cy="74" r="2.6"/><circle cx="76" cy="80" r="2.6"/>
      <circle cx="52" cy="94" r="2.6"/><circle cx="70" cy="94" r="2.6"/><circle cx="60" cy="108" r="2.6"/>
    </g>
    <path d="M40 84c4-8 8-14 12-18" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".5"/>
  </g>`,
);

/* ============================================================
 * 场景建筑与道具
 * ============================================================ */

files['props/egg.svg'] = svg(
  '0 0 100 120',
  `  <ellipse cx="50" cy="63" rx="34" ry="46" fill="#FFF8E7" stroke="${INK}" stroke-width="5"/>
  <path d="M31 44c9-15 28-21 42-9" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".8"/>
  <circle cx="75" cy="82" r="5" fill="#FFD45C"/>`,
);

files['props/egg_color.svg'] = svg(
  '0 0 100 120',
  `  <ellipse cx="50" cy="63" rx="34" ry="46" fill="#BEE9FF" stroke="${INK}" stroke-width="5"/>
  <path d="M31 44c9-15 28-21 42-9" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".85"/>
  <circle cx="66" cy="72" r="6" fill="#FF9CC1" stroke="none"/>
  <circle cx="40" cy="86" r="5" fill="#FFD45C" stroke="none"/>
  <circle cx="58" cy="100" r="4" fill="#8ED66B" stroke="none"/>`,
);

files['props/egg_gold.svg'] = svg(
  '0 0 100 120',
  `  <ellipse cx="50" cy="63" rx="34" ry="46" fill="#FFE58A" stroke="${INK}" stroke-width="5"/>
  <path d="M31 44c9-15 28-21 42-9" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity=".9"/>
  <path d="M50 22l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z" fill="#FFF3B0" stroke="#E8A93A" stroke-width="3"/>
  <circle cx="74" cy="86" r="6" fill="#FFFFFF" stroke="none" opacity=".8"/>`,
);

files['props/cottage.svg'] = svg(
  '0 0 280 240',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 120h200v110H40z" fill="#FFE9C9"/>
    <path d="M20 124L140 26l120 98z" fill="#E2695C"/>
    <path d="M120 40V8h26v22" fill="#B4553F"/>
    <path d="M110 230v-64c0-8 6-14 14-14h32c8 0 14 6 14 14v64z" fill="#B5754A"/>
    <circle cx="158" cy="200" r="6" fill="#FFD45C" stroke-width="4"/>
    <g fill="#9ED8F5"><rect x="62" y="146" width="42" height="42" rx="10"/><rect x="176" y="146" width="42" height="42" rx="10"/></g>
    <path d="M83 146v42M62 167h42M197 146v42M176 167h42" fill="none" stroke-width="4"/>
    <path d="M196 34c14-10 30 4 22 18" fill="none" stroke="#D9E6EE" stroke-width="7" opacity=".9"/>
    <path d="M36 148c14-6 24 2 24 12s-10 18-24 12z" fill="#8ED66B"/>
  </g>`,
);

files['props/barn.svg'] = svg(
  '0 0 300 240',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 110h212v120H44z" fill="#E2695C"/>
    <path d="M28 112L150 20l122 92z" fill="#C9553F"/>
    <path d="M150 44v34M126 60l48 0" fill="none" stroke="#FFF7E4" stroke-width="8"/>
    <path d="M108 230v-82c0-10 8-18 18-18h48c10 0 18 8 18 18v82z" fill="#FFF7E4"/>
    <path d="M108 190h84M150 130v100" fill="none" stroke="#C9553F" stroke-width="6"/>
    <g fill="#C9553F"><rect x="62" y="140" width="34" height="34" rx="8"/><rect x="204" y="140" width="34" height="34" rx="8"/></g>
  </g>`,
);

files['props/coop.svg'] = svg(
  '0 0 240 210',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 92h160v112H40z" fill="#F0C682"/>
    <path d="M24 96L120 26l96 70z" fill="#D97B4F"/>
    <path d="M104 204v-52c0-10 8-18 18-18s18 8 18 18v52z" fill="#8B5A2B"/>
    <circle cx="120" cy="168" r="16" fill="#5A3D2E"/>
    <path d="M52 118h36v30H52zM152 118h36v30h-36z" fill="#FFF3D6"/>
    <path d="M40 204l-30 0 0-26z" fill="#D9A76B"/>
    <path d="M64 52h14M162 52h14" fill="none" stroke="#FFE9C9" stroke-width="6"/>
  </g>`,
);

files['props/well.svg'] = svg(
  '0 0 150 180',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 96h90v66H30z" fill="#C9CFD6"/>
    <path d="M22 100h106v18H22z" fill="#AEB6BF"/>
    <path d="M36 154h78" fill="none"/>
    <path d="M36 96V44M114 96V44" fill="none"/>
    <path d="M18 48L75 12l57 36z" fill="#D97B4F"/>
    <path d="M75 44v22" fill="none"/>
    <path d="M59 68h32l-6 22H65z" fill="#B5754A"/>
    <ellipse cx="75" cy="96" rx="30" ry="10" fill="#6EC1E4"/>
  </g>`,
);

files['props/warehouse.svg'] = svg(
  '0 0 260 210',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 84h192v114H34z" fill="#E8CFA6"/>
    <path d="M20 88L130 16l110 72z" fill="#8FA9C2"/>
    <path d="M88 198v-78c0-8 6-14 14-14h56c8 0 14 6 14 14v78z" fill="#B5754A"/>
    <path d="M130 106v92" fill="none"/>
    <path d="M46 112h30v30H46zM184 112h30v30h-30z" fill="#F6E7CC"/>
  </g>`,
);

files['props/kitchen.svg'] = svg(
  '0 0 250 210',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 84h178v114H36z" fill="#FFF0D2"/>
    <path d="M22 88L125 18l103 70z" fill="#7FC8A9"/>
    <path d="M100 198v-58c0-8 6-14 14-14h22c8 0 14 6 14 14v58z" fill="#B5754A"/>
    <g fill="#9ED8F5"><rect x="52" y="112" width="38" height="34" rx="8"/><rect x="160" y="112" width="38" height="34" rx="8"/></g>
    <path d="M40 46h34c0 12-4 18-17 18s-17-6-17-18z" fill="#C9CFD6"/>
    <path d="M57 26v20M46 62c-8 6-6 18 4 18" fill="none"/>
    <path d="M206 40c10-8 22 0 18 12" fill="none" stroke="#D9E6EE" stroke-width="7"/>
  </g>`,
);

files['props/shop.svg'] = svg(
  '0 0 260 220',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 96h180v104H40z" fill="#FFF3DC"/>
    <path d="M20 100L130 24l110 76z" fill="#F0A6C0"/>
    <path d="M52 100h156v26H52z" fill="#FFF7E4"/>
    <g fill="#F26A5B">
      <path d="M64 100h26v26H64zM116 100h26v26h-26zM168 100h26v26h-26z"/>
    </g>
    <path d="M64 126h26v74H64zM170 126h26v74h-26z" fill="#FFE1C4"/>
    <path d="M112 148h36v52h-36z" fill="#B5754A"/>
    <circle cx="140" cy="176" r="5" fill="#FFD45C" stroke-width="4"/>
  </g>`,
);

files['props/tree.svg'] = svg(
  '0 0 220 250',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M96 244v-70h28v70z" fill="#B5754A"/>
    <path d="M110 180c-14-16-24-8-22 4" fill="none" stroke="#B5754A" stroke-width="10"/>
    <circle cx="70" cy="112" r="44" fill="#7CC46A"/>
    <circle cx="140" cy="100" r="48" fill="#8ED66B"/>
    <circle cx="108" cy="70" r="46" fill="#9EE07C"/>
    <circle cx="112" cy="130" r="40" fill="#7CC46A"/>
    <circle cx="86" cy="72" r="10" fill="#F0524A" stroke-width="4"/>
    <circle cx="146" cy="126" r="10" fill="#F0524A" stroke-width="4"/>
    <circle cx="130" cy="60" r="9" fill="#FFD45C" stroke-width="4"/>
  </g>`,
);

files['props/bush.svg'] = svg(
  '0 0 150 110',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="46" cy="66" r="34" fill="#7CC46A"/>
    <circle cx="94" cy="60" r="30" fill="#8ED66B"/>
    <circle cx="72" cy="46" r="28" fill="#9EE07C"/>
    <circle cx="60" cy="58" r="7" fill="#FF9CC1" stroke-width="4"/>
    <circle cx="100" cy="72" r="6" fill="#FFD45C" stroke-width="4"/>
  </g>`,
);

files['props/trough.svg'] = svg(
  '0 0 160 80',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 22h128v26c0 14-12 22-28 22H44c-16 0-28-8-28-22z" fill="#E0A96D"/>
    <path d="M8 16h144v14H8z" fill="#C98B4B"/>
    <path d="M30 34h100" fill="none" stroke="#FFD45C" stroke-width="8"/>
  </g>`,
);

files['props/water_trough.svg'] = svg(
  '0 0 160 80',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 22h128v26c0 14-12 22-28 22H44c-16 0-28-8-28-22z" fill="#BFD4DE"/>
    <path d="M8 16h144v14H8z" fill="#9FB8C6"/>
    <path d="M30 36c30-8 70-8 100 0" fill="none" stroke="#6EC1E4" stroke-width="7"/>
  </g>`,
);

files['props/haypile.svg'] = svg(
  '0 0 170 130',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 122c0-30 22-58 66-58s68 26 68 58z" fill="#FFD45C"/>
    <path d="M42 118c8-22 24-40 46-48M118 118c-6-22-22-40-44-48" fill="none" stroke="#E8A93A" stroke-width="4"/>
    <path d="M60 116c4-16 12-26 22-32" fill="none" stroke="#E8A93A" stroke-width="4"/>
  </g>`,
);

files['props/crate.svg'] = svg(
  '0 0 120 110',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 26h96v74H12z" fill="#E0A96D"/>
    <path d="M12 42h96M12 84h96M34 26v74M86 26v74" fill="none" stroke="#C98B4B"/>
    <path d="M8 18h104v12H8z" fill="#C98B4B"/>
  </g>`,
);

files['props/watering_can.svg'] = svg(
  '0 0 130 120',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 44h56v60H36z" fill="#6EC1E4"/>
    <path d="M92 58l24-16 8 12-24 16z" fill="#3E9BD1"/>
    <path d="M36 60c-14 0-20 10-14 20" fill="none"/>
    <path d="M48 44c0-12 32-12 32 0" fill="none"/>
    <path d="M52 74h24" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".7"/>
  </g>`,
);

files['props/milk_pail.svg'] = svg(
  '0 0 130 130',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 38h66l-8 76H40z" fill="#D6DEE6"/>
    <path d="M26 30h78v14H26z" fill="#B6C2CC"/>
    <path d="M42 30c0-16 46-16 46 0" fill="none"/>
    <path d="M48 62h34" fill="none" stroke="#9FB0BD" stroke-width="5"/>
  </g>`,
);

files['props/basket.svg'] = svg(
  '0 0 140 120',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 44h104l-12 62H30z" fill="#E0A96D"/>
    <path d="M40 44c0-26 60-26 60 0" fill="none" stroke="#C98B4B" stroke-width="10"/>
    <path d="M26 66h88M30 86h80M48 44v62M70 44v62M92 44v62" fill="none" stroke="#C98B4B" stroke-width="4"/>
  </g>`,
);

files['props/sign.svg'] = svg(
  '0 0 170 140',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M76 60h14v74H76z" fill="#B5754A"/>
    <path d="M14 22h130l22 24-22 24H14z" fill="#E0A96D"/>
    <path d="M44 46h60" fill="none" stroke="#8B5A2B" stroke-width="8"/>
  </g>`,
);

files['props/windmill.svg'] = svg(
  '0 0 200 280',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M74 268l14-190h24l14 190z" fill="#FFF3DC"/>
    <path d="M88 78h24l-4-40H92z" fill="#E2695C"/>
    <path d="M100 60v-24" fill="none"/>
    <g fill="#FFFFFF"><path d="M100 54L20 26l30 40z"/><path d="M100 54l80-28-30 40z"/><path d="M100 54L72 132l40-30z"/></g>
    <g fill="#F0A6C0"><path d="M100 54L20 26l30 40z" opacity=".55"/></g>
    <circle cx="100" cy="54" r="10" fill="#FFD45C"/>
  </g>`,
);

files['props/rainbow_flag.svg'] = svg(
  '0 0 180 140',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 20v106" fill="none" stroke="#B5754A" stroke-width="10"/>
    <path d="M36 24h124v18H36z" fill="#F26A5B"/>
    <path d="M36 42h124v18H36z" fill="#F5A623"/>
    <path d="M36 60h124v18H36z" fill="#FFD45C"/>
    <path d="M36 78h124v18H36z" fill="#8ED66B"/>
    <path d="M36 96h124v18H36z" fill="#6EC1E4"/>
    <path d="M36 114h124v18H36z" fill="#A97BE0"/>
  </g>`,
);

files['props/mushroom.svg'] = svg(
  '0 0 110 110',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 58h30v40H40z" fill="#FFF3DC"/>
    <path d="M12 58c0-26 20-42 43-42s43 16 43 42z" fill="#F26A5B"/>
    <circle cx="36" cy="38" r="7" fill="#FFF3DC" stroke-width="4"/>
    <circle cx="66" cy="30" r="8" fill="#FFF3DC" stroke-width="4"/>
    <circle cx="80" cy="48" r="6" fill="#FFF3DC" stroke-width="4"/>
  </g>`,
);

files['props/mailbox.svg'] = svg(
  '0 0 120 170',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M54 76h12v86H54z" fill="#B5754A"/>
    <path d="M22 40h76v40H22z" fill="#6EC1E4"/>
    <path d="M22 40c0-14 12-22 26-22h28c14 0 24 8 24 22z" fill="#3E9BD1"/>
    <path d="M36 20v6M58 20v6M80 20v6M102 20v6" fill="none" stroke="#FFF3DC" stroke-width="5"/>
    <path d="M98 54h22l-10 14z" fill="#F26A5B"/>
  </g>`,
);

files['props/birdhouse.svg'] = svg(
  '0 0 130 190',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 96v90" fill="none" stroke="#B5754A" stroke-width="12"/>
    <path d="M22 54h84v52H22z" fill="#F5A623"/>
    <path d="M8 56L64 12l56 44z" fill="#E2695C"/>
    <circle cx="64" cy="76" r="14" fill="#5A3D2E"/>
    <path d="M40 116h48" fill="none" stroke="#B5754A" stroke-width="8"/>
  </g>`,
);

files['props/pumpkin_lantern.svg'] = svg(
  '0 0 130 130',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M65 32c-6-14 4-26 16-26" fill="none" stroke="#63B96B" stroke-width="9"/>
    <path d="M65 28c28 0 50 18 50 44s-22 44-50 44-50-18-50-44 22-44 50-44z" fill="#F5A623"/>
    <path d="M44 62l14 10-14 10zM86 62L72 72l14 10z" fill="#5A3D2E"/>
    <path d="M42 96c10 10 34 10 46 0-8 6-14 12-23 12s-15-6-23-12z" fill="#5A3D2E"/>
  </g>`,
);

files['props/flower.svg'] = svg(
  '0 0 90 120',
  `  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M45 116V56" fill="none" stroke="#63B96B" stroke-width="7"/>
    <path d="M45 92c-14 0-20-8-20-16 12-2 18 6 20 16z" fill="#63B96B"/>
    <g fill="#FF9CC1"><circle cx="45" cy="30" r="14"/><circle cx="24" cy="48" r="13"/><circle cx="66" cy="48" r="13"/><circle cx="33" cy="68" r="12"/><circle cx="57" cy="68" r="12"/></g>
    <circle cx="45" cy="50" r="11" fill="#FFD45C"/>
  </g>`,
);

files['props/pond.svg'] = svg(
  '0 0 280 150',
  `  <g stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="140" cy="86" rx="126" ry="56" fill="#7FD1EE"/>
    <ellipse cx="140" cy="82" rx="98" ry="38" fill="#A8E3F7" stroke="none"/>
    <path d="M60 78c14-8 34-8 48 0M170 92c14-8 34-8 48 0" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".7"/>
    <circle cx="112" cy="86" r="12" fill="#8ED66B"/>
    <circle cx="182" cy="112" r="10" fill="#8ED66B"/>
  </g>`,
);

files['props/rainbow.svg'] = svg(
  '0 0 300 170',
  `  <g fill="none" stroke-linecap="round" stroke-width="16">
    <path d="M20 160a130 130 0 0 1 260 0" stroke="#F26A5B"/>
    <path d="M40 160a110 110 0 0 1 220 0" stroke="#F5A623"/>
    <path d="M60 160a90 90 0 0 1 180 0" stroke="#FFD45C"/>
    <path d="M80 160a70 70 0 0 1 140 0" stroke="#8ED66B"/>
    <path d="M100 160a50 50 0 0 1 100 0" stroke="#6EC1E4"/>
    <path d="M120 160a30 30 0 0 1 60 0" stroke="#A97BE0"/>
  </g>`,
);

/* ============================================================
 * 写入磁盘
 * ============================================================ */

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}
console.log(`[generate-art] 已生成 ${count} 个 SVG 资源 -> src/assets/`);
