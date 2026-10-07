/**
 * 线上验收：直接打开 GitHub Pages 上的真实地址，检查能否正常开玩。
 *
 * 用法：
 *   node scripts/verify-live.mjs                     # 默认 https://hydrogx.github.io/rainbow-ranch/
 *   node scripts/verify-live.mjs https://example.com/rainbow-ranch/
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'verification');
const URL_ARG = process.argv[2] || 'https://hydrogx.github.io/rainbow-ranch/';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IGNORE_WARN = [/GL Driver Message/, /GPU stall/];

const browser = await puppeteer.launch({
  executablePath: CHROME_CANDIDATES.find((p) => existsSync(p)),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
});
mkdirSync(shots, { recursive: true });

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const errors = [];
const warnings = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') errors.push(`console.error: ${t}`);
  else if ((m.type() === 'warning' || m.type() === 'warn') && !IGNORE_WARN.some((re) => re.test(t))) warnings.push(`console.warn: ${t}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
});

console.log(`▶ 打开线上地址 ${URL_ARG}`);
await page.goto(URL_ARG, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.__RANCH__ && window.__RANCH__.ready === true, { timeout: 60000 });
await sleep(800);
await page.screenshot({ path: join(shots, 'live-00-title.png') });
console.log('  📸 live-00-title.png');

const art = await page.evaluate(() => ({ count: window.__RANCH__.artCount, version: window.__RANCH__.version }));
console.log(`  资源数量: ${art.count}`);

await page.evaluate(() => window.__RANCH__.startGame('girl'));
await sleep(2600);
await page.screenshot({ path: join(shots, 'live-01-ranch.png') });
console.log('  📸 live-01-ranch.png');

await page.evaluate(() => {
  window.__RANCH__.readyAllProduce();
  window.__RANCH__.gotoScene('ChickenCoop');
});
await sleep(2600);
const eggs = await page.evaluate(() => window.__RANCH__.collectAllEggs());
await sleep(900);
await page.screenshot({ path: join(shots, 'live-02-coop.png') });
console.log(`  📸 live-02-coop.png（捡到 ${eggs} 个鸡蛋）`);

await page.evaluate(() => window.__RANCH__.gotoScene('Garden'));
await sleep(2400);
await page.evaluate(() => {
  window.__RANCH__.plantAll();
  window.__RANCH__.waterAll();
  window.__RANCH__.growAll();
});
await sleep(1400);
await page.screenshot({ path: join(shots, 'live-03-garden.png') });
console.log('  📸 live-03-garden.png');

await page.evaluate(() => window.__RANCH__.openPanel('shop'));
await sleep(900);
await page.screenshot({ path: join(shots, 'live-04-shop.png') });
console.log('  📸 live-04-shop.png');

const state = await page.evaluate(() => window.__RANCH__.state());
console.log(`  当前状态: 场景=${state.scene} 金币=${state.coins} 天气=${state.weather}`);

await browser.close();

console.log('\n================ 线上验收结果 ================');
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} 条警告（前 5 条）：`);
  warnings.slice(0, 5).forEach((w) => console.log('   -', w));
}
if (errors.length) {
  console.log(`❌ ${errors.length} 条错误：`);
  errors.slice(0, 20).forEach((e) => console.log('   -', e));
  process.exitCode = 1;
} else {
  console.log(`✅ 线上地址可以正常试玩：${URL_ARG}`);
}
