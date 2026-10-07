/**
 * 游戏数据表：物品 / 作物 / 食谱 / 商店 / 客人 / 数值调参
 * （对应 PRD 第 4.5、4.6、4.7、7 节）
 */
import type { CropDef, ItemDef, ItemRequest, OrderData, Personality, RecipeDef, Species } from '../game/types';

/* ------------------------------------------------------------------ */
/* 数值调参                                                            */
/* ------------------------------------------------------------------ */

export const TUNING = {
  /** 游戏内一天的起始时间（分钟） */
  dayStartMinute: 6 * 60,
  /** 现实多少秒 = 游戏内 1 小时 */
  secondsPerGameHour: 22,
  /** 白天的时段划分（分钟） */
  duskStart: 17 * 60,
  nightStart: 19 * 60,
  /** 作物生长系数 */
  growthWatered: 1,
  growthDry: 0.5,
  growthNight: 0.1,
  growthRain: 1.3,
  /** 动物数值衰减（每游戏小时） */
  hungerPerHour: 6,
  cleanlinessPerHour: 4,
  moodDriftPerHour: 3,
  /** 生产冷却（游戏分钟） */
  produceCooldown: { chicken: 200, sheep: 420, cow: 360 } as Record<Species, number>,
  /** 订单同时存在的数量 */
  maxOrders: 3,
  /** 订单有效期（游戏小时） */
  orderLifetimeHours: 8,
  /** 捡鸡蛋场景里每只鸡平均多久下一个蛋（游戏分钟） */
  coopEggInterval: 45,
  /** 自动存档间隔（毫秒） */
  autosaveMs: 8000,
  /** 初始资源 */
  startCoins: 30,
  startInventory: { carrot_seed: 2, feed: 3 } as Record<string, number>,
};

/* ------------------------------------------------------------------ */
/* 物品                                                                */
/* ------------------------------------------------------------------ */

