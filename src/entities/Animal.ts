/**
 * 动物实体 + 自主行为状态机（PRD 第 5 节）
 * 状态：idle / walk / eat / drink / sleep / happy / followPlayer / produce / play
 * 动物不会受伤、不会死亡、也不会离开自己的活动区域。
 */
import Phaser from 'phaser';
import { art } from '../assets';
import { DEPTH } from '../game/GameConfig';
import type { AnimalSave, AnimalState, Species } from '../game/types';
import { store } from '../game/GameState';
import { ART_K, animalAnimKey, animalSheetKey } from '../systems/TextureFactory';
import type { AnimalAction } from '../data/animalFrames';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimalWorld {
  homes: Record<Species, Rect>;
  shelter: Record<Species, { x: number; y: number }>;
  feedTrough?: { x: number; y: number };
  waterTrough?: { x: number; y: number };
  onProduce?: (animal: Animal) => void;
}

const SPECIES_SCALE: Record<Species, number> = {
  chicken: 0.82,
  sheep: 0.88,
  cow: 0.86,
};

const SPECIES_BODY: Record<Species, { w: number; h: number }> = {
  chicken: { w: 64, h: 38 },
  sheep: { w: 86, h: 44 },
  cow: { w: 108, h: 52 },
};

const SPECIES_SPEED: Record<Species, number> = {
  chicken: 68,
  sheep: 48,
  cow: 42,
};

export class Animal {
  scene: Phaser.Scene;
  data: AnimalSave;
  world: AnimalWorld;
  state: AnimalState = 'idle';

  body: Phaser.Physics.Arcade.Sprite;
  view: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  emote: Phaser.GameObjects.Image;
  private sprite: Phaser.GameObjects.Sprite;
  private action: AnimalAction = 'idle';

  private stateTimer = 0;
  private target: Phaser.Math.Vector2 | null = null;
  private animT = Math.random() * 10;
  private emoteTimer = 3 + Math.random() * 4;
  private facing: 1 | -1 = 1;
  private followTicks = 0;

  constructor(scene: Phaser.Scene, data: AnimalSave, world: AnimalWorld) {
    this.scene = scene;
    this.data = data;
    this.world = world;

    const idleSheet = animalSheetKey(data.species, 'idle');
    const scale = SPECIES_SCALE[data.species] * ART_K;

    this.body = scene.physics.add.sprite(data.x, data.y, 'tex/dot');
    this.body.setVisible(false);
    this.body.setOrigin(0.5, 1);
    const phys = this.body.body as Phaser.Physics.Arcade.Body;
    phys.setSize(SPECIES_BODY[data.species].w, SPECIES_BODY[data.species].h);
    phys.setOffset((24 - SPECIES_BODY[data.species].w) / 2, 24 - SPECIES_BODY[data.species].h);
    phys.setCollideWorldBounds(true);

    this.shadow = scene.add
      .ellipse(data.x, data.y, art(idleSheet).w * scale * 0.5, 18, 0x3b2a1d, 0.2)
      .setDepth(DEPTH.sortedBase + data.y - 0.5);

    this.view = scene.add.container(data.x, data.y).setDepth(DEPTH.sortedBase + data.y);
    this.sprite = scene.add.sprite(0, 0, idleSheet, 0).setOrigin(0.5, 1).setScale(scale);
    this.view.add(this.sprite);
    // 棕色小鸡直接给整体染色，省掉一整套重复素材
    if (data.color === 'brown' && data.species === 'chicken') this.sprite.setTint(0xdfa06a);
    this.playAction('idle');

    this.emote = scene.add.image(data.x, data.y - 74, 'ui/heart').setScale(0).setDepth(DEPTH.bubble);

    this.pickNextAction(0);
  }

