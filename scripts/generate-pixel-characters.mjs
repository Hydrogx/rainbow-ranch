/**
 * 像素角色 / 服装 SVG 生成器
 * ----------------------------------------------------------------------------
 * 严格沿用使用者提供的 32x48 男孩行走图的零件结构与配色，
 * 用同一套"身体 + 左右手臂 + 双腿"零件拼出：
 *   男孩 / 女孩 × 原地休息(idle) / 走路(walk) / 拿东西(hold) / 捡东西(pickup) / 挤东西(milk)
 * 以及全部像素服装图层（帽子 / 上衣 / 裤子 / 鞋 / 背包 / 发饰）。
 *
 * 每个动作导出成一条横排精灵图：characters/<角色>_<动作>.svg
 * 同时导出帧表 src/data/characterFrames.ts，供运行时驱动动画与服装偏移。
 *
 * 注意：characters/boy_walk.svg 是使用者提供的原始素材，本脚本不会覆盖它。
 *
 * 运行：node scripts/generate-pixel-characters.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets');
const FW = 32;
const FH = 48;

/* ========================================================================== */
/* 调色板                                                                      */
/* ========================================================================== */

const BOY = {
  ink: '#493b3b',
  skin: '#efb983',
  skinHi: '#ffd49e',
  hair: '#49352f',
  hairMid: '#80513c',
  hairHi: '#a36b45',
  eye: '#322d32',
  blush: '#d58a72',
  mouth: '#a86251',
  shirt: '#f1e8ca',
  shirtSh: '#d4c6a0',
  pants: '#427a91',
  pantsHi: '#639fb1',
  pantsDk: '#31586e',
  legHi: '#54899b',
  button: '#e6bc68',
  boot: '#49352f',
  bootHi: '#866047',
};

const GIRL = {
  ...BOY,
  hair: '#4a2a2a',
  hairMid: '#8a4a3a',
  hairHi: '#b9744f',
  bow: '#ff9cc1',
  bowDk: '#e0567f',
};

/* ========================================================================== */
/* 小工具                                                                      */
/* ========================================================================== */

const rectPath = (rects) =>
  rects
    .filter(Boolean)
    .map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`)
    .join('');

/** 用矩形列表拼一个同色图形 */
const shape = (fill, rects) => `<path fill="${fill}" d="${rectPath(rects)}"/>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">\n${body}\n</svg>\n`;

/* ========================================================================== */
/* 角色零件                                                                    */
/* ========================================================================== */

/** 男孩身体（与使用者提供的素材逐像素一致） */
function boyBody(p) {
  return [
    `<path fill="${p.hair}" d="M10 4h12v2h3v5h1v10h-3v3H9v-3H6V11h1V7h3z"/>`,
    `<path fill="${p.hairMid}" d="M10 6h11v2h3v4H8V9h2z"/>`,
    `<path fill="${p.hairHi}" d="M11 6h7v2h-7z"/>`,
    `<path fill="${p.skin}" d="M9 13h14v8h-2v3H11v-3H9z"/>`,
    `<path fill="${p.skinHi}" d="M11 13h10v7H11z"/>`,
    `<path fill="${p.hair}" d="M9 10h5v4h-3v2H9zm10 0h4v6h-2v-3h-2z"/>`,
    `<path fill="${p.eye}" d="M12 16h2v3h-2zm6 0h2v3h-2z"/>`,
    `<path fill="${p.blush}" d="M10 20h3v1h-3zm9 0h3v1h-3z"/>`,
    `<path fill="${p.mouth}" d="M15 21h3v1h-3z"/>`,
    `<path fill="${p.ink}" d="M10 24h12v2h3v7h-3v5H10v-5H7v-7h3z"/>`,
    `<path fill="${p.shirt}" d="M10 25h12v2h2v5H8v-5h2z"/>`,
    `<path fill="${p.shirtSh}" d="M8 30h3v3H8zm13 0h3v3h-3z"/>`,
    `<path fill="${p.pants}" d="M11 25h3v5h4v-5h3v12H11z"/>`,
    `<path fill="${p.pantsHi}" d="M12 30h8v5h-8z"/>`,
    `<path fill="${p.pantsDk}" d="M10 35h12v3H10z"/>`,
    `<path fill="${p.button}" d="M12 29h1v1h-1zm7 0h1v1h-1z"/>`,
    `<path fill="${p.pants}" d="M14 32h4v2h-4z"/>`,
  ].join('\n');
}

