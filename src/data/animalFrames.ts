/**
 * 由 scripts/generate-animal-anim.mjs 自动生成，请勿手改。
 */
export interface AnimalActionDef {
  frames: number;
  fps: number;
  loop: boolean;
}

export const ANIMAL_ACTIONS: Record<string, Record<string, AnimalActionDef>> = {
  "chicken": {
    "idle": {
      "frames": 4,
      "fps": 3,
      "loop": true
    },
    "walk": {
      "frames": 4,
      "fps": 7,
      "loop": true
    },
    "produce": {
      "frames": 4,
      "fps": 5,
      "loop": false
    }
  },
  "sheep": {
    "idle": {
      "frames": 4,
      "fps": 3,
      "loop": true
    },
    "walk": {
      "frames": 4,
      "fps": 6,
      "loop": true
    },
    "produce": {
      "frames": 4,
      "fps": 5,
      "loop": false
    }
  },
  "cow": {
    "idle": {
      "frames": 4,
      "fps": 3,
      "loop": true
    },
    "walk": {
      "frames": 4,
      "fps": 6,
      "loop": true
    },
    "produce": {
      "frames": 4,
      "fps": 5,
      "loop": false
    }
  }
};

export const ANIMAL_ACTION_ORDER = ['idle', 'walk', 'produce'] as const;
export type AnimalAction = (typeof ANIMAL_ACTION_ORDER)[number];