const def = (d: ItemDef): ItemDef => d;

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    /* 农产品 */
    def({ id: 'egg', name: '鸡蛋', icon: 'props/egg', category: 'produce', price: 6, desc: '小鸡下的蛋，可以做南瓜派。' }),
    def({ id: 'egg_color', name: '彩色蛋', icon: 'props/egg_color', category: 'produce', price: 14, desc: '稀有的彩色鸡蛋，闪闪发光。' }),
    def({ id: 'egg_gold', name: '金蛋', icon: 'props/egg_gold', category: 'produce', price: 28, desc: '最闪亮的金蛋，客人都很喜欢。' }),
    def({ id: 'milk', name: '牛奶', icon: 'food/milk', category: 'produce', price: 10, desc: '从奶牛那里挤来的新鲜牛奶。' }),
    def({ id: 'wool', name: '羊毛', icon: 'props/wool', category: 'produce', price: 9, desc: '用羊毛刷梳下来的软软羊毛。' }),
    def({ id: 'carrot', name: '胡萝卜', icon: 'crops/carrot', category: 'produce', price: 5, desc: '脆脆的胡萝卜。' }),
    def({ id: 'tomato', name: '番茄', icon: 'crops/tomato', category: 'produce', price: 5, desc: '红红的番茄，酸酸甜甜。' }),
    def({ id: 'corn', name: '玉米', icon: 'crops/corn', category: 'produce', price: 6, desc: '金黄的玉米，是小鸡的最爱。' }),
    def({ id: 'pumpkin', name: '南瓜', icon: 'crops/pumpkin', category: 'produce', price: 8, desc: '又大又圆的南瓜。' }),
    def({ id: 'lettuce', name: '生菜', icon: 'crops/lettuce', category: 'produce', price: 4, desc: '绿油油的生菜。' }),
    def({ id: 'strawberry', name: '草莓', icon: 'crops/strawberry', category: 'produce', price: 7, desc: '甜甜的草莓。' }),

    /* 饲料 */
    def({ id: 'feed', name: '动物饲料', icon: 'props/feed_bag', category: 'produce', price: 2, desc: '喂给动物吃，它会很开心。' }),

    /* 料理 */
    def({ id: 'warm_milk', name: '温牛奶', icon: 'food/milk', category: 'food', price: 14, desc: '热乎乎的牛奶，睡前喝最棒。' }),
    def({ id: 'strawberry_milk', name: '草莓牛奶', icon: 'food/strawberry_milk', category: 'food', price: 20, desc: '粉粉的草莓牛奶。' }),
    def({ id: 'tomato_salad', name: '番茄沙拉', icon: 'food/tomato_salad', category: 'food', price: 18, desc: '清爽的番茄沙拉。' }),
    def({ id: 'corn_soup', name: '玉米浓汤', icon: 'food/corn_soup', category: 'food', price: 22, desc: '香香浓浓的玉米汤。' }),
    def({ id: 'pumpkin_pie', name: '南瓜派', icon: 'food/pumpkin_pie', category: 'food', price: 26, desc: '甜甜的南瓜派。' }),
    def({ id: 'veggie_sandwich', name: '蔬菜三明治', icon: 'food/veggie_sandwich', category: 'food', price: 28, desc: '料超多的三明治。' }),
    def({ id: 'rainbow_cup', name: '彩虹水果杯', icon: 'food/rainbow_cup', category: 'food', price: 32, unlockStars: 6, desc: '一层一层像彩虹一样的甜点。' }),
    def({ id: 'creamy_carrot', name: '奶油胡萝卜', icon: 'food/creamy_carrot', category: 'food', price: 24, unlockStars: 10, desc: '奶香味的胡萝卜。' }),

    /* 种子 */
    def({ id: 'carrot_seed', name: '胡萝卜种子', icon: 'crops/seed_carrot', category: 'seed', price: 3, desc: '种在菜地里，长成胡萝卜。' }),
    def({ id: 'tomato_seed', name: '番茄种子', icon: 'crops/seed_tomato', category: 'seed', price: 3, desc: '种在菜地里，长成番茄。' }),
    def({ id: 'corn_seed', name: '玉米种子', icon: 'crops/seed_corn', category: 'seed', price: 4, desc: '种在菜地里，长成玉米。' }),
    def({ id: 'pumpkin_seed', name: '南瓜种子', icon: 'crops/seed_pumpkin', category: 'seed', price: 5, desc: '种在菜地里，长成大南瓜。' }),
    def({ id: 'lettuce_seed', name: '生菜种子', icon: 'crops/seed_lettuce', category: 'seed', price: 3, desc: '种在菜地里，长成生菜。' }),
    def({ id: 'strawberry_seed', name: '草莓种子', icon: 'crops/seed_strawberry', category: 'seed', price: 4, desc: '种在菜地里，长成草莓。' }),

    /* 动物用品 */
    def({ id: 'hay', name: '鸡舍干草', icon: 'props/haypile', category: 'supply', price: 12, use: 'feed', desc: '铺在鸡舍里，小鸡睡得更香。' }),
    def({ id: 'colorful_trough', name: '彩色饲料槽', icon: 'props/trough', category: 'supply', price: 40, use: 'trough', desc: '动物们会自己跑来吃饭。' }),
    def({ id: 'star_trough', name: '星星饮水槽', icon: 'props/water_trough', category: 'supply', price: 40, use: 'water_trough', desc: '装满清水，动物随时能喝。' }),
    def({ id: 'wool_brush', name: '羊毛刷', icon: 'ui/brush', category: 'supply', price: 30, use: 'brush', desc: '给绵羊梳毛，可以收获羊毛。' }),
    def({ id: 'cow_bell', name: '牛铃铛', icon: 'props/bell', category: 'supply', price: 35, use: 'bell', desc: '叮叮当当，奶牛心情更好。' }),
    def({ id: 'animal_ball', name: '动物玩具球', icon: 'props/ball', category: 'supply', price: 25, use: 'toy', desc: '和动物一起玩，亲密度上升。' }),

    /* 角色装饰 */
    def({ id: 'hat_straw', name: '草帽', icon: 'characters/hat_straw', category: 'clothing', price: 30, slot: 'hat', desc: '晒太阳的时候戴上它。' }),
    def({ id: 'hat_rain', name: '雨帽', icon: 'characters/hat_rain', category: 'clothing', price: 35, slot: 'hat', desc: '下雨天也不怕淋湿。' }),
    def({ id: 'hat_chef', name: '厨师帽', icon: 'characters/hat_chef', category: 'clothing', price: 45, slot: 'hat', desc: '戴上就像大厨师。' }),
    def({ id: 'ears', name: '动物耳朵发箍', icon: 'characters/ears', category: 'clothing', price: 40, slot: 'accessory', desc: '毛茸茸的猫耳朵。' }),
    def({ id: 'hairpin', name: '星星发夹', icon: 'characters/hairpin', category: 'clothing', price: 35, slot: 'accessory', desc: '一闪一闪的小星星。' }),
    def({ id: 'scarf', name: '彩虹围巾', icon: 'characters/scarf', category: 'clothing', price: 40, slot: 'accessory', desc: '暖暖的彩虹围巾。' }),
    def({ id: 'overalls', name: '园丁背带裤', icon: 'characters/overalls', category: 'clothing', price: 45, slot: 'top', desc: '干活最方便的背带裤。' }),
    def({ id: 'raincoat', name: '雨衣', icon: 'characters/raincoat', category: 'clothing', price: 50, slot: 'top', desc: '下雨天穿上亮黄色雨衣。' }),
    def({ id: 'boots', name: '雨靴', icon: 'characters/boots', category: 'clothing', price: 40, slot: 'shoes', desc: '踩水洼最开心。' }),
    def({ id: 'sneakers', name: '彩虹鞋', icon: 'characters/sneakers', category: 'clothing', price: 35, slot: 'shoes', desc: '跑起来像风一样。' }),
    def({ id: 'backpack', name: '彩色背包', icon: 'characters/backpack', category: 'clothing', price: 45, slot: 'backpack', desc: '能装好多好多东西。' }),

    /* 牧场装饰 */
    def({ id: 'path', name: '小路', icon: 'props/path', category: 'decor', price: 10, desc: '在草地上铺一条小路。' }),
    def({ id: 'flowers', name: '花朵', icon: 'props/flower', category: 'decor', price: 15, desc: '把牧场装点得漂漂亮亮。' }),
    def({ id: 'mushroom', name: '蘑菇', icon: 'props/mushroom', category: 'decor', price: 20, desc: '可爱的红蘑菇。' }),
    def({ id: 'fence', name: '木栅栏', icon: 'props/fence', category: 'decor', price: 25, desc: '围出属于自己的小天地。' }),
    def({ id: 'pumpkin_lantern', name: '南瓜灯', icon: 'props/pumpkin_lantern', category: 'decor', price: 50, desc: '晚上会亮起来。' }),
    def({ id: 'mailbox', name: '邮箱', icon: 'props/mailbox', category: 'decor', price: 55, desc: '客人会把信放进这里。' }),
    def({ id: 'rainbow_flag', name: '彩虹旗', icon: 'props/rainbow_flag', category: 'decor', price: 60, desc: '彩虹牧场的小旗子。' }),
    def({ id: 'birdhouse', name: '鸟屋', icon: 'props/birdhouse', category: 'decor', price: 65, desc: '小鸟会来做客。' }),
    def({ id: 'windmill', name: '风车', icon: 'props/windmill', category: 'decor', price: 90, unlockStars: 8, desc: '风一吹就转起来。' }),
    def({ id: 'pond', name: '小池塘', icon: 'props/pond', category: 'decor', price: 120, unlockStars: 12, desc: '鸭子和小鱼的家。' }),
  ].map((i) => [i.id, i]),
);