  /** 切换动作动画：原地休息 / 走路 / 生产（下蛋、产毛、挤奶） */
  private playAction(action: AnimalAction): void {
    if (this.action === action && this.sprite.anims.isPlaying) return;
    this.action = action;
    const key = animalAnimKey(this.data.species, action);
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  /** 用于点击的图形对象 */
  get hitArea(): Phaser.GameObjects.Image {
    return this.sprite;
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /* ------------------------------------------------------------------ */
  /* 状态机                                                              */
  /* ------------------------------------------------------------------ */

  setState(state: AnimalState, duration: number): void {
    this.state = state;
    this.stateTimer = duration;
    const phys = this.body.body as Phaser.Physics.Arcade.Body;
    if (state !== 'walk' && state !== 'followPlayer') phys.setVelocity(0, 0);
  }

  private pickNextAction(nowHour: number): void {
    const a = this.data;
    const night = nowHour >= 19 || nowHour < 5;
    const home = this.world.homes[a.species];
    const shelter = this.world.shelter[a.species];
    const hasTrough = !!this.world.feedTrough || !!this.world.waterTrough;

    if (night) {
      this.target = new Phaser.Math.Vector2(shelter.x + Phaser.Math.Between(-30, 30), shelter.y + Phaser.Math.Between(-16, 16));
      this.setState('walk', 9000);
      return;
    }

    const roll = Math.random();
    // 饿了去饲料槽
    if (a.hunger < 55 && this.world.feedTrough) {
      this.target = new Phaser.Math.Vector2(this.world.feedTrough.x + Phaser.Math.Between(-16, 16), this.world.feedTrough.y);
      this.setState('walk', 9000);
      return;
    }
    // 渴了去水槽
    if (hasTrough && this.world.waterTrough && Math.random() < 0.18) {
      this.target = new Phaser.Math.Vector2(this.world.waterTrough.x + Phaser.Math.Between(-16, 16), this.world.waterTrough.y);
      this.setState('walk', 9000);
      return;
    }
    if (a.produceReady && roll < 0.35) {
      this.setState('produce', 1500);
      this.world.onProduce?.(this);
      return;
    }
    if (a.mood > 78 && roll < 0.45) {
      this.setState('play', 1400);
      return;
    }
    if (a.mood > 62 && roll < 0.6) {
      this.setState('happy', 1100);
      this.emoteFor('heart');
      return;
    }
    if (roll < 0.92) {
      const tx = home.x + Math.random() * home.w;
      const ty = home.y + Math.random() * home.h;
      this.target = new Phaser.Math.Vector2(tx, ty);
      this.setState('walk', 8000);
      return;
    }
    this.setState('idle', 900 + Math.random() * 1600);
  }

  /** 玩家喂食 / 抚摸后的反馈 */
  react(kind: 'fed' | 'petted' | 'washed' | 'collected'): void {
    this.emoteFor(kind === 'washed' ? 'water' : 'heart');
    if (kind === 'petted') {
      this.followTicks = 1;
      this.setState('followPlayer', 4200);
    } else {
      this.setState('happy', 1500);
    }
    this.scene.tweens.add({ targets: this.view, scaleX: 1.12, scaleY: 0.9, duration: 120, yoyo: true, repeat: 1 });
  }

  emoteFor(kind: 'heart' | 'feed' | 'water' | 'ready' | 'sleep' | 'note'): void {
    const tex =
      kind === 'heart' ? 'ui/heart' : kind === 'feed' ? 'ui/feed' : kind === 'water' ? 'ui/water' : kind === 'sleep' ? 'ui/cloud' : kind === 'note' ? 'ui/music' : 'ui/star';
    this.emote.setTexture(tex);
    this.emote.setPosition(this.body.x, this.body.y - 74);
    this.scene.tweens.killTweensOf(this.emote);
    this.emote.setScale(0).setAlpha(1);
    this.scene.tweens.add({ targets: this.emote, scale: 0.42 * ART_K, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.emote, y: this.emote.y - 34, alpha: 0, delay: 800, duration: 700 });
  }

  /* ------------------------------------------------------------------ */
  /* 每帧更新                                                            */
  /* ------------------------------------------------------------------ */

  update(dt: number, playerX: number, playerY: number, hour: number, obstacles?: Phaser.Physics.Arcade.StaticGroup): void {
    void obstacles;
    const phys = this.body.body as Phaser.Physics.Arcade.Body | undefined;
    if (!phys || !this.body.active) return;
    this.stateTimer -= dt;
    this.emoteTimer -= dt;
    this.animT += dt * (this.state === 'walk' || this.state === 'followPlayer' ? 0.008 : 0.003);

    // 跟随玩家
    if (this.state === 'followPlayer') {
      if (this.followTicks > 0 && this.stateTimer > 800) {
        const dx = playerX - this.body.x;
        const dy = playerY - this.body.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 90) {
          phys.setVelocity((dx / dist) * SPECIES_SPEED[this.data.species] * 1.1, (dy / dist) * SPECIES_SPEED[this.data.species] * 1.1);
          if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;
        } else {
          phys.setVelocity(0, 0);
          this.followTicks = 0;
        }
      } else {
        phys.setVelocity(0, 0);
      }
    } else if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.body.x;
      const dy = this.target.y - this.body.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 16 || this.stateTimer <= 0) {
        phys.setVelocity(0, 0);
        this.handleArrival(hour);
      } else {
        phys.setVelocity((dx / dist) * SPECIES_SPEED[this.data.species], (dy / dist) * SPECIES_SPEED[this.data.species]);
        if (Math.abs(dx) > 3) this.facing = dx > 0 ? 1 : -1;
      }
    } else if (this.stateTimer <= 0) {
      this.pickNextAction(hour);
    }

