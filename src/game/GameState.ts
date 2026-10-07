/**
 * 游戏状态仓库：所有可存档数据 + 业务规则（种菜、照顾动物、烹饪、订单、商店）
 * 时间、天气、作物生长、动物需求都在 tick() 里推进。
 */
import { bus, EV } from './EventBus';
import { clearSave, readRawSave, writeSave, SAVE_VERSION } from './SaveManager';
import type {
  AnimalSave,
  CharacterKind,
  CropSave,
  GameStateData,
  ItemRequest,
  OrderData,
  PlacedDecoration,
  Species,
  ToolId,
  WeatherKind,
  DayPhase,
  Settings,
} from './types';
import { CROPS, GARDEN_PLOTS, ITEMS, REPEATABLE, RECIPES, START_ANIMALS, START_OUTFIT, TUNING, cropBySeed, itemDef, makeOrder } from '../data/catalog';

export interface CookResult {
  ok: boolean;
  reason?: string;
  missing?: string[];
}

export interface BuyResult {
  ok: boolean;
  reason?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function createDefaultState(character: CharacterKind = 'girl'): GameStateData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    character,
    started: false,
    coins: TUNING.startCoins,
    stars: 0,
    inventory: { ...TUNING.startInventory },
    owned: [...START_OUTFIT],
    equipped: { hat: 'ragged_hat', top: 'ragged_shirt', pants: 'ragged_pants' },
    decorations: [],
    animals: START_ANIMALS.map((a) => ({
      id: a.id,
      species: a.species,
      name: a.name,
      personality: a.personality,
      favoriteFood: a.favoriteFood,
      color: a.color,
      friendship: 1,
      mood: 78,
      hunger: 82,
      cleanliness: 90,
      produceReady: false,
      lastProduceAt: 0,
      x: a.x,
      y: a.y,
    })),
    crops: [],
    orders: [],
    weather: 'sunny',
    nextWeather: 'sunny',
    weatherBlend: 1,
    day: 1,
    minutes: TUNING.dayStartMinute,
    stats: { eggs: 0, harvests: 0, orders: 0, cooked: 0, pets: 0 },
    settings: { sound: true, music: true },
    tutorialDone: [],
  };
}

/** 校验并补全从 localStorage 读出的数据；无法修复时返回 null */
function sanitize(raw: unknown): GameStateData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<GameStateData> & Record<string, unknown>;
  if (typeof obj !== 'object') return null;
  const base = createDefaultState((obj.character === 'boy' || obj.character === 'girl' ? obj.character : 'girl') as CharacterKind);

  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

  const isOldSave = typeof obj.version !== 'number' || obj.version < SAVE_VERSION;
  const animals: AnimalSave[] = Array.isArray(obj.animals)
    ? (obj.animals as AnimalSave[]).filter((a) => a && typeof a.id === 'string' && ITEMS && ['chicken', 'sheep', 'cow'].includes(a.species))
    : base.animals;

  const crops: CropSave[] = Array.isArray(obj.crops)
    ? (obj.crops as CropSave[]).filter((c) => c && typeof c.plot === 'number' && !!CROPS[c.cropId]).map((c) => ({ ...c, stage: clamp(num(c.stage, 0), 0, 4) }))
    : [];

  return {
    ...base,
    ...obj,
    version: SAVE_VERSION,
    character: (obj.character === 'boy' || obj.character === 'girl' ? obj.character : 'girl') as CharacterKind,
    started: !!obj.started,
    coins: Math.max(0, Math.round(num(obj.coins, base.coins))),
    stars: Math.max(0, Math.round(num(obj.stars, 0))),
    inventory: typeof obj.inventory === 'object' && obj.inventory ? { ...(obj.inventory as Record<string, number>) } : {},
    owned: isOldSave
      ? [...new Set([...(Array.isArray(obj.owned) ? (obj.owned as string[]) : []), ...START_OUTFIT])]
      : Array.isArray(obj.owned)
        ? (obj.owned as string[]).filter((id) => typeof id === 'string')
        : [],
    equipped: isOldSave
      ? { hat: 'ragged_hat', top: 'ragged_shirt', pants: 'ragged_pants', ...(typeof obj.equipped === 'object' && obj.equipped ? obj.equipped : {}) }
      : typeof obj.equipped === 'object' && obj.equipped
        ? { ...(obj.equipped as GameStateData['equipped']) }
        : {},
    decorations: Array.isArray(obj.decorations) ? (obj.decorations as PlacedDecoration[]).filter((d) => d && typeof d.itemId === 'string') : [],
    animals: animals.length ? animals : base.animals,
    crops,
    orders: Array.isArray(obj.orders) ? (obj.orders as OrderData[]).filter((o) => o && Array.isArray(o.request)) : [],
    weather: (['sunny', 'cloudy', 'rainy'] as WeatherKind[]).includes(obj.weather as WeatherKind) ? (obj.weather as WeatherKind) : 'sunny',
    nextWeather: (['sunny', 'cloudy', 'rainy'] as WeatherKind[]).includes(obj.nextWeather as WeatherKind) ? (obj.nextWeather as WeatherKind) : 'sunny',
    weatherBlend: clamp(num(obj.weatherBlend, 1), 0, 1),
    day: Math.max(1, Math.round(num(obj.day, 1))),
    minutes: clamp(num(obj.minutes, TUNING.dayStartMinute), 0, 1439),
    stats: { ...base.stats, ...(typeof obj.stats === 'object' && obj.stats ? obj.stats : {}) },
    settings: { ...base.settings, ...(typeof obj.settings === 'object' && obj.settings ? obj.settings : {}) } as Settings,
    tutorialDone: Array.isArray(obj.tutorialDone) ? (obj.tutorialDone as string[]) : [],
  };
}

