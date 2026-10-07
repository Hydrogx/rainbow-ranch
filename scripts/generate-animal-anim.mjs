/**
 * 动物动画 SVG 生成器
 * ----------------------------------------------------------------------------
 * 用"身体 + 头 + 四肢"零件拼出三种动物的三个动作：
 *   chicken / sheep / cow  ×  idle(原地休息) / walk(走路) / produce(生产：下蛋 / 产毛 / 挤奶)
 * 每帧沿用原有单帧素材的形状与配色，只做零件级的位移与替换。
 *
 * 导出：animals/<物种>_<动作>.svg（横排精灵图）
 *      src/data/animalFrames.ts（帧表）
 * 同时重新导出单帧 animals/<物种>.svg（= idle 第 0 帧的拼装结果），保证与动画一致。
 *
 * 运行：node scripts/generate-animal-anim.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');

const INK = '#5A3D2E';
const wrap = (w, h, body, frames) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w * frames}" height="${h}" viewBox="0 0 ${w * frames} ${h}" shape-rendering="geometricPrecision">\n${body}\n</svg>\n`;

/* ========================================================================== */
/* 小鸡 160x160                                                                */
/* ========================================================================== */

const CH_W = 160;
const CH_H = 160;

function chickenFrame({ by = 0, headDy = 0, legL = 0, legR = 0, eye = 'open', egg = false, combDy = 0, wingDy = 0 }) {
  const eyeArt =
    eye === 'closed'
      ? `<path d="M116 52h12" fill="none" stroke="#30251F" stroke-width="4"/>`
      : `<circle cx="122" cy="52" r="5" fill="#30251F" stroke="none"/>`;
  const eggArt = egg
    ? `<ellipse cx="80" cy="126" rx="13" ry="17" fill="#FFF8E7" stroke="${INK}" stroke-width="4"/>`
    : '';
  return `
  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(0 ${legL})"><path d="M68 128v19M59 148h18" fill="none"/></g>
    <g transform="translate(0 ${legR})"><path d="M94 128v19M85 148h18" fill="none"/></g>
    ${eggArt}
    <g transform="translate(0 ${by})">
      <ellipse cx="80" cy="91" rx="48" ry="39" fill="#FFF4C7"/>
      <g transform="translate(0 ${wingDy})">
        <path d="M36 83c-17-3-19-20-5-25 8-3 15 3 16 12" fill="#FFF8D8"/>
      </g>
      <g transform="translate(0 ${headDy})">
        <circle cx="112" cy="55" r="30" fill="#FFF8D8"/>
        <g transform="translate(0 ${combDy})">
          <path d="M101 31c5-18 17-18 20-2 12-13 24-5 17 9" fill="#F26A5B"/>
        </g>
        <path d="M139 58l18 8-18 9z" fill="#F5A623"/>
        ${eyeArt}
      </g>
    </g>
  </g>`;
}

const CHICKEN_ACTIONS = {
  idle: [
    { by: 0, headDy: 0, legL: 0, legR: 0 },
    { by: 2, headDy: 1, legL: 0, legR: 0, eye: 'closed' },
    { by: 0, headDy: 0, legL: 0, legR: 0 },
    { by: 1, headDy: 0, legL: 0, legR: 0, wingDy: -2 },
  ],
  walk: [
    { by: 0, legL: 0, legR: -6, headDy: 0 },
    { by: -3, legL: -3, legR: -3, headDy: -2 },
    { by: 0, legL: -6, legR: 0, headDy: 0 },
    { by: -3, legL: -3, legR: -3, headDy: -2, eye: 'closed' },
  ],
  // 生产：蹲下 → 下蛋 → 开心跳起来
  produce: [
    { by: 4, headDy: 3, combDy: 0 },
    { by: 6, headDy: 5, egg: true, eye: 'closed' },
    { by: -6, headDy: -4, egg: true, combDy: -3, wingDy: -4 },
    { by: 2, headDy: 1, egg: true },
  ],
};

/* ========================================================================== */
/* 绵羊 190x170                                                                */
/* ========================================================================== */

const SH_W = 190;
const SH_H = 170;

