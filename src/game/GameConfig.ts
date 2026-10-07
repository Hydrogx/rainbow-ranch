import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 世界统一用 1280x720 设计分辨率，按比例适配各种屏幕 */
export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#8fd3f4',
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    powerPreference: 'high-performance',
  },
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  fps: { target: 60, min: 30 },
};

export const DEPTH = {
  ground: 0,
  path: 5,
  deco: 10,
  shadow: 15,
  /** 角色 / 动物 / 建筑按 y 排序：20 + y（世界高 1900，所以最大 1920） */
  sortedBase: 20,
  /** 屋顶、云朵等盖在角色上方的东西 */
  overhead: 1900,
  /** 夜色 / 天气覆盖层 */
  night: 2400,
  /** 提示气泡、表情，要在夜色之上 */
  bubble: 2450,
  weather: 2500,
  ui: 3000,
};
