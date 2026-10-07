/** DOM 小工具：把 SVG 资源内联进界面，避免任何额外请求 */
import { inlineSvg, art } from '../assets';

export const icon = (key: string, size = 30, className = 'svg-icon'): string =>
  `<span class="ico" style="--s:${size}px">${inlineSvg(key, className)}</span>`;

export const rawSvg = (key: string, className = 'svg-icon'): string => inlineSvg(key, className);

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

export const artName = (key: string) => art(key).key;

/** 小圆点数字（背包数量等） */
export const badge = (n: number): string => (n > 0 ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : '');