export const itemDef = (id: string): ItemDef =>
  ITEMS[id] ?? { id, name: id, icon: 'ui/star', category: 'produce', price: 1, desc: '' };

/* ------------------------------------------------------------------ */
/* 作物                                                                */
/* ------------------------------------------------------------------ */

export const CROPS: Record<string, CropDef> = Object.fromEntries(
  (
    [
      { id: 'carrot', name: '胡萝卜', seedId: 'carrot_seed', icon: 'crops/carrot', stageMinutes: [28, 34, 38, 44], yield: 2, seedPrice: 3 },
      { id: 'lettuce', name: '生菜', seedId: 'lettuce_seed', icon: 'crops/lettuce', stageMinutes: [24, 30, 34, 38], yield: 2, seedPrice: 3 },
      { id: 'tomato', name: '番茄', seedId: 'tomato_seed', icon: 'crops/tomato', stageMinutes: [32, 38, 42, 50], yield: 2, seedPrice: 3 },
      { id: 'strawberry', name: '草莓', seedId: 'strawberry_seed', icon: 'crops/strawberry', stageMinutes: [36, 42, 46, 54], yield: 3, seedPrice: 4 },
      { id: 'corn', name: '玉米', seedId: 'corn_seed', icon: 'crops/corn', stageMinutes: [40, 46, 52, 60], yield: 2, seedPrice: 4 },
      { id: 'pumpkin', name: '南瓜', seedId: 'pumpkin_seed', icon: 'crops/pumpkin', stageMinutes: [50, 58, 64, 72], yield: 1, seedPrice: 5 },
    ] as CropDef[]
  ).map((c) => [c.id, c]),
);

export const cropBySeed = (seedId: string): CropDef | undefined =>
  Object.values(CROPS).find((c) => c.seedId === seedId);

/** 菜地格子数量 */
export const GARDEN_PLOTS = 9;

/* ------------------------------------------------------------------ */
/* 食谱                                                                */
/* ------------------------------------------------------------------ */