    // 同步数据（存档用）
    this.data.x = Math.round(this.body.x);
    this.data.y = Math.round(this.body.y);

    const moving = this.state === 'walk' || this.state === 'followPlayer';
    // 状态机 → 动画：走路 / 生产（下蛋 · 产毛 · 挤奶）/ 其余都是原地休息
    this.playAction(moving ? 'walk' : this.state === 'produce' ? 'produce' : 'idle');
    const hop = moving ? Math.abs(Math.sin(this.animT)) * 3.5 : this.state === 'happy' || this.state === 'play' ? Math.abs(Math.sin(this.animT * 3)) * 6 : Math.sin(this.animT) * 1.4;

    this.view.setPosition(this.body.x, this.body.y - hop);
    this.view.setScale(this.facing, 1);
    this.view.setDepth(DEPTH.sortedBase + this.body.y);
    if (this.state === 'sleep') {
      this.view.setAngle(this.facing * 6);
      this.sprite.setAlpha(0.92);
    } else {
      this.view.setAngle(0);
      this.sprite.setAlpha(1);
    }
    this.shadow.setPosition(this.body.x, this.body.y);
    this.shadow.setDepth(DEPTH.sortedBase + this.body.y - 0.5);

    // 头顶状态图标（PRD 4.3：用表情和颜色表现状态，而不是数字）
    if (this.emoteTimer <= 0 && this.state !== 'sleep') {
      this.emoteTimer = 6 + Math.random() * 5;
      const a = this.data;
      if (a.hunger < 40) this.emoteFor('feed');
      else if (a.cleanliness < 45) this.emoteFor('water');
      else if (a.produceReady) this.emoteFor('ready');
      else if (a.mood > 80) this.emoteFor('heart');
    }
  }

  private handleArrival(hour: number): void {
    const night = hour >= 19 || hour < 5;
    if (night) {
      this.setState('sleep', 30000);
      this.emoteFor('sleep');
      return;
    }
    const a = this.data;
    if (this.world.feedTrough && Math.hypot(this.body.x - this.world.feedTrough.x, this.body.y - this.world.feedTrough.y) < 60 && a.hunger < 55) {
      this.setState('eat', 2600);
      a.hunger = Math.min(100, a.hunger + 12);
      a.mood = Math.min(100, a.mood + 4);
      store.notifyThrottled(performance.now());
      return;
    }
    if (this.world.waterTrough && Math.hypot(this.body.x - this.world.waterTrough.x, this.body.y - this.world.waterTrough.y) < 60) {
      this.setState('drink', 2000);
      return;
    }
    this.setState('idle', 600 + Math.random() * 1400);
  }

  destroy(): void {
    this.body.destroy();
    this.view.destroy();
    this.shadow.destroy();
    this.emote.destroy();
  }
}