/** 女孩身体：同样的衣服与体型，换成长发 + 蝴蝶结 + 睫毛 */
function girlBody(p) {
  return [
    // 脑后的长发（先画，脸会盖在上面）
    shape(p.hair, [
      [4, 12, 5, 15],
      [23, 12, 5, 15],
    ]),
    `<path fill="${p.hair}" d="M8 4h16v2h3v5h1v9h-4v3H9v-3H6v-9h1V6h1z"/>`,
    // 脸
    `<path fill="${p.skin}" d="M9 13h14v8h-2v3H11v-3H9z"/>`,
    `<path fill="${p.skinHi}" d="M11 13h10v7H11z"/>`,
    // 刘海
    shape(p.hair, [
      [9, 10, 14, 3],
    ]),
    `<path fill="${p.hairMid}" d="M10 6h11v2h3v3H8V9h2z"/>`,
    `<path fill="${p.hairHi}" d="M11 6h8v2h-8z"/>`,
    // 两侧垂发
    shape(p.hair, [
      [7, 13, 2, 9],
      [23, 13, 2, 9],
    ]),
    // 眼睛（带睫毛）
    `<path fill="${p.eye}" d="M12 16h2v3h-2zm6 0h2v3h-2z"/>`,
    `<path fill="${p.hair}" d="M11 15h4v1h-4zm6 0h4v1h-4z"/>`,
    `<path fill="${p.blush}" d="M10 20h3v1h-3zm9 0h3v1h-3z"/>`,
    `<path fill="${p.mouth}" d="M15 21h3v1h-3z"/>`,
    // 蝴蝶结
    shape(p.bowDk, [
      [5, 5, 6, 1],
      [5, 9, 6, 1],
      [4, 6, 1, 3],
      [11, 6, 1, 3],
    ]),
    shape(p.bow, [
      [5, 6, 6, 3],
      [10, 7, 2, 1],
    ]),
    // 衣服（与男孩一致，服装图层才能通用）
    `<path fill="${p.ink}" d="M10 24h12v2h3v7h-3v5H10v-5H7v-7h3z"/>`,
    `<path fill="${p.shirt}" d="M10 25h12v2h2v5H8v-5h2z"/>`,
    `<path fill="${p.shirtSh}" d="M8 30h3v3H8zm13 0h3v3h-3z"/>`,
    `<path fill="${p.pants}" d="M11 25h3v5h4v-5h3v12H11z"/>`,
    `<path fill="${p.pantsHi}" d="M12 30h8v5h-8z"/>`,
    `<path fill="${p.pantsDk}" d="M10 35h12v3H10z"/>`,
    `<path fill="${p.button}" d="M12 29h1v1h-1zm7 0h1v1h-1z"/>`,
  ].join('\n');
}

/** 手臂：x 为左上角，y 为顶端 */
const arm = (p, x, y, flip = false) =>
  `<path fill="${p.ink}" d="M${x} ${y}h4v8h-4z"/><path fill="${p.skin}" d="M${flip ? x : x + 1} ${y + 1}h3v6h-3z"/>`;

/** 腿：x 为左上角，y 为大腿顶端 */
const leg = (p, x, y) =>
  `<path fill="${p.pantsDk}" d="M${x} ${y}h5v6h-5z"/><path fill="${p.legHi}" d="M${x + 1} ${y}h3v4h-3z"/><path fill="${p.boot}" d="M${x - 1} ${y + 5}h6v4h-6z"/><path fill="${p.bootHi}" d="M${x} ${y + 5}h4v2h-4z"/>`;

/** 手持姿势：胸前多两只手 */
const hands = (p) => shape(p.skin, [[11, 30, 3, 3], [18, 30, 3, 3]]) + shape(p.ink, [[10, 29, 1, 5], [21, 29, 1, 5]]);

/* ========================================================================== */
/* 动作帧定义                                                                  */
/* ========================================================================== */

const DEFAULT = { body: [0, 0], arms: [[6, 29], [22, 29]], legs: [[10, 36], [17, 36]], hold: false };

