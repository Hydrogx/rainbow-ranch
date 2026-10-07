/**
 * 角色 / 服装生成器（柔和 Q 版矢量风）
 * ----------------------------------------------------------------------------
 * 输出：
 *   characters/<boy|girl>_<idle|walk|hold|pickup|milk>.svg   横排精灵图
 *   characters/<服装 id>.svg                                  32 件服装图层
 *   src/data/characterFrames.ts                               帧表（含服装跟随偏移）
 *
 * 单帧尺寸 64x96（设计单位），游戏内 2 倍显示 = 128x192。
 *
 * 运行：node scripts/generate-cozy-characters.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, svgDoc, lg, rg, defs, ell, rr, cap, bean, contactShadow, arc, path, star } from './style-kit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');
const FW = 64;
const FH = 96;

/* ========================================================================== */
/* 身体零件                                                                    */
/* ========================================================================== */

const HAIR_BOY = { main: PAL.hair, dark: PAL.hairDark, hi: PAL.hairHi };
const HAIR_GIRL = { main: '#8a5c3c', dark: '#66412a', hi: '#b07c50' };

/** 腿 + 鞋（可左右位移） */
function legs(kind, legL, legR) {
  const pants = kind === 'girl' ? { a: PAL.pants, b: PAL.pantsShade } : { a: PAL.pants, b: PAL.pantsShade };
  return `
    ${cap(legL[0], legL[1], legL[0], legL[1] + 20, 10, `url(#g-pants)`)}
    ${cap(legR[0], legR[1], legR[0], legR[1] + 20, 10, `url(#g-pants)`)}
    ${bean(legL[0] - 1.5, legL[1] + 24, 6.2, 3.4, 3.6, 'url(#g-boot)')}
    ${bean(legR[0] + 1.5, legR[1] + 24, 6.2, 3.4, 3.6, 'url(#g-boot)')}
    ${ell(legL[0] - 1.5, legL[1] + 23.4, 3.4, 1.1, PAL.white, 'opacity=".28"')}
    ${ell(legR[0] + 1.5, legR[1] + 23.4, 3.4, 1.1, PAL.white, 'opacity=".28"')}
    ${pants ? '' : ''}`;
}

/** 手臂 + 手 */
const arm = (x, y, flip = false) =>
  `${cap(x, y, x + (flip ? 1.5 : -1.5), y + 14, 8.4, 'url(#g-skin)')}
   ${ell(x + (flip ? 1.8 : -1.8), y + 15.5, 4.6, 4.6, 'url(#g-skin)')}`;

/** 头（含发型与五官） */
function head(kind, eyes, extraHairDy = 0) {
  const hair = kind === 'girl' ? HAIR_GIRL : HAIR_BOY;
  const girl = kind === 'girl';
  const backHair = girl
    ? `${bean(32, 46 + extraHairDy, 22, 22, 22, hair.dark)}
       ${bean(12, 42 + extraHairDy, 7, 18, 20, hair.main)}
       ${bean(52, 42 + extraHairDy, 7, 18, 20, hair.main)}
       ${bean(56, 24 + extraHairDy, 8, 9, 11, hair.main)}`
    : '';
  const eye = (cx) => {
    if (eyes === 'closed')
      return `${arc(`M${cx - 4} 34q4 3.4 8 0`, PAL.eye, 2)}`;
    return `${ell(cx, 33, 3.8, 4.6, PAL.eye)}
            ${ell(cx + 1.2, 31.4, 1.4, 1.6, PAL.white, 'opacity=".95"')}
            ${girl ? arc(`M${cx - 4.6} 28.6q4.6 -3 9.2 0`, PAL.eye, 1.8) : ''}`;
  };
  const bangs = girl
    ? `${path(`M11 30C11 15 20 8 32 8s21 7 21 22c-4-6-9-9-13-7-3-6-9-8-14-4-4 3-6 7-6 11z`, hair.main)}
       ${path(`M18 20c5-6 13-8 20-6-6 1-11 3-15 7z`, hair.hi, 'opacity=".7"')}
       ${bean(9.5, 46, 6.5, 16, 20, hair.main)}
       ${bean(54.5, 46, 6.5, 16, 20, hair.main)}`
    : `${path(`M10 32C10 15 20 8 32 8s22 7 22 24c-4-7-8-11-14-9-2-7-9-10-16-6-5 3-8 8-9 15z`, hair.main)}
       ${path(`M19 19c5-6 14-8 21-5-7 0-13 2-18 6z`, hair.hi, 'opacity=".65"')}
       ${bean(11, 34, 4.4, 5, 9, hair.main)}
       ${bean(53, 34, 4.4, 5, 9, hair.main)}`;
  const bow = girl
    ? `${path('M40 12c-5-4-11-2-11 3s6 7 11 3z', PAL.cloth)}
       ${path('M50 18c5-4 11-2 11 3s-6 7-11 3z', PAL.cloth)}
       ${ell(45, 18, 3.2, 3.2, PAL.clothDark)}`
    : '';
  return `
    ${backHair}
    ${ell(11.5, 35, 5, 5.6, 'url(#g-skin)')}
    ${ell(52.5, 35, 5, 5.6, 'url(#g-skin)')}
    ${ell(32, 30 + extraHairDy, 21.5, 20.5, 'url(#g-skin)')}
    ${ell(32, 36 + extraHairDy, 15, 11, PAL.skin, 'opacity=".35"')}
    ${ell(32, 37 + extraHairDy, 1.5, 1.1, PAL.skinEdge, 'opacity=".55"')}
    ${ell(17.5, 39 + extraHairDy, 4.8, 3.2, PAL.blush, 'opacity=".45"')}
    ${ell(46.5, 39 + extraHairDy, 4.8, 3.2, PAL.blush, 'opacity=".45"')}
    ${eye(24.5)}
    ${eye(39.5)}
    ${arc(`M29 ${41.5 + extraHairDy}q3 2.8 6 0`, PAL.mouth, 1.5)}
    ${bangs}
    ${bow}`;
}

/** 躯干 */
const torso = () => `${bean(32, 56, 15.5, 15, 13, 'url(#g-shirt)')}
  ${path('M18 62c4 5 24 5 28 0v6c-6 4-22 4-28 0z', 'url(#g-shirtShade)', 'opacity=".55"')}`;

const BODY_DEFS = defs(
  lg('g-skin', PAL.skin, PAL.skinShade, 0.25, 0.1, 0.7, 1),
  lg('g-hair', PAL.hairHi, PAL.hairDark, 0.3, 0, 0.7, 1),
  lg('g-shirt', PAL.shirt, PAL.shirtShade, 0.3, 0, 0.7, 1),
  lg('g-shirtShade', PAL.shirtShade, PAL.shirtShade),
  lg('g-pants', PAL.pants, PAL.pantsShade, 0.3, 0, 0.7, 1),
  lg('g-boot', PAL.boots, PAL.bootsShade, 0.3, 0, 0.7, 1),
  lg('g-plainPants', PAL.plainPants, PAL.plainPantsShade, 0.3, 0, 0.7, 1),
  lg('g-plainShirt', PAL.shirt, PAL.shirtShade, 0.3, 0, 0.7, 1),
);

/* ========================================================================== */
/* 动作帧                                                                      */
/* ========================================================================== */

const BASE = {
  bodyDy: 0,
  legL: [26, 66],
  legR: [38, 66],
  armL: [16.5, 49],
  armR: [47.5, 49],
  eyes: 'open',
};

const A = (o) => ({ ...BASE, ...o });

const ACTIONS = {
  // 原地休息：呼吸起伏 + 眨眼
  idle: [A({}), A({ bodyDy: 1.5, armL: [16.5, 50], armR: [47.5, 50] }), A({}), A({ bodyDy: 1, eyes: 'closed' })],
  // 走路：6 帧循环
  walk: [
    A({ bodyDy: -1, legL: [25, 62], legR: [39, 70], armL: [16.5, 46], armR: [47.5, 52] }),
    A({ bodyDy: -2.5, legL: [26, 64], legR: [38, 68], armL: [16.5, 48], armR: [47.5, 50] }),
    A({ bodyDy: -1, legL: [26, 66], legR: [38, 66], armL: [16.5, 49], armR: [47.5, 49] }),
    A({ bodyDy: -1, legL: [25, 70], legR: [39, 62], armL: [16.5, 52], armR: [47.5, 46] }),
    A({ bodyDy: -2.5, legL: [26, 68], legR: [38, 64], armL: [16.5, 50], armR: [47.5, 48] }),
    A({ bodyDy: -1, legL: [26, 66], legR: [38, 66], armL: [16.5, 49], armR: [47.5, 49] }),
  ],
  // 拿东西：双手抬到身前捧着
  hold: [
    A({ armL: [19, 44], armR: [45, 44] }),
    A({ bodyDy: 1.5, armL: [19, 45], armR: [45, 45] }),
  ],
  // 捡东西：蹲下去、手向下伸
  pickup: [
    A({ bodyDy: 6, armL: [18, 54], armR: [46, 54], legL: [25, 68], legR: [39, 68] }),
    A({ bodyDy: 8, armL: [19, 57], armR: [45, 57], legL: [25, 70], legR: [39, 70], eyes: 'closed' }),
  ],
  // 挤东西：手在身前一下一下用力
  milk: [
    A({ armL: [20, 48], armR: [44, 48] }),
    A({ bodyDy: 2, armL: [20, 53], armR: [44, 53] }),
    A({ bodyDy: 2, armL: [20, 53], armR: [44, 53] }),
  ],
};

const ACTION_META = {
  idle: { fps: 3, loop: true, label: '原地休息' },
  walk: { fps: 9, loop: true, label: '走路' },
  hold: { fps: 3, loop: true, label: '拿东西' },
  pickup: { fps: 6, loop: false, label: '捡东西' },
  milk: { fps: 5, loop: true, label: '挤东西' },
};

/** 服装图层要跟着身体下沉多少（设计单位） */
const overlayOf = (f) => f.bodyDy ?? 0;

/* ========================================================================== */
/* 服装图层（64x96 单帧，柔和矢量）                                             */
/* ========================================================================== */

const C = {
  ...PAL,
  rag: '#d8cfb6',
  ragDark: '#b3a88b',
  ragPatch: '#9fb08a',
  oldPants: '#b6a488',
  oldPantsDark: '#8d7c62',
  rain: '#ffd873',
  rainDark: '#e0b23f',
  chef: '#ffffff',
  chefShade: '#e3ebf2',
  ear: '#ffb3cd',
  earDark: '#e8849f',
  scarfA: '#ff8fb1',
  scarfB: '#ffb9cf',
  blue: '#6c9fe0',
  blueDark: '#4a78b8',
  blueHi: '#9dc0f2',
  bootA: '#63b6e8',
  bootB: '#3f92c8',
  shoeA: '#a8dc72',
  shoeB: '#7cbb4a',
  pack: '#b28ae8',
  packDark: '#8a63c4',
};

const clothes = {};

/** 破草帽：帽檐缺口 + 塌陷的帽顶 */
clothes['ragged_hat'] = [
  path('M14 16c0-8 8-12 18-12s18 4 18 12c0 3-2 5-5 5H19c-3 0-5-2-5-5z', C.oldStraw),
  path('M16 16c2-6 8-9 16-9 7 0 13 2 16 7-6-3-20-4-32 2z', '#ddc79c', 'opacity=".8"'),
  path('M11 17c0-2 4-3 21-3s21 1 21 3-5 4-21 4-21-2-21-4z', C.oldStrawDark),
  path('M11 17c0-2 4-3 21-3v7c-16 0-21-2-21-4z', C.oldStraw),
  path('M22 7c4-3 12-3 16 0-4 2-12 2-16 0z', '#7a6742', 'opacity=".6"'),
];

/** 破衣服：下摆参差 + 补丁 */
clothes['ragged_shirt'] = [
  bean(32, 55, 17, 14, 15, C.rag),
  path('M15 66c4 4 9 2 13 5 3-4 8-2 11 2 3-4 7-6 11-3l-1 6c-8 4-24 4-34 0z', C.ragDark),
  rr(24, 52, 9, 8, 2, C.ragPatch, 'transform="rotate(-8 28 56)"'),
  path('M40 46l4 5-4 4-4-4z', C.ragDark, 'opacity=".8"'),
];

/** 破裤子 */
clothes['ragged_pants'] = [
  bean(32, 68, 14, 8, 12, C.oldPants),
  cap(26, 66, 26, 86, 11, C.oldPants),
  cap(38, 66, 38, 86, 11, C.oldPants),
  path('M22 76c4 3 8 2 11 0l-1 6c-4 2-8 2-11 0z', C.oldPantsDark),
  rr(33, 72, 7, 6, 2, C.ragPatch),
];

/** 草帽 */
clothes['hat_straw'] = [
  path('M14 18c0-9 8-14 18-14s18 5 18 14z', C.straw),
  path('M17 15c2-6 8-9 15-9s13 3 15 8c-7-3-22-3-30 1z', '#f2dba6', 'opacity=".85"'),
  path('M13 17h38v4c0 1-9 2-19 2s-19-1-19-2z', C.clothDark),
  path('M10 19c0-2 5-3 22-3s22 1 22 3-6 4-22 4-22-2-22-4z', C.straw),
  path('M10 19c0-2 5-3 22-3v7c-16 0-22-2-22-4z', '#f2dba6', 'opacity=".8"'),
];

/** 雨帽 */
clothes['hat_rain'] = [
  path('M12 22c0-11 9-17 20-17s20 6 20 17z', C.rain),
  path('M16 18c3-8 9-11 16-11s13 3 16 10c-8-4-24-4-32 1z', '#ffe9ab', 'opacity=".8"'),
  path('M9 22c0-2 6-3 23-3s23 1 23 3-7 4-23 4-23-2-23-4z', C.rainDark),
  path('M9 22c0-2 6-3 23-3v7c-17 0-23-2-23-4z', C.rain),
];

/** 厨师帽 */
clothes['hat_chef'] = [
  bean(32, 10, 17, 9, 6, C.chef),
  ell(20, 8, 8, 8, C.chef),
  ell(44, 8, 8, 8, C.chef),
  ell(32, 6, 10, 9, C.chef),
  rr(17, 15, 30, 8, 3, C.chefShade),
  path('M20 8c3-4 8-6 12-6-4 2-9 3-12 6z', '#ffffff', 'opacity=".9"'),
];

/** 动物耳朵发箍 */
clothes['ears'] = [
  path('M14 7c0-5 4-8 8-8s8 3 8 8-4 7-8 7-8-2-8-7z', C.ear),
  path('M34 7c0-5 4-8 8-8s8 3 8 8-4 7-8 7-8-2-8-7z', C.ear),
  path('M17 7c0-3 2-5 5-5s5 2 5 5-2 4-5 4-5-1-5-4z', C.earDark, 'opacity=".6"'),
  path('M37 7c0-3 2-5 5-5s5 2 5 5-2 4-5 4-5-1-5-4z', C.earDark, 'opacity=".6"'),
  rr(13, 13, 38, 4.5, 2.2, C.earDark),
];

/** 星星发夹 */
clothes['hairpin'] = [star(47, 12, 7, C.gold), star(47, 12, 3.2, '#fff0c2')];

/** 彩虹围巾 */
clothes['scarf'] = [
  bean(32, 48, 15, 6, 6, C.scarfA),
  path('M40 50c4 0 6 4 6 8s-1 12-1 16h-6c0-5 1-11 1-14s-2-4-4-4z', C.scarfB),
  path('M22 44c4 3 16 3 20 0v4c-5 3-15 3-20 0z', C.scarfB, 'opacity=".7"'),
];

/** 园丁背带裤（上身） */
clothes['overalls'] = [
  rr(18, 43, 28, 26, 8, C.blue),
  cap(24, 44, 24, 52, 5, C.blueDark),
  cap(40, 44, 40, 52, 5, C.blueDark),
  rr(22, 48, 20, 14, 5, C.blueHi, 'opacity=".55"'),
  ell(24, 45, 2, 2, C.gold),
  ell(40, 45, 2, 2, C.gold),
];

/** 雨衣（连帽） */
clothes['raincoat'] = [
  bean(32, 56, 19, 15, 15, C.rain),
  path('M13 50c4 4 34 4 38 0v8c-6 4-32 4-38 0z', C.rainDark, 'opacity=".55"'),
  path('M12 22c0-11 9-17 20-17s20 6 20 17z', C.rain),
  path('M9 22c0-2 6-3 23-3s23 1 23 3-7 4-23 4-23-2-23-4z', C.rainDark),
  rr(29, 44, 6, 26, 3, C.rainDark, 'opacity=".7"'),
  ell(32, 56, 2.2, 2.2, C.gold),
];

/** 蓝色工装裤 */
clothes['pants_denim'] = [
  bean(32, 68, 14.5, 8, 12, C.blue),
  cap(26, 66, 26, 86, 11.5, C.blue),
  cap(38, 66, 38, 86, 11.5, C.blue),
  rr(24, 68, 16, 5, 2, C.blueHi, 'opacity=".6"'),
  ell(32, 66, 2.4, 1.8, C.gold),
];

/** 防水雨裤 */
clothes['pants_rain'] = [
  bean(32, 68, 14.5, 8, 12, C.bootA),
  cap(26, 66, 26, 86, 11.5, C.bootA),
  cap(38, 66, 38, 86, 11.5, C.bootA),
  rr(23, 80, 18, 6, 2, C.bootB),
  rr(27, 68, 3, 14, 1.5, '#cfeeff', 'opacity=".6"'),
];

/** 雨靴 */
clothes['boots'] = [
  bean(26, 88, 6.8, 5, 5, C.bootA),
  bean(38, 88, 6.8, 5, 5, C.bootA),
  cap(26, 78, 26, 88, 12, C.bootA),
  cap(38, 78, 38, 88, 12, C.bootA),
  rr(20, 90, 12, 4, 2, C.bootB),
  rr(32, 90, 12, 4, 2, C.bootB),
];

/** 彩虹鞋 */
clothes['sneakers'] = [
  bean(26, 89, 7, 4.6, 5, C.shoeA),
  bean(38, 89, 7, 4.6, 5, C.shoeA),
  rr(20, 89, 12, 5, 2.5, '#f4ffe4'),
  rr(32, 89, 12, 5, 2.5, '#f4ffe4'),
  rr(21, 84, 10, 4, 2, C.shoeB, 'opacity=".7"'),
  rr(33, 84, 10, 4, 2, C.shoeB, 'opacity=".7"'),
];

/** 彩色背包（只画两侧露出的包体 + 肩带） */
clothes['backpack'] = [
  bean(13.5, 55, 4.2, 11, 12, C.pack),
  bean(50.5, 55, 4.2, 11, 12, C.pack),
  path('M10 47c0-2 2-3 3.5-3v22c-1.5 0-3.5-1-3.5-3z', C.packDark, 'opacity=".55"'),
  path('M54 47c0-2-2-3-3.5-3v22c1.5 0 3.5-1 3.5-3z', C.packDark, 'opacity=".55"'),
  cap(23, 44, 24, 52, 3, C.packDark),
  cap(41, 44, 40, 52, 3, C.packDark),
];

/* ========================================================================== */
/* 生成                                                                        */
/* ========================================================================== */

const files = {};

function buildSheet(kind, action) {
  const frames = ACTIONS[action];
  const groups = frames.map((f, i) => {
    const dy = f.bodyDy ?? 0;
    return `<g transform="translate(${i * FW} 0)">
      ${contactShadow(32, 92, 21, 6.5)}
      ${legs(kind, f.legL, f.legR)}
      <g transform="translate(0 ${dy})">
        ${arm(f.armL[0], f.armL[1], false)}
        ${arm(f.armR[0], f.armR[1], true)}
        ${torso()}
        ${head(kind, f.eyes)}
      </g>
    </g>`;
  });
  return svgDoc(FW * frames.length, FH, defs(BODY_DEFS) + groups.join('\n'));
}

for (const kind of ['boy', 'girl']) {
  for (const action of Object.keys(ACTIONS)) {
    files[`characters/${kind}_${action}.svg`] = buildSheet(kind, action);
  }
}
for (const [name, body] of Object.entries(clothes)) {
  files[`characters/${name}.svg`] = svgDoc(FW, FH, defs(BODY_DEFS) + body.join('\n'));
}

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}

const table = `/**
 * 由 scripts/generate-cozy-characters.mjs 自动生成，请勿手改。
 * frames: 帧数 / fps: 播放速度 / loop: 是否循环 / overlay: 服装图层跟随的纵向偏移（设计单位）
 */
export interface CharActionDef {
  frames: number;
  fps: number;
  loop: boolean;
  label: string;
  overlay: number[];
}

export const CHAR_ACTIONS: Record<string, CharActionDef> = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(ACTION_META).map(([action, meta]) => [
      action,
      { ...meta, frames: ACTIONS[action].length, overlay: ACTIONS[action].map(overlayOf) },
    ]),
  ),
  null,
  2,
)};

export const CHAR_ACTION_ORDER = ['idle', 'walk', 'hold', 'pickup', 'milk'] as const;
export type CharAction = (typeof CHAR_ACTION_ORDER)[number];
`;
writeFileSync(join(root, 'src', 'data', 'characterFrames.ts'), table, 'utf8');

console.log(`[generate-cozy-characters] 已生成 ${count} 个 SVG + src/data/characterFrames.ts`);
