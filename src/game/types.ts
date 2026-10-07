/**
 * 全局类型定义 —— 存档结构与数据结构（对应 PRD 第 10 节）
 */

export type CharacterKind = 'boy' | 'girl';
export type Species = 'chicken' | 'sheep' | 'cow';
export type WeatherKind = 'sunny' | 'cloudy' | 'rainy';
export type DayPhase = 'day' | 'dusk' | 'night';
export type ToolId = 'hand' | 'feed' | 'water' | 'seed' | 'bucket' | 'basket' | 'decor';

export type ItemCategory = 'produce' | 'food' | 'seed' | 'supply' | 'clothing' | 'decor';

export interface ItemDef {
  id: string;
  name: string;
  /** 美术资源 key，例如 'props/egg' */
  icon: string;
  category: ItemCategory;
  price: number;
  /** 需求星星数解锁（不消耗，只作为里程碑） */
  unlockStars?: number;
  /** 装备部位（服装类） */
  slot?: 'hat' | 'top' | 'shoes' | 'backpack' | 'accessory';
  /** 动物用品的用途说明 */
  use?: 'feed' | 'trough' | 'water_trough' | 'brush' | 'bell' | 'toy';
  desc: string;
}

export interface CropDef {
  id: string;
  name: string;
  seedId: string;
  icon: string;
  /** 每个阶段需要的游戏内分钟数（阶段 1→2→3→4） */
  stageMinutes: [number, number, number, number];
  /** 收获数量 */
  yield: number;
  seedPrice: number;
  unlockStars?: number;
}

export interface RecipeDef {
  id: string;
  name: string;
  icon: string;
  ingredients: Record<string, number>;
  price: number;
  unlockStars?: number;
  hint: string;
}

export type ItemRequest = { item: string; quantity: number };

export interface OrderData {
  id: string;
  customerId: string;
  customerName: string;
  request: ItemRequest[];
  reward: { coins: number; stars: number };
  mood: 'happy' | 'hungry' | 'excited';
  /** 到期时间（游戏内绝对分钟） */
  expiresAt: number;
}

export type Personality = 'curious' | 'gentle' | 'lazy' | 'playful' | 'shy' | 'brave';

export type AnimalState =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'drink'
  | 'sleep'
  | 'happy'
  | 'followPlayer'
  | 'produce'
  | 'play';

export interface AnimalSave {
  id: string;
  species: Species;
  name: string;
  personality: Personality;
  favoriteFood: string;
  color: string;
  friendship: number;
  mood: number;
  hunger: number;
  cleanliness: number;
  /** 奶 / 羊毛 是否可以收获 */
  produceReady: boolean;
  /** 上次生产时间（游戏内绝对分钟） */
  lastProduceAt: number;
  x: number;
  y: number;
}

export interface CropSave {
  id: string;
  cropId: string;
  plot: number;
  stage: number;
  watered: boolean;
  /** 当前阶段已积累的分钟数 */
  progress: number;
}

export interface PlacedDecoration {
  uid: string;
  itemId: string;
  x: number;
  y: number;
}

export interface EquippedItems {
  hat?: string;
  top?: string;
  shoes?: string;
  backpack?: string;
  accessory?: string;
}

export interface Settings {
  sound: boolean;
  music: boolean;
}

export interface GameStateData {
  version: number;
  savedAt: number;
  character: CharacterKind;
  started: boolean;
  coins: number;
  stars: number;
  inventory: Record<string, number>;
  /** 已购买/拥有的商店物品 id */
  owned: string[];
  equipped: EquippedItems;
  decorations: PlacedDecoration[];
  animals: AnimalSave[];
  crops: CropSave[];
  orders: OrderData[];
  weather: WeatherKind;
  nextWeather: WeatherKind;
  /** 0..1，天气渐变进度 */
  weatherBlend: number;
  day: number;
  /** 当天已过的分钟 0..1440 */
  minutes: number;
  stats: {
    eggs: number;
    harvests: number;
    orders: number;
    cooked: number;
    pets: number;
  };
  settings: Settings;
  tutorialDone: string[];
}