/**
 * 每个动作的帧序列。all = 整帧偏移，body = 身体+手臂偏移，
 * overlay = 服装图层需要跟随的纵向像素偏移（导出给运行时用）。
 */
const ACTIONS = {
  // 原地休息：轻微呼吸起伏
  idle: [
    { ...DEFAULT },
    { body: [0, 1], arms: [[6, 30], [22, 30]], legs: [[10, 36], [17, 36]] },
  ],
  // 走路：与使用者提供的 4 帧完全相同的偏移（boy_walk.svg 不覆盖）
  walk: [
    { arms: [[6, 28], [22, 30]], legs: [[10, 36], [17, 34]] },
    { all: -1, arms: [[6, 29], [22, 29]], legs: [[10, 36], [17, 36]] },
    { arms: [[6, 30], [22, 28]], legs: [[10, 34], [17, 36]] },
    { all: -1, arms: [[6, 29], [22, 29]], legs: [[10, 36], [17, 36]] },
  ],
  // 拿东西：双手抬到胸前捧着
  hold: [
    { arms: [[7, 26], [21, 26]], legs: [[10, 36], [17, 36]], hold: true },
    { body: [0, 1], arms: [[7, 27], [21, 27]], legs: [[10, 36], [17, 36]], hold: true },
  ],
  // 捡东西：蹲下去、手向下伸
  pickup: [
    { body: [0, 3], arms: [[8, 32], [20, 32]], legs: [[10, 35], [17, 35]], hold: true },
    { body: [0, 4], arms: [[9, 34], [19, 34]], legs: [[10, 34], [17, 34]], hold: true },
  ],
  // 挤东西：双手在身前反复向下用力
  milk: [
    { arms: [[8, 29], [20, 29]], legs: [[10, 36], [17, 36]], hold: true },
    { body: [0, 1], arms: [[8, 32], [20, 32]], legs: [[10, 36], [17, 36]], hold: true },
  ],
};

const ACTION_META = {
  idle: { fps: 3, loop: true, label: '原地休息' },
  walk: { fps: 7, loop: true, label: '走路' },
  hold: { fps: 4, loop: true, label: '拿东西' },
  pickup: { fps: 8, loop: false, label: '捡东西' },
  milk: { fps: 6, loop: true, label: '挤东西' },
};

/* ========================================================================== */
/* 生成角色精灵图                                                              */
/* ========================================================================== */

const files = {};

function buildSheet(kind, action) {
  const p = kind === 'girl' ? GIRL : BOY;
  const bodyArt = kind === 'girl' ? girlBody(p) : boyBody(p);
  const frames = ACTIONS[action];
  const groups = frames.map((f, i) => {
    const all = f.all ?? 0;
    const bdy = f.body ?? [0, 0];
    const parts = [
      ...f.legs.map(([x, y]) => leg(p, x, y)),
      arm(p, f.arms[0][0], f.arms[0][1], false),
      arm(p, f.arms[1][0], f.arms[1][1], true),
      `<g transform="translate(${bdy[0]} ${bdy[1]})">${bodyArt}</g>`,
      f.hold ? hands(p) : '',
    ];
    return `<g transform="translate(${i * FW} ${all})">\n${parts.filter(Boolean).join('\n')}\n</g>`;
  });
  return svg(FW * frames.length, FH, groups.join('\n'));
}

for (const kind of ['boy', 'girl']) {
  for (const action of Object.keys(ACTIONS)) {
    // 使用者提供的男孩行走图保持原样，不覆盖
    if (kind === 'boy' && action === 'walk') continue;
    files[`characters/${kind}_${action}.svg`] = buildSheet(kind, action);
  }
}

/* ========================================================================== */
/* 服装图层（32x48，单帧，透明背景）                                            */
/* ========================================================================== */

