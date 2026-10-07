/**
 * 全部 SVG 美术资源在构建时以字符串形式打包进 JS（?raw），
 * 运行时用 Canvas 栅格化成贴图 —— 因此游戏不依赖任何外部图片/CDN，离线可玩。
 */
const modules = import.meta.glob('../assets/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface Art {
  /** 形如 'animals/chicken' */
  key: string;
  src: string;
  /** SVG 设计宽高（viewBox 单位） */
  w: number;
  h: number;
}

export const ART: Record<string, Art> = {};

for (const [path, src] of Object.entries(modules)) {
  // 开发环境 key 形如 '../assets/animals/chicken.svg'，构建后形如 './animals/chicken.svg'，
  // 这里统一归一化成 'animals/chicken'
  const key = path
    .replace(/^\.\//, '')
    .replace(/^.*?assets\//, '')
    .replace(/\.svg$/, '');
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(src);
  const w = m ? parseFloat(m[1]) : 100;
  const h = m ? parseFloat(m[2]) : 100;
  ART[key] = { key, src, w, h };
  // 同时注册短名（去掉目录），方便按 'chicken' 直接取用
  const short = key.split('/').pop() as string;
  if (!ART[short]) ART[short] = ART[key];
}

export const art = (key: string): Art => {
  const found = ART[key];
  if (!found) {
    console.warn(`[assets] 缺少美术资源: ${key}`);
    return ART['ui/star'] ?? { key: 'missing', src: '', w: 100, h: 100 };
  }
  return found;
};

export const artSrc = (key: string): string => art(key).src;

/** 去掉 SVG 根标签上的固定宽高，让它在 DOM 里自适应尺寸 */
export const inlineSvg = (key: string, className = 'svg-icon'): string =>
  art(key)
    .src.replace(/<svg /, `<svg class="${className}" `)
    .replace(/ width="[\d.]+" height="[\d.]+"/, ' width="100%" height="100%"')
    .replace(/\n/g, '');