function sheepFrame({ by = 0, headDy = 0, legL = 0, legR = 0, legL2 = 0, legR2 = 0, eye = 'open', wool = 0, ball = false }) {
  const eyeArt =
    eye === 'closed'
      ? `<path d="M140 74h8M159 74h8" fill="none" stroke-width="4"/>`
      : `<circle cx="144" cy="74" r="4.5" fill="#30251F" stroke="none"/><circle cx="163" cy="74" r="4.5" fill="#30251F" stroke="none"/>`;
  const ballArt = ball
    ? `<g stroke="${INK}" stroke-width="5">
        <circle cx="164" cy="146" r="15" fill="#FFFDF7"/>
        <circle cx="150" cy="152" r="11" fill="#FFFDF7"/>
        <circle cx="176" cy="152" r="10" fill="#FFFDF7"/>
       </g>`
    : '';
  const r = (v) => 25 + v;
  return `
  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(0 ${legL})"><path d="M66 122v30M56 152h20" fill="none"/></g>
    <g transform="translate(0 ${legR})"><path d="M104 122v30M94 152h20" fill="none"/></g>
    <g transform="translate(${legL2} ${legR2})"><path d="M88 122v30" fill="none"/></g>
    ${ballArt}
    <g transform="translate(0 ${by})">
      <g fill="#FFFDF7">
        <circle cx="58" cy="88" r="${r(wool)}"/>
        <circle cx="92" cy="80" r="${r(wool) + 3}"/>
        <circle cx="124" cy="92" r="${r(wool) - 2}"/>
        <circle cx="76" cy="108" r="${r(wool) - 2}"/>
        <circle cx="110" cy="110" r="${r(wool) - 4}"/>
      </g>
      <g transform="translate(0 ${headDy})">
        <ellipse cx="152" cy="76" rx="27" ry="24" fill="#F3E3D3"/>
        <path d="M130 58c3-15 15-21 25-16 11-6 25 3 22 17" fill="#FFFDF7"/>
        <ellipse cx="127" cy="70" rx="10" ry="7" fill="#E7CDB6" transform="rotate(-25 127 70)"/>
        <ellipse cx="176" cy="68" rx="10" ry="7" fill="#E7CDB6" transform="rotate(25 176 68)"/>
        ${eyeArt}
        <path d="M148 90c4 4 9 4 13 0" fill="none"/>
        <circle cx="139" cy="86" r="5" fill="#F6B6B0" stroke="none" opacity=".8"/>
        <circle cx="167" cy="86" r="5" fill="#F6B6B0" stroke="none" opacity=".8"/>
      </g>
    </g>
  </g>`;
}

const SHEEP_ACTIONS = {
  idle: [
    {},
    { by: 2, headDy: 1, eye: 'closed' },
    {},
    { by: 1, headDy: 0 },
  ],
  walk: [
    { legL: 0, legR: -6, legL2: 0, legR2: 0 },
    { by: -2, legL: -3, legR: -3, legL2: -1, legR2: -1 },
    { legL: -6, legR: 0, legL2: 0, legR2: 0 },
    { by: -2, legL: -3, legR: -3, legL2: -1, legR2: -1, eye: 'closed' },
  ],
  // 生产：抖动 → 羊毛鼓起 → 掉出一团羊毛
  produce: [
    { by: 2, wool: -3, headDy: 2 },
    { by: -2, wool: 4, headDy: -2, eye: 'closed' },
    { by: 0, wool: 0, headDy: -1, ball: true },
    { by: 1, wool: 1, headDy: 0, ball: true },
  ],
};

/* ========================================================================== */
/* 奶牛 220x170                                                                */
/* ========================================================================== */

const CO_W = 220;
const CO_H = 170;