const C = {
  ink: '#493b3b',
  straw: '#f2c879',
  strawHi: '#ffdf9e',
  band: '#e05a6b',
  oldStraw: '#c9a86a',
  oldStrawHi: '#e0c48c',
  oldStrawDk: '#8f7342',
  rag: '#cfc6ad',
  ragDk: '#a89c82',
  ragPatch: '#8d9a7a',
  oldPants: '#7b6a54',
  oldPantsDk: '#5d5040',
  rain: '#ffd45c',
  rainDk: '#e0a92e',
  chef: '#ffffff',
  chefSh: '#dfe7ee',
  ear: '#ffb3c7',
  earBand: '#ff8fb1',
  star: '#ffd45c',
  starDk: '#e8a93a',
  scarfA: '#ff6f91',
  scarfB: '#ff9cc1',
  blue: '#5b8def',
  blueHi: '#8fb4f5',
  raincoat: '#ffd45c',
  bootA: '#3e9bd1',
  bootB: '#67c7f0',
  shoe: '#b6e36b',
  shoeHi: '#d7f5a8',
  pack: '#a97be0',
  packHi: '#c3a3ec',
  packDk: '#7f56b5',
  gold: '#e6bc68',
};

const clothes = {};

/**
 * 身体坐标参考（32x48 画布内）：
 *   头部  x 6..27  y 4..24
 *   躯干  x 7..25  y 24..33
 *   腰胯  x 9..23  y 33..38
 *   双腿  x 9..23  y 36..45
 *   左臂  x 6..10  右臂 x 22..26  y 29..37
 */
const BODY = { headTop: 4, torsoTop: 24, waistTop: 33, legTop: 36, footTop: 41 };

/** 破破烂烂的草帽：帽檐缺了两块 */
clothes['ragged_hat'] = [
  // 帽顶（窄一些、塌一边，显得破）
  shape(C.ink, [[10, 2, 11, 1], [9, 3, 1, 6], [21, 3, 1, 4], [22, 7, 1, 2]]),
  shape(C.oldStrawDk, [[10, 3, 11, 6]]),
  shape(C.oldStraw, [[11, 4, 9, 3]]),
  shape(C.oldStrawHi, [[12, 4, 4, 1]]),
  // 帽檐：缺了两块
  shape(C.ink, [[2, 9, 6, 1], [13, 9, 5, 1], [24, 9, 6, 1], [2, 12, 5, 1], [12, 12, 8, 1], [25, 12, 5, 1]]),
  shape(C.oldStraw, [[3, 10, 25, 2]]),
  shape(C.oldStrawDk, [[3, 11, 10, 1], [16, 11, 12, 1]]),
  // 破洞
  shape(C.ink, [[14, 4, 2, 2]]),
].join('\n');

/** 破衣服：下摆参差、有补丁和破洞 */
clothes['ragged_shirt'] = [
  shape(C.ink, [[7, 23, 18, 1], [7, 24, 1, 10], [24, 24, 1, 10], [8, 33, 3, 1], [12, 32, 4, 2], [17, 33, 3, 1], [21, 32, 3, 2]]),
  shape(C.rag, [[8, 24, 16, 9]]),
  shape(C.ragDk, [[8, 24, 16, 2]]),
  shape(C.ragPatch, [[11, 27, 4, 3]]),
  shape(C.ink, [[12, 28, 2, 1], [19, 26, 2, 4], [20, 27, 1, 2]]),
].join('\n');

/** 破裤子：膝盖破洞 + 补丁 */
clothes['ragged_pants'] = [
  shape(C.ink, [[9, 32, 14, 1], [9, 33, 1, 11], [22, 33, 1, 11], [10, 44, 5, 1], [17, 44, 5, 1]]),
  shape(C.oldPants, [[10, 33, 12, 11]]),
  shape(C.oldPantsDk, [[10, 33, 12, 2]]),
  shape(C.ink, [[9, 38, 5, 2], [18, 38, 5, 2]]),
  shape(C.oldPants, [[10, 40, 12, 4]]),
  shape(C.ragPatch, [[12, 35, 3, 3]]),
].join('\n');

/** 草帽 */
clothes['hat_straw'] = [
  shape(C.ink, [[9, 2, 14, 1], [8, 3, 1, 6], [23, 3, 1, 6], [3, 9, 26, 1], [3, 12, 26, 1]]),
  shape(C.strawHi, [[9, 3, 14, 6]]),
  shape(C.straw, [[9, 7, 14, 2]]),
  shape(C.band, [[9, 8, 14, 1]]),
  shape(C.straw, [[4, 10, 24, 2]]),
  shape(C.oldStrawDk, [[4, 11, 24, 1]]),
].join('\n');

