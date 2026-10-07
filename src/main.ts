/**
 * 《小小彩虹牧场》入口
 * - Phaser 负责游戏世界（Canvas/WebGL）
 * - DOM 负责界面（顶部状态栏、快捷栏、商店/厨房/订单等面板）
 * - 所有资源都内嵌在打包结果中，不依赖任何外部图片或 CDN，离线可玩
 */
import Phaser from 'phaser';
import './styles/ui.css';
import { ART } from './assets';
import { GameConfig } from './game/GameConfig';
import { bus, EV } from './game/EventBus';
import { store } from './game/GameState';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { RanchScene } from './scenes/RanchScene';
import { ChickenCoopScene } from './scenes/ChickenCoopScene';
import { GardenScene } from './scenes/GardenScene';
import { BarnScene } from './scenes/BarnScene';
import { Hud } from './ui/Hud';
import { Panels } from './ui/Panels';
import { audio } from './systems/AudioSystem';
import { CROPS, RECIPES, itemDef } from './data/catalog';

const uiRoot = document.getElementById('ui-root') as HTMLElement;
const hud = new Hud(uiRoot);
const panels = new Panels(hud);

const game = new Phaser.Game({
  ...GameConfig,
  scene: [BootScene, TitleScene, RanchScene, ChickenCoopScene, GardenScene, BarnScene],
});

let panelOpen = false;
const debugEnabled = new URLSearchParams(location.search).has('debug') || true;

/* ------------------------------------------------------------------ */
/* 时间推进                                                            */
/* ------------------------------------------------------------------ */

game.events.on(Phaser.Core.Events.PRE_STEP, (time: number, delta: number) => {
  if (panelOpen) return;
  store.tick(delta, time);
});

/* ------------------------------------------------------------------ */
/* 场景切换 / 面板                                                     */
/* ------------------------------------------------------------------ */

const switchScene = (key: string) => {
  const active = game.scene.getScenes(true);
  const running = active.find((s) => s.scene.key !== 'Boot');
  if (running) {
    running.scene.start(key);
  } else {
    game.scene.start(key);
  }
};

bus.on(EV.gotoScene, (key: string) => switchScene(key));
bus.on(EV.openPanel, () => {
  panelOpen = true;
});
bus.on(EV.closePanel, () => {
  panelOpen = false;
});
bus.on(EV.sfx, (name: string) => audio.play(name as never));
bus.on('ui:title', (on: boolean) => {
  panelOpen = on;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    bus.emit(EV.closePanel);
    panelOpen = false;
  }
});

/* ------------------------------------------------------------------ */
/* 首次交互解锁音频（浏览器自动播放策略）                              */
/* ------------------------------------------------------------------ */

const unlock = () => {
  audio.setSound(store.data.settings.sound);
  audio.setMusic(store.data.settings.music);
  audio.unlock();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

/* ------------------------------------------------------------------ */
/* 自适应缩放（DOM 界面与 Canvas 完全对齐）                            */
/* ------------------------------------------------------------------ */

const updateScale = () => {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  document.documentElement.style.setProperty('--ui-scale', String(Math.max(0.55, Math.min(scale, 1.8))));
};
updateScale();
window.addEventListener('resize', updateScale);
window.addEventListener('orientationchange', updateScale);

/* ------------------------------------------------------------------ */
/* 隐藏载入画面                                                        */
/* ------------------------------------------------------------------ */

game.events.once(Phaser.Core.Events.READY, () => {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.classList.add('hidden');
    window.setTimeout(() => screen.remove(), 600);
  }
  hud.setVisible(false);
});

let readyFlag = false;
const markReady = () => {
  if (readyFlag) return;
  readyFlag = true;
  if (window.__RANCH__) window.__RANCH__.ready = true;
};
bus.on('ui:scene', markReady);
bus.on('ui:title', markReady);

/* ------------------------------------------------------------------ */
/* 存档：切到后台、关闭页面前保存                                      */
/* ------------------------------------------------------------------ */

document.addEventListener('visibilitychange', () => {
  if (document.hidden) store.save();
});
window.addEventListener('beforeunload', () => store.save());
window.setInterval(() => store.save(), 20000);

/* ------------------------------------------------------------------ */
/* 调试 / 自动化验收接口                                               */
/* ------------------------------------------------------------------ */

const activeScene = (): Phaser.Scene | undefined => game.scene.getScenes(true).find((s) => s.scene.key !== 'Boot');

