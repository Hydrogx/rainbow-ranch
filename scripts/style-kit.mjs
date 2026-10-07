/**
 * 《小小彩虹牧场》统一美术风格工具包
 * ----------------------------------------------------------------------------
 * 目标风格：圆润、柔和渐变、几乎不用粗描边、Q 版大头、马卡龙配色、
 * 带接触阴影与体积感（接近《动物之森》那种温馨 2.5D 手感）。
 *
 * 与旧的"像素风"工具相比：
 *  - 不再有 5px 硬描边，改用同色系深色柔边（stroke 很细、颜色是填充色的加深版）
 *  - 主要形体都用线性/径向渐变制造体积
 *  - 每个角色/建筑脚下都有柔和接触阴影
 */

export const PAL = {
  /* 皮肤 */
  skin: '#ffe2c2',
  skinShade: '#f2c49b',
  skinEdge: '#d9a276',
  blush: '#ff9f9f',
  /* 头发 */
  hair: '#7c5637',
  hairDark: '#5a3c26',
  hairHi: '#a3744c',
  /* 五官 */
  eye: '#4a3629',
  mouth: '#a9714f',
  /* 衣服 */
  shirt: '#fdf7ea',
  shirtShade: '#e7dcc4',
  pants: '#7ea9dc',
  pantsShade: '#5c86bb',
  plainPants: '#c9bda6',
  plainPantsShade: '#a99d86',
  boots: '#8f6b4e',
  bootsShade: '#6f5138',
  /* 道具 */
  straw: '#e8c684',
  strawDark: '#c2a05f',
  oldStraw: '#cdb488',
  oldStrawDark: '#a08a5f',
  leaf: '#8fd06a',
  leafDark: '#63a844',
  wood: '#c98f5a',
  woodDark: '#a06f42',
  water: '#8fd3f7',
  waterDark: '#5cb4e0',
  egg: '#fff6e2',
  metal: '#c3ccd4',
  metalDark: '#9aa6b0',
  cloth: '#ff9ec2',
  clothDark: '#e0749b',
  pack: '#b18ae8',
  packDark: '#8a63c4',
  gold: '#ffd166',
  goldDark: '#e0ad3d',
  white: '#ffffff',
  shadow: '#5b4030',
};

/* -------------------------------------------------------------------------- */
/* SVG 基础                                                                   */
/* -------------------------------------------------------------------------- */

export const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`;

/** 线性渐变（光来自左上） */
export const lg = (id, from, to, x1 = 0, y1 = 0, x2 = 0.4, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

/** 径向渐变（高光 / 腮红） */
export const rg = (id, from, to, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>`;

export const defs = (...items) => `<defs>${items.join('')}</defs>`;

/** 椭圆 */
export const ell = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;

/** 圆角矩形 */
export const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" ${extra}/>`;

/** 胶囊（圆头线段） */
export const cap = (x1, y1, x2, y2, w, fill, extra = '') =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" fill="none" ${extra}/>`;

/**
 * 有机圆润形体：用 4 段三次贝塞尔围出一个"胖乎乎的豆子"。
 * w = 左右半径，hTop / hBottom = 上半高 / 下半高，允许上下不对称。
 */
export const bean = (cx, cy, w, hTop, hBottom, fill, extra = '') => {
  const k = 0.5523;
  const top = cy - hTop;
  const bottom = cy + hBottom;
  return `<path d="M${cx} ${top}C${cx + w * k * 1.6} ${top} ${cx + w} ${cy - hTop * 0.35} ${cx + w} ${cy}C${cx + w} ${cy + hBottom * 0.35} ${cx + w * k * 1.6} ${bottom} ${cx} ${bottom}C${cx - w * k * 1.6} ${bottom} ${cx - w} ${cy + hBottom * 0.35} ${cx - w} ${cy}C${cx - w} ${cy - hTop * 0.35} ${cx - w * k * 1.6} ${top} ${cx} ${top}Z" fill="${fill}" ${extra}/>`;
};

/** 接触阴影：脚/底座下的柔和椭圆（两层叠出虚化感） */
export const contactShadow = (cx, cy, rx, ry, opacity = 0.16) =>
  ell(cx, cy, rx, ry, PAL.shadow, `opacity="${opacity * 0.55}"`) +
  ell(cx, cy, rx * 0.72, ry * 0.72, PAL.shadow, `opacity="${opacity}"`);

/** 弧线（微笑、睫毛等） */
export const arc = (d, stroke, w = 1.6, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;

/** 星星 */
export const star = (cx, cy, r, fill, extra = '') => {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.46;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${extra}/>`;
};
