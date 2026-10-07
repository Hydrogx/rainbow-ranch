/**
 * 《小小彩虹牧场》自动化验收脚本
 * ------------------------------------------------------------
 * 1. 用 node:http 起静态服务器托管 dist/
 * 2. 用系统 Chrome（puppeteer-core，不下载浏览器）打开页面
 * 3. 收集所有 console 错误 / 未捕获异常 / 资源 404
 * 4. 按剧本操作游戏，逐步截图到 verification/
 *
 * 用法：
 *   node scripts/verify.mjs            # 完整剧本
 *   node scripts/verify.mjs --quick    # 只做启动检查
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shots = join(root, 'verification');
const PORT = Number(process.env.VERIFY_PORT || 4319);
const QUICK = process.argv.includes('--quick');

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 无头环境的 GL 性能提示属于噪音，不计入问题 */
const IGNORE_WARN = [/GL Driver Message/, /GPU stall/];

function startServer() {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = join(dist, normalize(url).replace(/^(\.\.[/\\])+/, ''));
    if (url.endsWith('/')) filePath = join(filePath, 'index.html');
    if (!existsSync(filePath) || !extname(filePath)) {
      const asHtml = `${filePath}.html`;
      filePath = existsSync(asHtml) ? asHtml : join(dist, 'index.html');
    }
    try {
      const body = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch (err) {
      res.writeHead(404);
      res.end(`not found: ${url} (${err.message})`);
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  if (!existsSync(dist)) {
    console.error('[verify] 找不到 dist/，请先运行 npm run build');
    process.exit(1);
  }
  mkdirSync(shots, { recursive: true });

  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) {
    console.error('[verify] 没有找到可用的 Chrome/Chromium');
    process.exit(1);
  }

  const server = await startServer();
  const base = `http://127.0.0.1:${PORT}/`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1440,900',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  const warnings = [];
  let currentStep = '启动';
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') errors.push(`[${currentStep}] console.error: ${text}`);
    else if ((msg.type() === 'warning' || msg.type() === 'warn') && !IGNORE_WARN.some((re) => re.test(text)))
      warnings.push(`[${currentStep}] console.warn: ${text}`);
  });
  page.on('pageerror', (err) => {
    const stack = (err.stack || '').split('\n').slice(0, 4).join(' | ');
    errors.push(`[${currentStep}] pageerror: ${err.message} :: ${stack}`);
  });
  page.on('requestfailed', (req) => errors.push(`[${currentStep}] requestfailed: ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`[${currentStep}] http ${res.status()}: ${res.url()}`);
  });

  const shot = async (name) => {
    await page.screenshot({ path: join(shots, `${name}.png`) });
    console.log(`  📸 ${name}.png`);
  };

  const step = async (label, fn) => {
    currentStep = label;
    process.stdout.write(`▶ ${label}\n`);
    try {
      await fn();
    } catch (err) {
      errors.push(`[${label}] 步骤失败: ${err.message}`);
      await shot(`error-${label.replace(/[^\w-]/g, '_')}`);
    }
  };

  const waitReady = async () => {
    await page.waitForFunction(() => !!window.__RANCH__ && window.__RANCH__.ready === true, { timeout: 30000 });
  };

  const call = (name, ...args) => page.evaluate((n, a) => window.__RANCH__[n](...a), name, args);

  /** 按游戏内坐标（1280x720 设计分辨率）点击 canvas */
  const clickGame = async (gx, gy, wait = 500) => {
    const box = await page.evaluate(() => {
      const c = document.querySelector('#game-root canvas');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(box.x + (gx / 1280) * box.w, box.y + (gy / 720) * box.h);
    await sleep(wait);
  };

  const clickSel = async (sel, wait = 420) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 });
    await page.click(sel);
    await sleep(wait);
  };

  await step('打开页面并等待游戏就绪', async () => {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitReady();
    await sleep(600);
    await shot('00-title');
  });

  if (QUICK) {
    await browser.close();
    server.close();
    reportWarnings(warnings, errors);
    return;
  }

  await step('选择女孩角色并进入牧场', async () => {
    await call('startGame', 'girl');
    await sleep(2000);
    await shot('01-ranch');
  });

  await step('牧场巡视（四个角落）', async () => {
    await call('teleport', 900, 820);
    await sleep(900);
    await shot('01b-ranch-north');
    await call('teleport', 1000, 1200);
    await sleep(900);
    await shot('01c-ranch-pens');
    await call('teleport', 1200, 1700);
    await sleep(900);
    await shot('01d-ranch-south');
    await call('teleport', 1900, 1500);
    await sleep(900);
    await shot('01e-ranch-guests');
    await call('teleport', 1410, 1500);
    await sleep(700);
  });

  await step('照顾动物（喂食 + 抚摸，用快捷栏工具）', async () => {
    await call('readyAllProduce');
    await call('teleport', 620, 1120);
    await sleep(800);
    await clickSel('#hotbar-feed');
    await call('interactNearest');
    await sleep(900);
    await shot('02-animal-feed');
    await clickSel('#hotbar-water');
    await call('interactNearest');
    await sleep(900);
    await shot('02b-animal-wash');
    await clickSel('#hotbar-hand');
    await call('interactNearest');
    await sleep(700);
    await shot('02c-animal-pet');
    await call('collectGroundEggs');
    await sleep(400);
  });

  await step('商店：购买种子与装扮', async () => {
    await clickSel('#btn-orders');
    await sleep(600);
    await shot('07-orders');
    await call('closePanel');
    await sleep(300);
    await call('openPanel', 'shop');
    await sleep(700);
    await shot('03-shop');
    const bought = await page.evaluate(() => {
      window.__RANCH__.addCoins(300);
      const ids = ['carrot_seed', 'strawberry_seed', 'feed', 'feed', 'hat_straw', 'overalls', 'sneakers', 'backpack', 'flowers', 'fence', 'windmill'];
      return ids.map((id) => ({ id, ok: window.__RANCH__.store.buy(id).ok }));
    });
    await sleep(500);
    await shot('03b-shop-bought');
    console.log('   购买结果:', JSON.stringify(bought.filter((b) => !b.ok)));
    await call('closePanel');
    await sleep(300);
  });

  await step('换装间', async () => {
    await clickSel('#btn-wardrobe');
    await sleep(700);
    await page.evaluate(() => {
      window.__RANCH__.equipItem('hat_straw', 'hat');
      window.__RANCH__.equipItem('overalls', 'top');
      window.__RANCH__.equipItem('sneakers', 'shoes');
      window.__RANCH__.equipItem('backpack', 'backpack');
    });
    await sleep(600);
    await shot('12-wardrobe');
    await call('closePanel');
    await sleep(400);
  });

  await step('摆放一个装饰物', async () => {
    await clickSel('#hotbar-decor');
    await sleep(500);
    await shot('13-decor-picker');
    await page.evaluate(() => {
      const first = document.querySelector('.picker-item');
      if (first) first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await sleep(300);
    await page.evaluate(() => {
      const first = document.querySelector('.picker-item');
      if (first) first.click();
    });
    await sleep(400);
    await call('teleport', 1500, 1400);
    await sleep(900);
    await shot('13b-decor-placed');
    await page.mouse.click(720, 500);
    await sleep(800);
    await shot('13c-decor-placed2');
    await call('setTool', 'hand');
  });

  await step('进入鸡舍捡鸡蛋', async () => {
    await call('gotoScene', 'ChickenCoop');
    await sleep(2200);
    await shot('04-coop');
    const n = await call('collectAllEggs');
    console.log(`   捡到 ${n} 个鸡蛋`);
    await sleep(1200);
    await shot('04b-coop-after');
  });

  await step('牛棚：挤牛奶节奏小游戏（真实点击左右按钮）', async () => {
    await call('readyAllProduce');
    await call('gotoScene', 'Barn');
    await sleep(2400);
    await shot('17-barn');
    await call('teleport', 680, 520);
    await sleep(800);
    let started = false;
    for (let i = 0; i < 4 && !started; i += 1) {
      await call('interactNearest');
      await sleep(500);
      started = await page.evaluate(() => {
        const s = window.__RANCH__.game.scene.getScenes(true).find((x) => x.scene.key === 'Barn');
        return !!(s && s.playing);
      });
    }
    console.log(`   挤奶小游戏已开始: ${started}`);
    if (!started) errors.push('[牛棚] 没能开始挤奶小游戏');
    await sleep(600);
    await shot('17b-milking');
    const milkBefore = await page.evaluate(() => window.__RANCH__.store.count('milk'));
    for (let i = 0; i < 9; i += 1) {
      await clickGame(i % 2 === 0 ? 170 : 1110, 470, 340);
      if (i === 3) await shot('17c-milking-half');
    }
    await sleep(900);
    await shot('17d-milking-done');
    const milkAfter = await page.evaluate(() => window.__RANCH__.store.count('milk'));
    console.log(`   挤奶前 ${milkBefore} 瓶 → 挤奶后 ${milkAfter} 瓶`);
    if (milkAfter <= milkBefore) errors.push('[牛棚] 挤奶后牛奶数量没有增加');
  });

  await step('回小屋睡一觉到第二天', async () => {
    await call('gotoScene', 'Ranch');
    await sleep(1800);
    await call('teleport', 320, 760);
    await sleep(700);
    const dayBefore = await page.evaluate(() => window.__RANCH__.store.data.day);
    await call('openPanel', 'sleep');
    await sleep(800);
    await shot('18-sleep');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.cook-actions .big-btn')];
      const yes = btns.find((b) => b.textContent.includes('睡一觉'));
      if (yes) yes.click();
    });
    await sleep(1800);
    await shot('18b-new-day');
    const dayAfter = await page.evaluate(() => window.__RANCH__.store.data.day);
    console.log(`   第 ${dayBefore} 天 → 第 ${dayAfter} 天`);
    if (dayAfter <= dayBefore) errors.push('[睡觉] 睡一觉之后天数没有增加');
  });

  await step('菜地：播种 → 浇水 → 长大 → 收获', async () => {
    await call('gotoScene', 'Garden');
    await sleep(2200);
    await page.evaluate(() => {
      for (let i = 0; i < 9; i += 1) window.__RANCH__.store.data.crops.length && null;
    });
    await call('plantAll');
    await sleep(1000);
    await shot('05a-garden-planted');
    await call('waterAll');
    await sleep(900);
    await shot('05b-garden-watered');
    await call('growAll');
    await sleep(1200);
    await shot('05c-garden-grown');
    const h = await call('harvestAll');
    console.log(`   收获 ${h} 块地`);
    await sleep(900);
    await shot('05d-garden-harvested');
  });

  await step('厨房烹饪', async () => {
    await call('gotoScene', 'Ranch');
    await sleep(1200);
    await call('openPanel', 'kitchen');
    await sleep(800);
    await page.evaluate(() => {
      const rows = document.querySelectorAll('.recipe-row');
      if (rows[1]) rows[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await sleep(300);
    await page.evaluate(() => {
      const rows = document.querySelectorAll('.recipe-row');
      if (rows[1]) rows[1].click();
    });
    await sleep(700);
    await page.evaluate(() => {
      window.__RANCH__.addItem('milk', 4);
      window.__RANCH__.addItem('strawberry', 4);
    });
    await sleep(500);
    await shot('06-kitchen-recipe');
    // 点两次材料（牛奶 + 草莓）
    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(() => {
        const chips = document.querySelectorAll('.ing-chip:not(.done)');
        if (chips[0]) chips[0].click();
      });
      await sleep(600);
    }
    await shot('06b-kitchen-ingredients');
    // 依次点 搅拌 / 加热 / 装盘
    for (let i = 0; i < 3; i += 1) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.cook-actions .big-btn')].filter((b) => !b.disabled);
        if (btns[0]) btns[0].click();
      });
      await sleep(800);
    }
    await shot('06c-kitchen-done');
    await call('closePanel');
    await sleep(400);
  });

  await step('客人订单交付', async () => {
    await call('openPanel', 'orders');
    await sleep(700);
    await shot('07b-orders');
    const ok = await call('deliverFirstOrder');
    console.log(`   交付订单: ${ok}`);
    await sleep(1600);
    await shot('08-order-delivered');
    await call('closePanel');
    await sleep(500);
  });

  await step('背包与设置', async () => {
    await clickSel('#btn-bag');
    await sleep(700);
    await shot('14-bag');
    await call('closePanel');
    await sleep(300);
    await clickSel('#btn-settings');
    await sleep(600);
    await shot('15-settings');
    await call('closePanel');
    await sleep(300);
  });

  await step('天气：雨天', async () => {
    await call('setWeather', 'rainy');
    await sleep(2200);
    await shot('09-rain');
  });

  await step('天气：阴天', async () => {
    await call('setWeather', 'cloudy');
    await sleep(1800);
    await shot('09b-cloudy');
  });

  await step('昼夜：傍晚与夜晚', async () => {
    await call('setWeather', 'sunny');
    await call('setTimeOfDay', 'dusk');
    await sleep(1600);
    await shot('10-dusk');
    await call('setTimeOfDay', 'night');
    await sleep(2200);
    await shot('11-night');
    await call('setTimeOfDay', 'day');
    await sleep(900);
    await shot('11b-day-again');
  });

  await step('小屏幕适配（平板 / 手机）', async () => {
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    await sleep(1400);
    await shot('19-tablet');
    await call('openPanel', 'shop');
    await sleep(800);
    await shot('19b-tablet-shop');
    await call('closePanel');
    await sleep(400);
    await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
    await sleep(1600);
    await shot('20-phone');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await sleep(900);
  });

  await step('存档：刷新页面后恢复进度', async () => {
    const before = await call('state');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady();
    await sleep(2500);
    const after = await call('state');
    await shot('16-reload');
    console.log(`   刷新前: 金币 ${before.coins} 星星 ${before.stars} 第 ${before.day} 天`);
    console.log(`   刷新后: 金币 ${after.coins} 星星 ${after.stars} 第 ${after.day} 天`);
    if (after.coins !== before.coins) errors.push(`[存档] 刷新后金币不一致：${before.coins} -> ${after.coins}`);
    if (after.scene !== 'Ranch') errors.push(`[存档] 刷新后没有回到牧场，当前场景 ${after.scene}`);
  });

  await step('男孩：像素行走动画与换装预览', async () => {
    await page.evaluate(() => localStorage.removeItem('rainbow-ranch-save'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady();
    await sleep(1400);
    await call('startGame', 'boy');
    await sleep(2600);
    await shot('21-boy-ranch');
    const frames = [];
    await page.keyboard.down('ArrowLeft');
    // 无头环境是软件渲染，帧率很低，取样窗口要长一些才能覆盖完整循环
    for (let i = 0; i < 12; i += 1) {
      await sleep(220);
      frames.push(
        await page.evaluate(() => {
          const s = window.__RANCH__.game.scene.getScenes(true).find((x) => x.scene.key === 'Ranch');
          return s.player.baseSprite.frame.name;
        }),
      );
    }
    await shot('21b-boy-walk');
    await page.keyboard.up('ArrowLeft');
    await sleep(500);
    const idleFrame = await page.evaluate(() => {
      const s = window.__RANCH__.game.scene.getScenes(true).find((x) => x.scene.key === 'Ranch');
      return s.player.baseSprite.frame.name;
    });
    console.log(`   走路帧序列: ${frames.join(' → ')}，停下后: ${idleFrame}`);
    if (new Set(frames).size < 2) errors.push('[男孩] 行走动画没有切换帧');
    await call('openPanel', 'wardrobe');
    await sleep(900);
    await shot('21c-boy-wardrobe');
    await call('closePanel');
    await sleep(400);
  });

  await browser.close();
  server.close();
  reportWarnings(warnings, errors);
}

function reportWarnings(warnings, errors) {
  console.log('\n================ 验收结果 ================');
  if (warnings.length) {
    console.log(`⚠️  ${warnings.length} 条警告（前 10 条）：`);
    warnings.slice(0, 10).forEach((w) => console.log('   -', w));
  }
  if (errors.length) {
    console.log(`❌ ${errors.length} 条错误：`);
    errors.slice(0, 40).forEach((e) => console.log('   -', e));
    process.exitCode = 1;
  } else {
    console.log('✅ 无 console 错误、无异常、无 404');
  }
}

main().catch((err) => {
  console.error('[verify] 崩溃：', err);
  process.exit(1);
});
