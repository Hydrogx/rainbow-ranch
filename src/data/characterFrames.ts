/**
 * 由 scripts/generate-cozy-characters.mjs 自动生成，请勿手改。
 * frames: 帧数 / fps: 播放速度 / loop: 是否循环 / overlay: 服装图层跟随的纵向偏移（设计单位）
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
    "frames": 4,
    "overlay": [
      0,
      1.5,
      0,
      1
    ]
  },
  "walk": {
    "fps": 9,
    "loop": true,
    "label": "走路",
    "frames": 6,
    "overlay": [
      -1,
      -2.5,
      -1,
      -1,
      -2.5,
      -1
    ]
  },
  "hold": {
    "fps": 3,
    "loop": true,
    "label": "拿东西",
    "frames": 2,
    "overlay": [
      0,
      1.5
    ]
  },
  "pickup": {
    "fps": 6,
    "loop": false,
    "label": "捡东西",
    "frames": 2,
    "overlay": [
      6,
      8
    ]
  },
  "milk": {
    "fps": 5,
    "loop": true,
    "label": "挤东西",
    "frames": 3,
    "overlay": [
      0,
      2,
      2
    ]
  }
};

export const CHAR_ACTION_ORDER = ['idle', 'walk', 'hold', 'pickup', 'milk'] as const;
export type CharAction = (typeof CHAR_ACTION_ORDER)[number];