export const RECIPES: RecipeDef[] = [
  { id: 'warm_milk', name: '温牛奶', icon: 'food/milk', ingredients: { milk: 1 }, price: 14, hint: '把牛奶加热一下就好啦。' },
  { id: 'strawberry_milk', name: '草莓牛奶', icon: 'food/strawberry_milk', ingredients: { milk: 1, strawberry: 1 }, price: 20, hint: '牛奶 + 草莓' },
  { id: 'tomato_salad', name: '番茄沙拉', icon: 'food/tomato_salad', ingredients: { tomato: 1, lettuce: 1 }, price: 18, hint: '番茄 + 生菜' },
  { id: 'corn_soup', name: '玉米浓汤', icon: 'food/corn_soup', ingredients: { corn: 1, milk: 1 }, price: 22, hint: '玉米 + 牛奶' },
  { id: 'pumpkin_pie', name: '南瓜派', icon: 'food/pumpkin_pie', ingredients: { pumpkin: 1, egg: 1 }, price: 26, hint: '南瓜 + 鸡蛋' },
  { id: 'veggie_sandwich', name: '蔬菜三明治', icon: 'food/veggie_sandwich', ingredients: { lettuce: 1, tomato: 1, corn: 1 }, price: 28, hint: '生菜 + 番茄 + 玉米' },
  { id: 'rainbow_cup', name: '彩虹水果杯', icon: 'food/rainbow_cup', ingredients: { strawberry: 1, tomato: 1 }, price: 32, unlockStars: 6, hint: '草莓 + 番茄（番茄也是水果哦）' },
  { id: 'creamy_carrot', name: '奶油胡萝卜', icon: 'food/creamy_carrot', ingredients: { carrot: 1, milk: 1 }, price: 24, unlockStars: 10, hint: '胡萝卜 + 牛奶' },
];

export const recipeById = (id: string): RecipeDef | undefined => RECIPES.find((r) => r.id === id);

/* ------------------------------------------------------------------ */
/* 商店分类                                                            */
/* ------------------------------------------------------------------ */

export const SHOP_CATEGORIES = [
  { id: 'seed', name: '种子', icon: 'ui/seed', itemIds: ['carrot_seed', 'tomato_seed', 'corn_seed', 'pumpkin_seed', 'lettuce_seed', 'strawberry_seed'] },
  { id: 'supply', name: '动物用品', icon: 'ui/feed', itemIds: ['hay', 'colorful_trough', 'star_trough', 'wool_brush', 'cow_bell', 'animal_ball'] },
  { id: 'clothing', name: '角色装饰', icon: 'characters/hat_straw', itemIds: ['hat_straw', 'hat_rain', 'hat_chef', 'ears', 'hairpin', 'scarf', 'overalls', 'raincoat', 'boots', 'sneakers', 'backpack'] },
  { id: 'decor', name: '牧场装饰', icon: 'ui/decor', itemIds: ['path', 'flowers', 'mushroom', 'fence', 'pumpkin_lantern', 'mailbox', 'rainbow_flag', 'birdhouse', 'windmill', 'pond'] },
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORIES)[number]['id'];

/** 商店里可以反复购买的物品 */
export const REPEATABLE = new Set(['carrot_seed', 'tomato_seed', 'corn_seed', 'pumpkin_seed', 'lettuce_seed', 'strawberry_seed', 'feed', 'hay']);

/* ------------------------------------------------------------------ */
/* 客人（PRD 4.7）                                                     */
/* ------------------------------------------------------------------ */

export interface CustomerDef {
  id: string;
  name: string;
  kind: string;
  character: 'boy' | 'girl';
  hue: number;
  hat: string;
  line: string;
  thanks: string;
  pool: string[];
}

