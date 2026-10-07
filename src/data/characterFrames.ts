/**
 * 由 scripts/generate-pixel-characters.mjs 自动生成，请勿手改。
 * frames: 帧数 / fps: 播放速度 / loop: 是否循环 / overlay: 服装图层需要跟随的纵向像素偏移
 */
export interface CharActionDef {
  frames: number;
  fps: number;
  loop: boolean;
  label: string;
  overlay: number[];
}

export const CHAR_ACTIONS: Record<string, CharActionDef> = {
  "idle": {
    "fps": 3,
    "loop": true,
    "label": "原地休息",
    "frames": 2,
    "overlay": [
      0,
      1
    ]
  },
  "walk": {
    "fps": 7,
    "loop": true,
    "label": "走路",
    "frames": 4,
    "overlay": [
      0,
      -1,
      0,
      -1
    ]
  },
  "hold": {
    "fps": 4,
    "loop": true,
    "label": "拿东西",
    "frames": 2,
    "overlay": [
      0,
      1
    ]
  },
  "pickup": {
    "fps": 8,
    "loop": false,
    "label": "捡东西",
    "frames": 2,
    "overlay": [
      3,
      4
    ]
  },
  "milk": {
    "fps": 6,
    "loop": true,
    "label": "挤东西",
    "frames": 2,
    "overlay": [
      0,
      1
    ]
  }
};

export const CHAR_ACTION_ORDER = ['idle', 'walk', 'hold', 'pickup', 'milk'] as const;
export type CharAction = (typeof CHAR_ACTION_ORDER)[number];