function cowFrame({ by = 0, headDy = 0, legL = 0, legR = 0, legL2 = 0, legR2 = 0, eye = 'open', tail = 0, milk = 0, bell = 0 }) {
  const eyeArt =
    eye === 'closed'
      ? `<path d="M155 69h14M181 69h14" fill="none" stroke-width="4"/>`
      : `<circle cx="162" cy="69" r="5" fill="#30251F" stroke="none"/><circle cx="188" cy="69" r="5" fill="#30251F" stroke="none"/>`;
  const milkArt = milk
    ? `<g stroke="none" fill="#FFFDF5">
        <rect x="166" y="${126 + milk}" width="4" height="10" rx="2"/>
        <rect x="174" y="${132 + milk}" width="4" height="8" rx="2"/>
        <rect x="182" y="${128 + milk}" width="4" height="9" rx="2"/>
       </g>`
    : '';
  return `
  <g stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(0 ${legL})"><path d="M69 137v23M58 160h22" fill="none"/></g>
    <g transform="translate(0 ${legR})"><path d="M111 137v23M100 160h22" fill="none"/></g>
    <g transform="translate(${legL2} ${legR2})"><path d="M143 130v30M132 160h22" fill="none"/></g>
    <g transform="translate(0 ${by})">
      <ellipse cx="105" cy="98" rx="72" ry="45" fill="#FFFDF5"/>
      <path d="M53 68c18-22 32 2 17 18-12 13-28 2-17-18z" fill="#8B6A59"/>
      <path d="M103 76c16-18 31 3 17 17-12 11-27-1-17-17z" fill="#8B6A59"/>
      <path d="M140 112c10-8 24 0 20 12-3 10-18 12-24 4" fill="#F2C9C4" stroke="none"/>
      <g transform="translate(0 ${tail})">
        <path d="M40 96c-10 8-8 22 2 26" fill="none"/>
      </g>
      <g transform="translate(0 ${headDy})">
        <path d="M151 45l-18-20M193 44l18-20" fill="none"/>
        <circle cx="174" cy="76" r="38" fill="#FFFDF5"/>
        <path d="M150 66c-13-19-30-15-34 0 7 9 25 9 34 0zM201 66c13-19 30-15 34 0-7 9-25 9-34 0z" fill="#EFA8A0"/>
        <path d="M171 88c-14 9-14 23 0 28 14-5 14-19 0-28z" fill="#EFA8A0"/>
        ${eyeArt}
        <g transform="translate(0 ${bell})">
          <path d="M186 108c0-6 8-9 8 0" fill="none"/>
          <circle cx="194" cy="114" r="6" fill="#FFD45C"/>
        </g>
      </g>
      ${milkArt}
    </g>
  </g>`;
}

const COW_ACTIONS = {
  idle: [
    {},
    { by: 2, headDy: 1, tail: 0, eye: 'closed' },
    { tail: -4 },
    { by: 1, headDy: 0, tail: -2 },
  ],
  walk: [
    { legL: 0, legR: -6, legL2: 0, legR2: 0 },
    { by: -2, legL: -3, legR: -3, legL2: 0, legR2: -3 },
    { legL: -6, legR: 0, legL2: 0, legR2: 0 },
    { by: -2, legL: -3, legR: -3, legL2: -3, legR2: 0, eye: 'closed' },
  ],
  // 生产：挤奶动画
  produce: [
    { by: 1, milk: 0, bell: 0 },
    { by: 2, milk: 6, bell: -2, eye: 'closed' },
    { by: 1, milk: 12, bell: 0 },
    { by: 0, milk: 4, bell: 2 },
  ],
};

/* ========================================================================== */
/* 输出                                                                        */
/* ========================================================================== */

const ANIMALS = {
  chicken: { w: CH_W, h: CH_H, build: chickenFrame, actions: CHICKEN_ACTIONS, fps: { idle: 3, walk: 7, produce: 5 }, loop: { idle: true, walk: true, produce: false } },
  sheep: { w: SH_W, h: SH_H, build: sheepFrame, actions: SHEEP_ACTIONS, fps: { idle: 3, walk: 6, produce: 5 }, loop: { idle: true, walk: true, produce: false } },
  cow: { w: CO_W, h: CO_H, build: cowFrame, actions: COW_ACTIONS, fps: { idle: 3, walk: 6, produce: 5 }, loop: { idle: true, walk: true, produce: false } },
};

const files = {};
const table = {};

for (const [species, def] of Object.entries(ANIMALS)) {
  table[species] = {};
  for (const [action, frames] of Object.entries(def.actions)) {
    const groups = frames.map((f, i) => `<g transform="translate(${i * def.w} 0)">${def.build(f)}</g>`);
    files[`animals/${species}_${action}.svg`] = wrap(def.w, def.h, groups.join('\n'), frames.length);
    table[species][action] = { frames: frames.length, fps: def.fps[action], loop: def.loop[action] };
  }
  // 单帧素材 = 原地休息的第 0 帧，保证静态与动画完全一致
  files[`animals/${species}.svg`] = wrap(def.w, def.h, def.build(def.actions.idle[0]), 1);
}

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}

const ts = `/**
 * 由 scripts/generate-animal-anim.mjs 自动生成，请勿手改。
 */
export interface AnimalActionDef {
  frames: number;
  fps: number;
  loop: boolean;
}

export const ANIMAL_ACTIONS: Record<string, Record<string, AnimalActionDef>> = ${JSON.stringify(table, null, 2)};

export const ANIMAL_ACTION_ORDER = ['idle', 'walk', 'produce'] as const;
export type AnimalAction = (typeof ANIMAL_ACTION_ORDER)[number];
`;
writeFileSync(join(root, 'src', 'data', 'animalFrames.ts'), ts, 'utf8');

console.log(`[generate-animal-anim] 已生成 ${count} 个 SVG + src/data/animalFrames.ts`);
