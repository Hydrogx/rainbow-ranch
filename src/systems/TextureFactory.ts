/**
 * 贴图工厂：把 SVG 字符串栅格化成 Phaser 贴图，或程序化画一些纹理。
 * 所有资源都内嵌在 JS 里，运行时不发任何图片请求。
 */
import Phaser from 'phaser';
import { ART, art } from '../assets';
import { CHAR_ACTIONS, CHAR_ACTION_ORDER, type CharAction } from '../data/characterFrames';
import { ANIMAL_ACTIONS, ANIMAL_ACTION_ORDER, type AnimalAction } from '../data/animalFrames';

/** 栅格化倍率：2 倍，保证高分屏和高缩放时依然清晰 */
const RATIO = 2;
/**
 * SVG 贴图按 2 倍分辨率生成，所以设置显示缩放时要乘上 ART_K，
 * 这样代码里写的 0.8 就是"设计尺寸的 0.8 倍"，与美术文件一致。
 */
export const ART_K = 1 / RATIO;

function svgToImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG 解析失败'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });
}

/** 把一批 SVG 资源注册成 Phaser 贴图（key 与美术 key 一致） */
export async function registerSvgTextures(scene: Phaser.Scene, keys: string[]): Promise<void> {
  const jobs = keys
    .filter((key) => ART[key] && !scene.textures.exists(key))
    .map(async (key) => {
      const { src, w, h } = art(key);
      try {
        const img = await svgToImage(src);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * RATIO));
        canvas.height = Math.max(1, Math.round(h * RATIO));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        scene.textures.addCanvas(key, canvas);
      } catch (err) {
        console.warn(`[texture] ${key} 生成失败`, err);
      }
    });
  await Promise.all(jobs);
}

export function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx, w, h);
  scene.textures.addCanvas(key, canvas);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 程序化纹理：草地、泥土、粒子点、雨滴等 */