export class GameStore {
  data: GameStateData;

  /** UI 状态（不存档） */
  tool: ToolId = 'hand';
  selectedSeed = 'carrot_seed';
  currentSceneKey = 'Ranch';

  private listeners = new Set<() => void>();
  private lastEmit = 0;
  private minuteAcc = 0;
  private saveDirty = false;
  private autosaveAcc = 0;
  private offlineMinutes = 0;

  constructor() {
    const raw = readRawSave();
    const loaded = raw ? sanitize(raw) : null;
    this.data = loaded ?? createDefaultState();
    if (loaded && typeof (raw as { savedAt?: number }).savedAt === 'number') {
      const elapsedRealMs = Math.max(0, Date.now() - (raw as { savedAt: number }).savedAt);
      const minutes = (elapsedRealMs / 1000) * (60 / TUNING.secondsPerGameHour);
      this.offlineMinutes = Math.min(minutes, 3 * 60); // 离线最多推进 3 小时
    }
    if (!loaded) this.ensureOrders();
    this.applyOfflineProgress();
    if (!this.data.orders.length) this.ensureOrders();
  }

  /* ---------------------------------------------------------------- */
  /* 订阅                                                              */
  /* ---------------------------------------------------------------- */

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    this.saveDirty = true;
    this.listeners.forEach((fn) => fn());
    bus.emit(EV.stateChanged, this.data);
  }

  /** 节流版 notify，用于每帧变化（时间） */
  notifyThrottled(now: number): void {
    if (now - this.lastEmit < 500) return;
    this.lastEmit = now;
    this.listeners.forEach((fn) => fn());
  }

  /* ---------------------------------------------------------------- */
  /* 时间 / 天气 / 昼夜                                                */
  /* ---------------------------------------------------------------- */

  get absoluteMinute(): number {
    return (this.data.day - 1) * 1440 + this.data.minutes;
  }

  get phase(): DayPhase {
    const m = this.data.minutes;
    if (m >= TUNING.nightStart || m < 5 * 60) return 'night';
    if (m >= TUNING.duskStart) return 'dusk';
    return 'day';
  }

  get timeString(): string {
    const h = Math.floor(this.data.minutes / 60) % 24;
    const m = Math.floor(this.data.minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** deltaMs：真实毫秒 */
  tick(deltaMs: number, now: number): void {
    const minutes = (deltaMs / 1000) * (60 / TUNING.secondsPerGameHour);
    if (minutes <= 0) return;
    this.advance(minutes);
    this.autosaveAcc += deltaMs;
    if (this.autosaveAcc >= TUNING.autosaveMs) {
      this.autosaveAcc = 0;
      if (this.saveDirty) this.save();
    }
    this.notifyThrottled(now);
  }

  private advance(dm: number): void {
    const d = this.data;
    d.minutes += dm;
    while (d.minutes >= 1440) {
      d.minutes -= 1440;
      d.day += 1;
    }

    this.advanceWeather(dm);
    this.growCrops(dm);
    this.updateAnimals(dm);
    this.updateOrders();
  }

  private advanceWeather(dm: number): void {
    const d = this.data;
    if (d.weatherBlend < 1) {
      d.weatherBlend = clamp(d.weatherBlend + dm / 40, 0, 1);
      if (d.weatherBlend >= 1) {
        d.weather = d.nextWeather;
        bus.emit(EV.weatherChanged, d.weather);
      }
    }
    this.weatherTimer -= dm;
    if (this.weatherTimer <= 0) {
      const pool: WeatherKind[] = ['sunny', 'sunny', 'cloudy', 'sunny', 'rainy', 'cloudy'];
      let next = pool[Math.floor(Math.random() * pool.length)];
      if (next === d.nextWeather) next = next === 'sunny' ? 'cloudy' : 'sunny';
      d.nextWeather = next;
      d.weatherBlend = 0;
      this.weatherTimer = 90 + Math.random() * 120;
    }
  }

  private weatherTimer = 120;

  private growCrops(dm: number): void {
    const d = this.data;
    const phase = this.phase;
    const raining = d.weather === 'rainy' && d.weatherBlend > 0.4;
    for (const crop of d.crops) {
      const def = CROPS[crop.cropId];
      if (!def || crop.stage >= 4) continue;
      if (raining) crop.watered = true;
      let factor = crop.watered ? TUNING.growthWatered : TUNING.growthDry;
      if (raining) factor = TUNING.growthRain;
      if (phase !== 'day') factor *= TUNING.growthNight;
      crop.progress += dm * factor;
      const need = def.stageMinutes[clamp(crop.stage, 0, 3)];
      while (crop.stage < 4 && crop.progress >= need) {
        crop.progress -= need;
        crop.stage += 1;
      }
      if (crop.stage >= 4) crop.progress = 0;
    }
  }

  private updateAnimals(dm: number): void {
    const hours = dm / 60;
    const absMinute = this.absoluteMinute;
    for (const a of this.data.animals) {
      a.hunger = clamp(a.hunger - TUNING.hungerPerHour * hours, 0, 100);
      a.cleanliness = clamp(a.cleanliness - TUNING.cleanlinessPerHour * hours, 0, 100);
      const want = (a.hunger / 100) * 55 + (a.cleanliness / 100) * 25 + (a.friendship / 5) * 20;
      a.mood = clamp(a.mood + (want - a.mood) * 0.08 * hours + TUNING.moodDriftPerHour * hours * 0.1, 0, 100);
      if (!a.produceReady && absMinute - a.lastProduceAt >= TUNING.produceCooldown[a.species]) {
        a.produceReady = true;
      }
    }
  }

  private updateOrders(): void {
    const d = this.data;
    const abs = this.absoluteMinute;
    const expired = d.orders.filter((o) => o.expiresAt <= abs);
    if (expired.length) {
      d.orders = d.orders.filter((o) => o.expiresAt > abs);
      this.saveDirty = true;
    }
    this.ensureOrders();
  }

  ensureOrders(): void {
    const d = this.data;
    let guard = 0;
    while (d.orders.length < TUNING.maxOrders && guard < 6) {
      guard += 1;
      const order = makeOrder(++this.orderSeq, this.absoluteMinute, d.stars);
      if (!d.orders.some((o) => o.id === order.id)) d.orders.push(order);
    }
  }

  private orderSeq = Math.floor(Math.random() * 900) + 1;

  private applyOfflineProgress(): void {
    if (this.offlineMinutes <= 1) return;
    const snapshot = this.offlineMinutes;
    this.offlineMinutes = 0;
    // 离线时间不会推进"当前分钟"，只让作物/动物缓慢变化，避免回来时变成深夜
    const dm = snapshot;
    const d = this.data;
    for (const crop of d.crops) {
      const def = CROPS[crop.cropId];
      if (!def || crop.stage >= 4) continue;
      crop.progress += dm * (crop.watered ? 1 : 0.5);
      const need = def.stageMinutes[clamp(crop.stage, 0, 3)];
      while (crop.stage < 4 && crop.progress >= need) {
        crop.progress -= need;
        crop.stage += 1;
      }
    }
    for (const a of d.animals) {
      a.hunger = clamp(a.hunger - TUNING.hungerPerHour * (dm / 60), 5, 100);
      a.cleanliness = clamp(a.cleanliness - TUNING.cleanlinessPerHour * (dm / 60), 10, 100);
      if (!a.produceReady && this.absoluteMinute - a.lastProduceAt + dm >= TUNING.produceCooldown[a.species]) {
        a.produceReady = true;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 基础资源                                                          */
  /* ---------------------------------------------------------------- */

  count(id: string): number {
    return this.data.inventory[id] ?? 0;
  }

  addItem(id: string, n = 1, silent = false): void {
    if (n === 0) return;
    this.data.inventory[id] = Math.max(0, (this.data.inventory[id] ?? 0) + n);
    if (!silent) {
      bus.emit(EV.toast, { icon: itemDef(id).icon, text: `+${n} ${itemDef(id).name}` });
      this.notify();
    }
  }

  removeItem(id: string, n = 1): boolean {
    if (this.count(id) < n) return false;
    this.data.inventory[id] -= n;
    if (this.data.inventory[id] <= 0) delete this.data.inventory[id];
    this.notify();
    return true;
  }

  hasAll(request: ItemRequest[]): boolean {
    return request.every((r) => this.count(r.item) >= r.quantity);
  }

  addCoins(n: number): void {
    this.data.coins = Math.max(0, this.data.coins + n);
    bus.emit(EV.toast, { icon: 'ui/coin', text: `+${n}` });
    this.notify();
  }

  spendCoins(n: number): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.notify();
    return true;
  }

  addStars(n: number): void {
    this.data.stars += n;
    bus.emit(EV.toast, { icon: 'ui/rainbow_star', text: `+${n} 彩虹星星` });
    this.notify();
  }

  /* ---------------------------------------------------------------- */
  /* 商店 / 装扮                                                       */
  /* ---------------------------------------------------------------- */

  isUnlocked(id: string): boolean {
    const unlock = ITEMS[id]?.unlockStars ?? 0;
    return this.data.stars >= unlock;
  }

  buy(id: string): BuyResult {
    const def = ITEMS[id];
    if (!def) return { ok: false, reason: '没有这个物品' };
    if (!this.isUnlocked(id)) return { ok: false, reason: `还需要 ${def.unlockStars} 颗彩虹星星` };
    const owned = this.data.owned.includes(id);
    if (!REPEATABLE.has(id) && owned && def.category !== 'decor') return { ok: false, reason: '已经拥有啦' };
    if (this.data.coins < def.price) return { ok: false, reason: '金币不够哦' };
    this.data.coins -= def.price;
    if (!this.data.owned.includes(id)) this.data.owned.push(id);
    this.data.inventory[id] = (this.data.inventory[id] ?? 0) + 1;
    bus.emit(EV.sfx, 'coin');
    bus.emit(EV.toast, { icon: def.icon, text: `买到 ${def.name}！` });
    this.notify();
    return { ok: true };
  }

  equip(id: string | null, slot?: 'hat' | 'top' | 'pants' | 'shoes' | 'backpack' | 'accessory'): void {
    if (!id) {
      if (slot) delete this.data.equipped[slot];
      this.notify();
      return;
    }
    const def = ITEMS[id];
    const target = slot ?? def?.slot;
    if (!target) return;
    if (this.data.equipped[target] === id) delete this.data.equipped[target];
    else this.data.equipped[target] = id;
    bus.emit(EV.sfx, 'click');
    this.notify();
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id) || REPEATABLE.has(id);
  }

  /* ---------------------------------------------------------------- */
  /* 菜地                                                              */
  /* ---------------------------------------------------------------- */

  cropAt(plot: number): CropSave | undefined {
    return this.data.crops.find((c) => c.plot === plot);
  }

  plant(plot: number, seedId: string): boolean {
    if (plot < 0 || plot >= GARDEN_PLOTS) return false;
    if (this.cropAt(plot)) return false;
    const def = cropBySeed(seedId);
    if (!def) return false;
    if (this.count(seedId) <= 0) return false;
    this.removeItem(seedId, 1);
    this.data.crops.push({ id: `crop_${Date.now()}_${plot}`, cropId: def.id, plot, stage: 0, watered: false, progress: 0 });
    bus.emit(EV.sfx, 'plant');
    this.notify();
    return true;
  }

  waterPlot(plot: number): boolean {
    const crop = this.cropAt(plot);
    if (!crop) return false;
    crop.watered = true;
    bus.emit(EV.sfx, 'water');
    this.notify();
    return true;
  }

  /** 立刻长好（给小朋友的"帮忙长大"魔法水壶，教学用） */
  speedUp(plot: number): boolean {
    const crop = this.cropAt(plot);
    if (!crop || crop.stage >= 4) return false;
    crop.stage += 1;
    crop.progress = 0;
    this.notify();
    return true;
  }

  harvest(plot: number): string | null {
    const crop = this.cropAt(plot);
    if (!crop || crop.stage < 4) return null;
    const def = CROPS[crop.cropId];
    if (!def) return null;
    this.data.crops = this.data.crops.filter((c) => c.plot !== plot);
    this.addItem(def.id, def.yield, true);
    this.data.stats.harvests += def.yield;
    bus.emit(EV.sfx, 'harvest');
    bus.emit(EV.toast, { icon: def.icon, text: `+${def.yield} ${def.name}` });
    this.notify();
    return def.id;
  }

  /* ---------------------------------------------------------------- */
  /* 动物                                                              */
  /* ---------------------------------------------------------------- */

  animal(id: string): AnimalSave | undefined {
    return this.data.animals.find((a) => a.id === id);
  }

  pet(id: string): boolean {
    const a = this.animal(id);
    if (!a) return false;
    a.mood = clamp(a.mood + 6, 0, 100);
    a.friendship = clamp(a.friendship + 0.34, 0, 5);
    this.data.stats.pets += 1;
    bus.emit(EV.sfx, a.species === 'chicken' ? 'cluck' : a.species === 'sheep' ? 'baa' : 'moo');
    this.notify();
    return true;
  }

  feed(id: string, itemId = 'feed'): boolean {
    const a = this.animal(id);
    if (!a) return false;
    if (this.count(itemId) <= 0) return false;
    this.removeItem(itemId, 1);
    a.hunger = clamp(a.hunger + (itemId === a.favoriteFood ? 55 : 38), 0, 100);
    a.mood = clamp(a.mood + (itemId === a.favoriteFood ? 16 : 8), 0, 100);
    a.friendship = clamp(a.friendship + 0.2, 0, 5);
    bus.emit(EV.sfx, 'feed');
    this.notify();
    return true;
  }

  wash(id: string): boolean {
    const a = this.animal(id);
    if (!a) return false;
    a.cleanliness = 100;
    a.mood = clamp(a.mood + 5, 0, 100);
    bus.emit(EV.sfx, 'water');
    this.notify();
    return true;
  }

  /** 收集牛奶 / 羊毛 */
  collectProduce(id: string): string | null {
    const a = this.animal(id);
    if (!a || !a.produceReady) return null;
    if (a.species === 'sheep' && !this.data.owned.includes('wool_brush')) return 'need_brush';
    const item = a.species === 'cow' ? 'milk' : a.species === 'sheep' ? 'wool' : 'egg';
    const amount = a.species === 'cow' ? (a.mood > 70 ? 2 : 1) : 1;
    a.produceReady = false;
    a.lastProduceAt = this.absoluteMinute;
    a.mood = clamp(a.mood + 4, 0, 100);
    this.addItem(item, amount, true);
    bus.emit(EV.sfx, a.species === 'cow' ? 'milk' : 'harvest');
    bus.emit(EV.toast, { icon: itemDef(item).icon, text: `+${amount} ${itemDef(item).name}` });
    this.notify();
    return item;
  }

  /** 鸡在牧场里下蛋 / 鸡舍捡蛋 */
  collectEgg(kind: 'egg' | 'egg_color' | 'egg_gold' = 'egg'): void {
    this.addItem(kind, 1, true);
    this.data.stats.eggs += 1;
    bus.emit(EV.sfx, 'pickup');
    bus.emit(EV.toast, { icon: itemDef(kind).icon, text: `+1 ${itemDef(kind).name}` });
    this.notify();
  }

  /* ---------------------------------------------------------------- */
  /* 料理                                                              */
  /* ---------------------------------------------------------------- */

  canCook(recipeId: string): CookResult {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { ok: false, reason: '没有这个食谱' };
    if ((recipe.unlockStars ?? 0) > this.data.stars) return { ok: false, reason: `还需要 ${recipe.unlockStars} 颗彩虹星星` };
    const missing = Object.entries(recipe.ingredients)
      .filter(([id, n]) => this.count(id) < n)
      .map(([id]) => id);
    if (missing.length) return { ok: false, reason: '材料还不够', missing };
    return { ok: true };
  }

  cook(recipeId: string): CookResult {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { ok: false, reason: '没有这个食谱' };
    const check = this.canCook(recipeId);
    if (!check.ok) return check;
    for (const [id, n] of Object.entries(recipe.ingredients)) this.removeItem(id, n);
    this.addItem(recipe.id, 1, true);
    this.data.stats.cooked += 1;
    bus.emit(EV.sfx, 'cook');
    bus.emit(EV.toast, { icon: recipe.icon, text: `做好啦：${recipe.name}` });
    this.notify();
    return { ok: true };
  }

  /* ---------------------------------------------------------------- */
  /* 订单                                                              */
  /* ---------------------------------------------------------------- */

  deliverOrder(orderId: string): boolean {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return false;
    if (!this.hasAll(order.request)) return false;
    for (const r of order.request) this.removeItem(r.item, r.quantity);
    this.data.orders = this.data.orders.filter((o) => o.id !== orderId);
    this.data.stats.orders += 1;
    this.data.coins += order.reward.coins;
    this.data.stars += order.reward.stars;
    bus.emit(EV.sfx, 'cheer');
    bus.emit(EV.toast, { icon: 'ui/coin', text: `+${order.reward.coins} 金币` });
    bus.emit(EV.toast, { icon: 'ui/rainbow_star', text: `+${order.reward.stars} 彩虹星星` });
    this.ensureOrders();
    this.notify();
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* 装饰                                                              */
  /* ---------------------------------------------------------------- */

  placeDecoration(itemId: string, x: number, y: number): boolean {
    if (this.count(itemId) <= 0) return false;
    this.removeItem(itemId, 1);
    this.data.decorations.push({ uid: `dec_${Date.now()}_${Math.floor(Math.random() * 999)}`, itemId, x, y });
    bus.emit(EV.sfx, 'plant');
    this.notify();
    return true;
  }

  removeDecoration(uid: string): boolean {
    const deco = this.data.decorations.find((d) => d.uid === uid);
    if (!deco) return false;
    this.data.decorations = this.data.decorations.filter((d) => d.uid !== uid);
    this.addItem(deco.itemId, 1, true);
    this.notify();
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* 角色 / 设置 / 存档                                                */
  /* ---------------------------------------------------------------- */

  chooseCharacter(kind: CharacterKind): void {
    this.data.character = kind;
    this.data.started = true;
    this.notify();
  }

  setTool(tool: ToolId): void {
    this.tool = tool;
    bus.emit(EV.toolChanged, tool);
  }

  toggleSound(): void {
    this.data.settings.sound = !this.data.settings.sound;
    this.notify();
  }

  toggleMusic(): void {
    this.data.settings.music = !this.data.settings.music;
    bus.emit(EV.sfx, 'click');
    this.notify();
  }

  markTutorial(key: string): void {
    if (!this.data.tutorialDone.includes(key)) {
      this.data.tutorialDone.push(key);
      this.notify();
    }
  }

  /** 回小屋睡一觉：直接到第二天早上（不惩罚，作物夜里也会慢慢长） */
  sleepToMorning(): void {
    this.advance(240);
    this.data.day += 1;
    this.data.minutes = TUNING.dayStartMinute;
    this.data.weather = 'sunny';
    this.data.nextWeather = 'sunny';
    this.data.weatherBlend = 1;
    bus.emit(EV.weatherChanged, 'sunny');
    bus.emit(EV.phaseChanged, 'day');
    this.notify();
    this.save();
  }

  save(): boolean {
    const ok = writeSave(this.data);
    this.saveDirty = !ok;
    return ok;
  }

  reset(character: CharacterKind = this.data.character): void {
    clearSave();
    this.data = createDefaultState(character);
    this.data.started = true;
    this.ensureOrders();
    this.notify();
  }

  /* ---------------------------------------------------------------- */
  /* 调试用                                                            */
  /* ---------------------------------------------------------------- */

  debugSetWeather(kind: WeatherKind): void {
    this.data.weather = kind;
    this.data.nextWeather = kind;
    this.data.weatherBlend = 1;
    bus.emit(EV.weatherChanged, kind);
    this.notify();
  }

  debugSetPhase(phase: DayPhase): void {
    this.data.minutes = phase === 'day' ? 9 * 60 : phase === 'dusk' ? 17 * 60 + 40 : 21 * 60;
    bus.emit(EV.phaseChanged, phase);
    this.notify();
  }

  /** 调试用：立刻让所有生产就绪、作物成熟 */
  debugFastForward(minutes: number): void {
    this.advance(minutes);
    this.notify();
  }
}

export const store = new GameStore();
export { createDefaultState };
