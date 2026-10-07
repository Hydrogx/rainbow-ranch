/**
 * 把 src/assets 下的 SVG 美术资源同步到 public/assets/，
 * 使部署产物中的目录结构与 PRD 第 11.2 节一致，方便美术替换素材。
 *
 * 游戏运行时并不依赖 public/ 下的文件（贴图由打包进 JS 的 SVG 源串实时栅格化），
 * 所以即使这些文件缺失，游戏依然可以离线正常运行。
 *
 * 运行：node scripts/sync-assets.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'assets');
const dest = join(root, 'public', 'assets');

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(src, full));
  }
  return out;
};

if (!existsSync(src)) {
  console.error('[sync-assets] 找不到 src/assets，请先运行 node scripts/generate-art.mjs');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const files = walk(src);
for (const rel of files) {
  const target = join(dest, rel);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(src, rel), target);
}

console.log(`[sync-assets] 已同步 ${files.length} 个资源 -> public/assets/`);