/** 雨帽 */
clothes['hat_rain'] = [
  shape(C.ink, [[7, 1, 18, 1], [6, 2, 1, 9], [25, 2, 1, 9], [2, 11, 28, 1], [2, 14, 28, 1]]),
  shape(C.rain, [[7, 2, 18, 9]]),
  shape(C.rainDk, [[7, 3, 18, 1]]),
  shape(C.rain, [[3, 12, 26, 2]]),
  shape(C.rainDk, [[3, 13, 26, 1]]),
].join('\n');

/** 厨师帽 */
clothes['hat_chef'] = [
  shape(C.ink, [[8, 1, 16, 1], [7, 2, 1, 7], [24, 2, 1, 7], [7, 9, 18, 1], [7, 12, 18, 1]]),
  shape(C.chef, [[8, 2, 16, 7]]),
  shape(C.chefSh, [[8, 2, 16, 1], [8, 5, 16, 1]]),
  shape(C.chef, [[9, 9, 14, 3]]),
  shape(C.chefSh, [[9, 10, 14, 1]]),
].join('\n');

/** 动物耳朵发箍 */
clothes['ears'] = [
  shape(C.ink, [[7, 5, 18, 1], [7, 8, 18, 1], [3, 1, 7, 1], [2, 2, 1, 5], [10, 2, 1, 5], [3, 7, 7, 1],
                [20, 1, 7, 1], [19, 2, 1, 5], [27, 2, 1, 5], [20, 7, 7, 1]]),
  shape(C.earBand, [[7, 6, 18, 2]]),
  shape(C.ear, [[4, 2, 5, 5], [21, 2, 5, 5]]),
].join('\n');

/** 星星发夹 */
clothes['hairpin'] = [
  shape(C.starDk, [[23, 4, 2, 1], [22, 5, 4, 1], [21, 6, 6, 1], [22, 7, 4, 1], [23, 8, 2, 1]]),
  shape(C.star, [[23, 5, 2, 3]]),
].join('\n');

/** 彩虹围巾 */
clothes['scarf'] = [
  shape(C.ink, [[8, 22, 16, 1], [8, 27, 16, 1], [8, 23, 1, 4], [23, 23, 1, 4], [19, 28, 5, 1], [24, 29, 1, 8], [19, 37, 5, 1]]),
  shape(C.scarfA, [[9, 23, 14, 4]]),
  shape(C.scarfB, [[20, 29, 3, 8]]),
  shape(C.ink, [[20, 31, 3, 1], [20, 34, 3, 1]]),
].join('\n');

/** 园丁背带裤（只负责上身：背带 + 胸兜） */
clothes['overalls'] = [
  shape(C.ink, [[10, 23, 4, 1], [18, 23, 4, 1], [10, 24, 1, 9], [21, 24, 1, 9], [9, 32, 12, 1]]),
  shape(C.blue, [[11, 24, 3, 8], [18, 24, 3, 8]]),
  shape(C.blue, [[10, 26, 12, 6]]),
  shape(C.blueHi, [[11, 27, 10, 3]]),
  shape(C.gold, [[11, 25, 1, 1], [20, 25, 1, 1]]),
].join('\n');

/** 蓝色工装裤 */
clothes['pants_denim'] = [
  shape(C.ink, [[9, 32, 14, 1], [9, 33, 1, 11], [22, 33, 1, 11], [10, 44, 5, 1], [17, 44, 5, 1], [16, 38, 1, 1]]),
  shape(C.blue, [[10, 33, 12, 11]]),
  shape(C.blueHi, [[11, 34, 10, 3]]),
  shape(C.blue, [[14, 37, 4, 2]]),
  shape(C.gold, [[15, 33, 2, 1]]),
].join('\n');

/** 防水雨裤 */
clothes['pants_rain'] = [
  shape(C.ink, [[9, 32, 14, 1], [9, 33, 1, 11], [22, 33, 1, 11], [10, 44, 5, 1], [17, 44, 5, 1]]),
  shape(C.bootB, [[10, 33, 12, 11]]),
  shape(C.bootA, [[10, 33, 12, 2], [10, 41, 12, 3]]),
  shape(C.chef, [[15, 36, 2, 4]]),
].join('\n');

