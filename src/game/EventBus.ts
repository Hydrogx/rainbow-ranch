/**
 * 全局事件总线：Phaser 场景、DOM 界面、系统之间通信
 */
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  /** 存档数据发生变化，UI 应刷新 */
  stateChanged: 'state:changed',
  /** 顶部飘字（金币 / 星星 / 物品） */
  toast: 'ui:toast',
  /** 打开/关闭面板 */
  openPanel: 'ui:open-panel',
  closePanel: 'ui:close-panel',
  /** 玩家切换了快捷栏工具 */
  toolChanged: 'ui:tool',
  /** 天气变化 */
  weatherChanged: 'world:weather',
  /** 昼夜阶段变化 */
  phaseChanged: 'world:phase',
  /** 请求场景切换 */
  gotoScene: 'world:goto',
  /** 播放音效 */
  sfx: 'audio:sfx',
  /** 任务/教学提示 */
  hint: 'ui:hint',
  /** 场景内弹出数字（+1 鸡蛋） */
  floatText: 'world:float-text',
} as const;

export type EventName = (typeof EV)[keyof typeof EV];