export function registerProceduralTextures(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, 'tex/grass', 160, 160, (ctx, w, h) => {
    ctx.fillStyle = '#8ed66b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = i % 3 === 0 ? '#9ee07c' : i % 3 === 1 ? '#83cc61' : '#a7e88a';
      const x = rand(0, w);
      const y = rand(0, h);
      ctx.beginPath();
      ctx.ellipse(x, y, rand(4, 12), rand(2, 6), rand(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#79c258';
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i += 1) {
      const x = rand(0, w);
      const y = rand(0, h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-5, 5), y - rand(6, 12));
      ctx.stroke();
    }
  });

  makeCanvasTexture(scene, 'tex/dirt', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#a9713f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i += 1) {
      ctx.fillStyle = i % 2 ? '#96602f' : '#b87f4c';
      ctx.beginPath();
      ctx.ellipse(rand(0, w), rand(0, h), rand(3, 10), rand(2, 5), rand(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  makeCanvasTexture(scene, 'tex/dot', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(12, 12, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  makeCanvasTexture(scene, 'tex/spark', 32, 32, (ctx) => {
    ctx.fillStyle = '#FFF6C9';
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2;
      ctx.moveTo(16, 16);
      ctx.lineTo(16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15);
      ctx.lineTo(16 + Math.cos(a + Math.PI / 4) * 5, 16 + Math.sin(a + Math.PI / 4) * 5);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  });

  makeCanvasTexture(scene, 'tex/rain', 6, 28, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, 'rgba(150,205,235,0)');
    g.addColorStop(0.5, 'rgba(150,205,235,0.85)');
    g.addColorStop(1, 'rgba(150,205,235,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(1, 0, 4, 28);
  });

  makeCanvasTexture(scene, 'tex/petal', 16, 16, (ctx) => {
    ctx.fillStyle = '#FFD9E7';
    ctx.beginPath();
    ctx.ellipse(8, 8, 7, 4, 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  makeCanvasTexture(scene, 'tex/star', 20, 20, (ctx) => {
    ctx.fillStyle = '#FFF8D8';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(13, 7);
    ctx.lineTo(20, 10);
    ctx.lineTo(13, 13);
    ctx.lineTo(10, 20);
    ctx.lineTo(7, 13);
    ctx.lineTo(0, 10);
    ctx.lineTo(7, 7);
    ctx.closePath();
    ctx.fill();
  });

  makeCanvasTexture(scene, 'tex/leaf', 18, 18, (ctx) => {
    ctx.fillStyle = '#8ED66B';
    ctx.beginPath();
    ctx.ellipse(9, 9, 8, 4.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#63B96B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, 14);
    ctx.lineTo(16, 4);
    ctx.stroke();
  });

  makeCanvasTexture(scene, 'tex/rug', 220, 150, (ctx, w, h) => {
    const colors = ['#F26A5B', '#F5A623', '#FFD45C', '#8ED66B', '#6EC1E4', '#A97BE0'];
    ctx.fillStyle = '#FFF7E4';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      ctx.ellipse(w / 2, h / 2, w / 2 - 6, h / 2 - 6, 0, a0, a1);
      ctx.fill();
    }
    ctx.fillStyle = '#FFF7E4';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 5, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  makeCanvasTexture(scene, 'tex/sky', 16, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5FB8E8');
    g.addColorStop(0.55, '#9ED8F5');
    g.addColorStop(1, '#D9F0FB');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  makeCanvasTexture(scene, 'tex/glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,240,180,0.85)');
    g.addColorStop(0.5, 'rgba(255,225,140,0.35)');
    g.addColorStop(1, 'rgba(255,225,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/* ------------------------------------------------------------------ */
/* 精灵图：角色动作 / 服装 / 动物动作                                    */
/* ------------------------------------------------------------------ */

export const CHAR_KINDS = ['boy', 'girl'] as const;
export type CharKind = (typeof CHAR_KINDS)[number];

/** 全部像素服装图层（32x48 单帧） */
export const CLOTHING_KEYS = [
  'ragged_hat',
  'ragged_shirt',
  'ragged_pants',
  'hat_straw',
  'hat_rain',
  'hat_chef',
  'ears',
  'hairpin',
  'scarf',
  'overalls',
  'raincoat',
  'pants_denim',
  'pants_rain',
  'boots',
  'sneakers',
  'backpack',
] as const;

export const ANIMAL_SPECIES = ['chicken', 'sheep', 'cow'] as const;
export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number];

/** 动物单帧设计尺寸（与 SVG viewBox 一致） */
export const ANIMAL_SIZE: Record<AnimalSpecies, { w: number; h: number }> = {
  chicken: { w: 160, h: 160 },
  sheep: { w: 190, h: 170 },
  cow: { w: 220, h: 170 },
};

export const CHAR_FRAME_W = 64;
export const CHAR_FRAME_H = 96;
/** 角色显示放大倍数：64x96 的设计稿 → 约 85x128，和牛羊等场景物件比例协调 */
export const CHAR_SCALE = 4 / 3;

export interface SheetDef {
  key: string;
  frameW: number;
  frameH: number;
  frames: number;
  /** true = 像素图（取色块中心 + NEAREST），false = 矢量图（2 倍栅格化 + 平滑） */
  pixel: boolean;
}

export const characterSheetKey = (kind: CharKind, action: CharAction) => `characters/${kind}_${action}`;
export const characterAnimKey = (kind: CharKind, action: CharAction) => `${kind}-${action}`;
export const animalSheetKey = (species: AnimalSpecies, action: AnimalAction) => `animals/${species}_${action}`;
export const animalAnimKey = (species: AnimalSpecies, action: AnimalAction) => `${species}-${action}`;

export function allSheetDefs(): SheetDef[] {
  const out: SheetDef[] = [];
  for (const kind of CHAR_KINDS) {
    for (const action of CHAR_ACTION_ORDER) {
      out.push({ key: characterSheetKey(kind, action), frameW: CHAR_FRAME_W, frameH: CHAR_FRAME_H, frames: CHAR_ACTIONS[action].frames, pixel: false });
    }
  }
  for (const key of CLOTHING_KEYS) {
    out.push({ key: `characters/${key}`, frameW: CHAR_FRAME_W, frameH: CHAR_FRAME_H, frames: 1, pixel: false });
  }
  for (const species of ANIMAL_SPECIES) {
    for (const action of ANIMAL_ACTION_ORDER) {
      const def = ANIMAL_ACTIONS[species][action];
      out.push({ key: animalSheetKey(species, action), frameW: ANIMAL_SIZE[species].w, frameH: ANIMAL_SIZE[species].h, frames: def.frames, pixel: false });
    }
  }
  return out;
}

/** 需要在普通 SVG 注册里排除掉的 key（含短名别名） */
export function sheetKeySet(): Set<string> {
  const set = new Set<string>();
  for (const def of allSheetDefs()) {
    set.add(def.key);
    set.add(def.key.split('/').pop() as string);
  }
  return set;
}

/**
 * 注册一张精灵图。
 * 像素图：先按 4 倍渲染（整数坐标矩形的边缘正好落在像素块上），
 *         再取每个色块正中心的像素，得到干净的 1x 像素图，最后用 NEAREST 过滤。
 * 矢量图：按 2 倍栅格化，保持平滑。
 */
export async function registerSheet(scene: Phaser.Scene, def: SheetDef): Promise<boolean> {
  if (scene.textures.exists(def.key)) return true;
  try {
    const img = await svgToImage(art(def.key).src);
    const ss = def.pixel ? 4 : RATIO;
    const bigW = def.frameW * def.frames * ss;
    const bigH = def.frameH * ss;
    const big = document.createElement('canvas');
    big.width = bigW;
    big.height = bigH;
    const bctx = big.getContext('2d');
    if (!bctx) return false;
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(img, 0, 0, bigW, bigH);

    let source = big;
    if (def.pixel) {
      const src = bctx.getImageData(0, 0, bigW, bigH).data;
      const out = document.createElement('canvas');
      out.width = def.frameW * def.frames;
      out.height = def.frameH;
      const octx = out.getContext('2d');
      if (!octx) return false;
      const outData = octx.createImageData(out.width, out.height);
      const half = Math.floor(ss / 2);
      for (let y = 0; y < out.height; y += 1) {
        for (let x = 0; x < out.width; x += 1) {
          const si = ((y * ss + half) * bigW + (x * ss + half)) * 4;
          const di = (y * out.width + x) * 4;
          outData.data[di] = src[si];
          outData.data[di + 1] = src[si + 1];
          outData.data[di + 2] = src[si + 2];
          outData.data[di + 3] = src[si + 3];
        }
      }
      octx.putImageData(outData, 0, 0);
      source = out;
    }

    const texture = scene.textures.addCanvas(def.key, source);
    if (!texture) return false;
    const fs = def.pixel ? 1 : RATIO;
    for (let i = 0; i < def.frames; i += 1) {
      texture.add(i, 0, i * def.frameW * fs, 0, def.frameW * fs, def.frameH * fs);
    }
    if (def.pixel) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return true;
  } catch (err) {
    console.warn(`[texture] 精灵图 ${def.key} 生成失败`, err);
    return false;
  }
}

/** 创建全部角色 / 动物动画 */
export function createSheetsAnimations(scene: Phaser.Scene): void {
  for (const kind of CHAR_KINDS) {
    for (const action of CHAR_ACTION_ORDER) {
      const key = characterAnimKey(kind, action);
      if (scene.anims.exists(key)) continue;
      const def = CHAR_ACTIONS[action];
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(characterSheetKey(kind, action), { start: 0, end: def.frames - 1 }),
        frameRate: def.fps,
        repeat: def.loop ? -1 : 0,
      });
    }
  }
  for (const species of ANIMAL_SPECIES) {
    for (const action of ANIMAL_ACTION_ORDER) {
      const key = animalAnimKey(species, action);
      if (scene.anims.exists(key)) continue;
      const def = ANIMAL_ACTIONS[species][action];
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(animalSheetKey(species, action), { start: 0, end: def.frames - 1 }),
        frameRate: def.fps,
        repeat: def.loop ? -1 : 0,
      });
    }
  }
}

/** 世界里的显示尺寸（SVG 设计尺寸 × scale） */
export const artSize = (key: string, scale: number): { w: number; h: number } => {
  const a = art(key);
  return { w: a.w * scale, h: a.h * scale };
};