/** 雨衣（连帽） */
clothes['raincoat'] = [
  shape(C.ink, [[6, 22, 20, 1], [5, 23, 1, 16], [26, 23, 1, 16], [5, 39, 22, 1],
                [7, 1, 18, 1], [6, 2, 1, 9], [25, 2, 1, 9], [2, 11, 28, 1], [2, 14, 28, 1]]),
  shape(C.rain, [[6, 23, 20, 16]]),
  shape(C.rainDk, [[15, 23, 2, 16]]),
  shape(C.rain, [[7, 2, 18, 9]]),
  shape(C.rainDk, [[15, 2, 2, 9]]),
  shape(C.rain, [[3, 12, 26, 2]]),
  shape(C.rainDk, [[3, 13, 26, 1]]),
  shape(C.gold, [[14, 27, 4, 2]]),
].join('\n');

/** 雨靴 */
clothes['boots'] = [
  shape(C.ink, [[8, 37, 8, 1], [16, 37, 8, 1], [8, 38, 1, 8], [15, 38, 1, 8], [16, 38, 1, 8], [23, 38, 1, 8],
                [7, 46, 9, 1], [15, 46, 9, 1]]),
  shape(C.bootA, [[9, 38, 6, 8], [17, 38, 6, 8]]),
  shape(C.bootB, [[9, 41, 6, 2], [17, 41, 6, 2]]),
  shape(C.bootA, [[8, 45, 8, 1], [16, 45, 8, 1]]),
].join('\n');

/** 彩虹鞋 */
clothes['sneakers'] = [
  shape(C.ink, [[8, 39, 8, 1], [16, 39, 8, 1], [8, 40, 1, 6], [15, 40, 1, 6], [16, 40, 1, 6], [23, 40, 1, 6],
                [7, 46, 9, 1], [15, 46, 9, 1]]),
  shape(C.shoe, [[9, 40, 6, 6], [17, 40, 6, 6]]),
  shape(C.shoeHi, [[9, 40, 6, 1], [17, 40, 6, 1]]),
  shape(C.chef, [[9, 44, 6, 2], [17, 44, 6, 2]]),
].join('\n');

/** 彩色背包：只画两侧露出的包体与肩带，中间透明，可叠在身体上方 */
clothes['backpack'] = [
  shape(C.ink, [[3, 23, 6, 1], [2, 24, 1, 13], [8, 24, 1, 13], [3, 37, 6, 1],
                [23, 23, 6, 1], [23, 24, 1, 13], [29, 24, 1, 13], [23, 37, 6, 1]]),
  shape(C.pack, [[3, 24, 5, 13], [24, 24, 5, 13]]),
  shape(C.packHi, [[3, 25, 1, 11], [24, 25, 1, 11]]),
  shape(C.packDk, [[6, 24, 2, 13], [25, 25, 2, 12]]),
  shape(C.ink, [[11, 23, 2, 7], [19, 23, 2, 7]]),
  shape(C.packDk, [[11, 24, 2, 6], [19, 24, 2, 6]]),
].join('\n');

for (const [name, body] of Object.entries(clothes)) {
  files[`characters/${name}.svg`] = svg(FW, FH, body);
}

/* ========================================================================== */
/* 写文件                                                                      */
/* ========================================================================== */

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = join(outDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  count += 1;
}

/* 帧表：供运行时驱动动画与服装跟随偏移 */
const overlayOffsets = {};
for (const [action, frames] of Object.entries(ACTIONS)) {
  overlayOffsets[action] = frames.map((f) => (f.all ?? 0) + (f.body ? f.body[1] : 0));
}
const table = `/**
 * 由 scripts/generate-pixel-characters.mjs 自动生成，请勿手改。
 * frames: 帧数 / fps: 播放速度 / loop: 是否循环 / overlay: 服装图层需要跟随的纵向像素偏移
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
      { ...meta, frames: ACTIONS[action].length, overlay: overlayOffsets[action] },
    ]),
  ),
  null,
  2,
)};

export const CHAR_ACTION_ORDER = ['idle', 'walk', 'hold', 'pickup', 'milk'] as const;
export type CharAction = (typeof CHAR_ACTION_ORDER)[number];
`;
writeFileSync(join(root, 'src', 'data', 'characterFrames.ts'), table, 'utf8');

console.log(`[generate-pixel-characters] 已生成 ${count} 个 SVG + src/data/characterFrames.ts`);