const debugApi = {
  ready: false,
  game,
  version: 1,
  artCount: Object.keys(ART).length,
  state: () => ({
    scene: activeScene()?.scene.key,
    coins: store.data.coins,
    stars: store.data.stars,
    day: store.data.day,
    time: store.timeString,
    weather: store.data.weather,
    crops: store.data.crops,
    orders: store.data.orders.length,
    inventory: store.data.inventory,
    animals: store.data.animals.map((a) => ({ id: a.id, species: a.species, produceReady: a.produceReady })),
  }),
  get store() {
    return store;
  },
  gotoScene: (key: string) => switchScene(key),
  teleport: (x: number, y: number) => {
    const scene = activeScene() as unknown as { player?: { setPosition: (x: number, y: number) => void } };
    scene?.player?.setPosition(x, y);
    return true;
  },
  setZoom: (z: number) => {
    const scene = activeScene() as unknown as { cameras?: { main: { setZoom: (v: number) => void } } };
    scene?.cameras?.main.setZoom(z);
    return z;
  },
  switchCharacter: (kind?: 'boy' | 'girl') => {
    const next = kind ?? (store.data.character === 'boy' ? 'girl' : 'boy');
    store.chooseCharacter(next);
    return store.data.character;
  },
  setTool: (tool: string) => {
    store.setTool(tool as never);
    return store.tool;
  },
  equipItem: (id: string, slot: string) => {
    store.data.owned.push(id);
    store.equip(id, slot as never);
    return store.data.equipped;
  },
  petAnimal: (species: string) => {
    const a = store.data.animals.find((x) => x.species === species);
    if (!a) return false;
    store.pet(a.id);
    return true;
  },
  feedAnimal: (species: string) => {
    const a = store.data.animals.find((x) => x.species === species);
    if (!a) return false;
    store.addItem('feed', 3, true);
    return store.feed(a.id);
  },
  /** 重开档（含清空存档），用于验收"开局状态" */
  resetSave: (kind: 'boy' | 'girl' = 'girl') => {
    store.reset(kind);
    bus.emit('ui:title', false);
    switchScene('Ranch');
    return true;
  },
  startGame: (kind: 'boy' | 'girl' = 'girl') => {
    store.chooseCharacter(kind);
    bus.emit('ui:title', false);
    switchScene('Ranch');
    return true;
  },
  movePlayer: (dx: number, dy: number) => {
    const scene = activeScene() as unknown as { player?: { setPosition: (x: number, y: number) => void; x: number; y: number } };
    if (scene?.player) scene.player.setPosition(scene.player.x + dx, scene.player.y + dy);
  },
  interactNearest: () => {
    const scene = activeScene() as unknown as { interactNearest?: () => boolean };
    return scene?.interactNearest?.() ?? false;
  },
  openPanel: (name: string) => {
    panelOpen = true;
    bus.emit(EV.openPanel, { name });
  },
  closePanel: () => {
    panelOpen = false;
    bus.emit(EV.closePanel);
  },
  setWeather: (kind: string) => {
    const normalized = (kind === 'rain' ? 'rainy' : kind) as 'sunny' | 'cloudy' | 'rainy';
    store.debugSetWeather(normalized);
    return store.data.weather;
  },
  setTimeOfDay: (phase: string) => {
    const normalized = (phase === 'evening' ? 'dusk' : phase) as 'day' | 'dusk' | 'night';
    store.debugSetPhase(normalized);
    return store.phase;
  },
  addItem: (id: string, n = 1) => store.addItem(id, n),
  addCoins: (n: number) => {
    store.data.coins += n;
    store.notify();
  },
  /** 鸡舍：捡走所有鸡蛋 */
  collectAllEggs: () => {
    const scene = activeScene() as unknown as { eggs?: Array<{ item: unknown }>; pickEgg?: (egg: unknown) => void };
    if (!scene?.eggs?.length || !scene.pickEgg) return 0;
    const list = [...scene.eggs];
    list.forEach((egg) => scene.pickEgg?.(egg));
    return list.length;
  },
  /** 牧场：捡走地上的鸡蛋 */
  collectGroundEggs: () => {
    const scene = activeScene() as unknown as { eggs?: Array<{ item: unknown }>; pickEgg?: (egg: unknown) => void };
    if (!scene?.eggs?.length || !scene.pickEgg) return 0;
    const list = [...scene.eggs];
    list.forEach((egg) => scene.pickEgg?.(egg));
    return list.length;
  },
  plantAll: () => {
    store.addItem('carrot_seed', 9, true);
    let n = 0;
    for (let plot = 0; plot < 9; plot += 1) if (store.plant(plot, 'carrot_seed')) n += 1;
    store.notify();
    return n;
  },
  waterAll: () => {
    let n = 0;
    for (let plot = 0; plot < 9; plot += 1) if (store.waterPlot(plot)) n += 1;
    return n;
  },
  growAll: () => {
    store.debugFastForward(600);
    return store.data.crops.map((c) => c.stage);
  },
  harvestAll: () => {
    let n = 0;
    for (let plot = 0; plot < 9; plot += 1) if (store.harvest(plot)) n += 1;
    return n;
  },
  cookRecipe: (id: string) => {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe) return { ok: false, reason: 'no recipe' };
    Object.entries(recipe.ingredients).forEach(([item, n]) => store.addItem(item, n, true));
    const result = store.cook(id);
    store.notify();
    return result;
  },
  deliverFirstOrder: () => {
    const order = store.data.orders[0];
    if (!order) return false;
    order.request.forEach((r) => store.addItem(r.item, r.quantity, true));
    return store.deliverOrder(order.id);
  },
  /** 让所有动物立刻可以产出 */
  readyAllProduce: () => {
    store.data.animals.forEach((a) => {
      a.produceReady = true;
      a.lastProduceAt = 0;
    });
    store.notify();
  },
  seedInfo: () => Object.values(CROPS).map((c) => ({ id: c.seedId, name: c.name, count: store.count(c.seedId) })),
  itemsInfo: () => Object.keys(store.data.inventory).map((id) => ({ id, name: itemDef(id).name, count: store.count(id) })),
};

declare global {
  interface Window {
    __RANCH__: typeof debugApi & { ready: boolean };
  }
}

if (debugEnabled) window.__RANCH__ = debugApi;