export const CUSTOMERS: CustomerDef[] = [
  {
    id: 'xiaomi',
    name: '小米',
    kind: '小朋友',
    character: 'girl',
    hue: 0,
    hat: 'characters/ears',
    line: '我今天想吃甜甜的东西！',
    thanks: '谢谢你！好开心呀！',
    pool: ['strawberry_milk', 'rainbow_cup', 'egg', 'strawberry'],
  },
  {
    id: 'picnic',
    name: '野餐家庭',
    kind: '一家人',
    character: 'boy',
    hue: 40,
    hat: 'characters/hat_straw',
    line: '我们要去野餐，需要好多好吃的。',
    thanks: '太棒了，野餐一定很开心！',
    pool: ['veggie_sandwich', 'tomato_salad', 'corn_soup', 'milk'],
  },
  {
    id: 'bunny',
    name: '小兔朋友',
    kind: '动物朋友',
    character: 'girl',
    hue: 300,
    hat: 'characters/ears',
    line: '蹦蹦跳跳，我饿了。',
    thanks: '谢谢你，我最喜欢你了！',
    pool: ['carrot', 'lettuce', 'creamy_carrot', 'corn'],
  },
  {
    id: 'gardener',
    name: '园丁爷爷',
    kind: '园丁',
    character: 'boy',
    hue: 110,
    hat: 'characters/hat_straw',
    line: '今天菜地长得怎么样呀？',
    thanks: '好新鲜的蔬菜，谢谢你！',
    pool: ['carrot', 'tomato', 'pumpkin', 'lettuce', 'corn'],
  },
  {
    id: 'chef',
    name: '厨师阿姨',
    kind: '厨师',
    character: 'girl',
    hue: 200,
    hat: 'characters/hat_chef',
    line: '我要做一道特别的菜！',
    thanks: '材料很新鲜，谢谢！',
    pool: ['pumpkin_pie', 'corn_soup', 'veggie_sandwich', 'egg', 'milk'],
  },
  {
    id: 'traveler',
    name: '旅行者阿蓝',
    kind: '旅行者',
    character: 'boy',
    hue: 220,
    hat: 'characters/hat_rain',
    line: '走了好远的路，好饿呀。',
    thanks: '谢谢你，我可以继续出发啦！',
    pool: ['warm_milk', 'pumpkin_pie', 'egg_color', 'wool'],
  },
];

export const customerById = (id: string): CustomerDef => CUSTOMERS.find((c) => c.id === id) ?? CUSTOMERS[0];

/** 生成一条订单（PRD 4.7 的 JSON 结构） */
export function makeOrder(index: number, absoluteMinute: number, stars: number): OrderData {
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const pool = customer.pool.filter((id) => (ITEMS[id]?.unlockStars ?? 0) <= stars + 2);
  const count = stars > 8 && Math.random() < 0.45 ? 2 : 1;
  const picked = new Set<string>();
  const request: ItemRequest[] = [];
  let guard = 0;
  while (request.length < count && guard < 40) {
    guard += 1;
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!item || picked.has(item)) continue;
    picked.add(item);
    request.push({ item, quantity: ITEMS[item]?.category === 'food' ? 1 : 1 + Math.floor(Math.random() * 2) });
  }
  if (!request.length) request.push({ item: 'egg', quantity: 2 });

  const base = request.reduce((sum, r) => sum + (ITEMS[r.item]?.price ?? 4) * r.quantity, 0);
  const coins = Math.max(6, Math.round(base * 1.6));
  const rewardStars = 1 + (coins > 30 ? 1 : 0) + (count > 1 ? 1 : 0);
  const moods: OrderData['mood'][] = ['happy', 'hungry', 'excited'];

  return {
    id: `order_${String(index).padStart(3, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    request,
    reward: { coins, stars: rewardStars },
    mood: moods[Math.floor(Math.random() * moods.length)],
    expiresAt: absoluteMinute + TUNING.orderLifetimeHours * 60,
  };
}

/* ------------------------------------------------------------------ */
/* 起始动物（PRD 5.3 个体差异）                                        */
/* ------------------------------------------------------------------ */

export interface AnimalSeed extends Record<string, unknown> {
  id: string;
  species: Species;
  name: string;
  personality: Personality;
  favoriteFood: string;
  color: string;
  x: number;
  y: number;
}

export const START_ANIMALS: AnimalSeed[] = [
  { id: 'chicken_01', species: 'chicken', name: '小花', personality: 'curious', favoriteFood: 'corn', color: 'white', x: 1180, y: 760 },
  { id: 'chicken_02', species: 'chicken', name: '布丁', personality: 'playful', favoriteFood: 'corn', color: 'brown', x: 1320, y: 830 },
  { id: 'chicken_03', species: 'chicken', name: '豆豆', personality: 'shy', favoriteFood: 'lettuce', color: 'white', x: 1250, y: 900 },
  { id: 'sheep_01', species: 'sheep', name: '棉花', personality: 'gentle', favoriteFood: 'lettuce', color: 'white', x: 700, y: 900 },
  { id: 'sheep_02', species: 'sheep', name: '云朵', personality: 'lazy', favoriteFood: 'carrot', color: 'white', x: 830, y: 1000 },
  { id: 'cow_01', species: 'cow', name: '奶糖', personality: 'brave', favoriteFood: 'corn', color: 'white', x: 1500, y: 1080 },
];
