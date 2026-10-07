/**
 * 主人公（PRD 第 6 节）
 * - 男孩 / 女孩都是像素小人（32x48，整数倍放大 + 最近邻采样）
 * - 五个动作：原地休息 / 走路 / 拿东西 / 捡东西 / 挤东西
 * - 装扮以图层方式叠加，并按当前动作帧的纵向偏移一起移动，保证贴合
 * - 物理体与显示分离：走路弹跳不影响碰撞盒
 */
import Phaser from 'phaser';
import { ART_K } from '../systems/TextureFactory';
import {
  CHAR_KINDS,
  CHAR_FRAME_H,
  CHAR_FRAME_W,
  PIXEL_SCALE,
  characterAnimKey,
  characterSheetKey,
  type CharKind,
} from '../systems/TextureFactory';
import { CHAR_ACTIONS, type CharAction } from '../data/characterFrames';
import { store } from '../game/GameState';
import { DEPTH } from '../game/GameConfig';
import { itemDef } from '../data/catalog';

const BODY_W = 46;
const BODY_H = 34;
const SPEED = 235;

export type PlayerSlot = 'hat' | 'top' | 'pants' | 'shoes' | 'backpack' | 'accessory';

export interface MoveKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
}

/** 动作 → 粒子/道具表现 */
type ActionKind = 'water' | 'feed' | 'pet' | 'plant' | 'harvest' | 'pickup' | 'cheer' | 'squeeze';

export class Player {
  scene: Phaser.Scene;
  body: Phaser.Physics.Arcade.Sprite;
  view: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;

  private baseSprite: Phaser.GameObjects.Sprite;
  private equipLayer: Phaser.GameObjects.Container;
  private layers: Partial<Record<PlayerSlot, Phaser.GameObjects.Image>> = {};
  private target: Phaser.Math.Vector2 | null = null;
  private onArrive: (() => void) | null = null;
  private animT = 0;
  private frozen = false;
  private stuckFor = 0;
  private actionLock: { action: CharAction; until: number } | null = null;
  private sustained: CharAction | null = null;
  currentAction: CharAction = 'idle';

  facing: 1 | -1 = 1;
  moving = false;
  clickMoving = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.body = scene.physics.add.sprite(x, y, 'tex/dot');
    this.body.setVisible(false);
    this.body.setOrigin(0.5, 1);
    this.body.setDepth(DEPTH.sortedBase + y);
    const bodyObj = this.body.body as Phaser.Physics.Arcade.Body;
    bodyObj.setSize(BODY_W, BODY_H);
    bodyObj.setOffset((24 - BODY_W) / 2, 24 - BODY_H);
    bodyObj.setCollideWorldBounds(true);

    this.shadow = scene.add.ellipse(x, y, 54, 20, 0x3b2a1d, 0.22).setDepth(DEPTH.sortedBase + y - 0.5);

    this.view = scene.add.container(x, y).setDepth(DEPTH.sortedBase + y);
    this.equipLayer = scene.add.container(0, 0);
    this.baseSprite = scene.add.sprite(0, 0, this.baseSheet('idle'), 0).setOrigin(0.5, 1);
    this.view.add([this.baseSprite, this.equipLayer]);
    this.applyBodyScale();
    this.refreshEquipment();
  }

  /* ------------------------------------------------------------------ */
  /* 外观                                                                */
  /* ------------------------------------------------------------------ */

  private kind(): CharKind {
    return store.data.character === 'girl' ? 'girl' : 'boy';
  }

  private hasSheets(): boolean {
    return CHAR_KINDS.includes(this.kind()) && this.scene.textures.exists(characterSheetKey(this.kind(), 'idle'));
  }

  private baseSheet(action: CharAction): string {
    if (this.hasSheets()) return characterSheetKey(this.kind(), action);
    return store.data.character === 'boy' ? 'characters/boy' : 'characters/girl';
  }

  private applyBodyScale(): void {
    this.baseSprite.setOrigin(0.5, 1);
    // 没有精灵图时退回矢量小人，需要按 2 倍栅格化的比例缩放
    this.baseSprite.setScale(this.hasSheets() ? PIXEL_SCALE : 0.86 * ART_K);
  }

  /** 换角色 / 换装扮后重建图层 */
  refreshEquipment(): void {
    this.applyBodyScale();
    // 发饰在帽子下面：戴帽子时发箍被挡住，但耳朵会从帽檐两侧露出来
    const order: PlayerSlot[] = ['pants', 'shoes', 'top', 'backpack', 'accessory', 'hat'];
    for (const slot of order) {
      const itemId = store.data.equipped[slot];
      const existing = this.layers[slot];
      if (!itemId) {
        if (existing) {
          existing.destroy();
          delete this.layers[slot];
        }
        continue;
      }
      const textureKey = itemDef(itemId).icon;
      if (!this.scene.textures.exists(textureKey)) continue;
      if (existing) {
        if (existing.texture.key !== textureKey) existing.setTexture(textureKey);
        continue;
      }
      const img = this.scene.add.image(0, 0, textureKey).setOrigin(0.5, 1).setScale(PIXEL_SCALE);
      this.equipLayer.add(img);
      this.layers[slot] = img;
    }
    // 显式排好图层顺序（裤子 → 鞋 → 上衣 → 背包 → 发饰 → 帽子）
    let depth = 0;
    order.forEach((slot) => {
      const obj = this.layers[slot];
      if (!obj) return;
      this.equipLayer.moveTo(obj, depth);
      depth += 1;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 位置 / 移动                                                         */
  /* ------------------------------------------------------------------ */

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  setPosition(x: number, y: number): void {
    if (!this.body.body) return;
    this.body.setPosition(x, y);
    this.view.setPosition(x, y);
    this.shadow.setPosition(x, y);
  }

  freeze(on = true): void {
    this.frozen = on;
    const phys = this.body.body as Phaser.Physics.Arcade.Body | undefined;
    if (on && phys) phys.setVelocity(0, 0);
  }

  moveTo(x: number, y: number, onArrive?: () => void): void {
    this.target = new Phaser.Math.Vector2(x, y);
    this.onArrive = onArrive ?? null;
    this.clickMoving = true;
    this.stuckFor = 0;
  }

  cancelMove(): void {
    this.target = null;
    this.onArrive = null;
    this.clickMoving = false;
  }

  /* ------------------------------------------------------------------ */
  /* 动作                                                                */
  /* ------------------------------------------------------------------ */

  /** 一次性动作（捡东西 / 挤一下 / 举着工具等） */
  startAction(action: CharAction, durationMs?: number): void {
    const def = CHAR_ACTIONS[action];
    const ms = durationMs ?? Math.max(320, (def.frames / def.fps) * 1000 + 120);
    this.actionLock = { action, until: this.scene.time.now + ms };
    this.applyAction(action);
  }

  /** 持续动作（挤奶小游戏期间一直保持） */
  setSustainedAction(action: CharAction | null): void {
    this.sustained = action;
    if (action) this.applyAction(action);
  }

  /** 立刻切到某个动作（会打断一次性动作） */
  private applyAction(action: CharAction): void {
    if (this.currentAction === action && this.baseSprite.anims.isPlaying) return;
    this.currentAction = action;
    const key = characterAnimKey(this.kind(), action);
    if (this.hasSheets() && this.scene.anims.exists(key)) {
      this.baseSprite.play(key, true);
    } else {
      this.baseSprite.setTexture(this.baseSheet(action));
    }
  }

  /** 每帧决定当前应该播哪个动作 */
  private updateAction(moving: boolean): void {
    if (!this.hasSheets()) return;
    const now = this.scene.time.now;
    if (this.actionLock && now >= this.actionLock.until) this.actionLock = null;
    let want: CharAction;
    if (this.sustained) want = this.sustained;
    else if (this.actionLock) want = this.actionLock.action;
    else if (moving) want = 'walk';
    else want = store.tool === 'hand' ? 'idle' : 'hold';
    this.applyAction(want);

    // 服装图层跟随当前动作帧的纵向偏移，保证蹲下 / 呼吸时衣服不脱节
    const def = CHAR_ACTIONS[this.currentAction];
    const idx = this.baseSprite.anims.currentFrame ? this.baseSprite.anims.currentFrame.index : 0;
    const offset = def.overlay[Math.min(idx, def.overlay.length - 1)] ?? 0;
    this.equipLayer.setY(offset * PIXEL_SCALE);
  }

  /* ------------------------------------------------------------------ */
  /* 每帧更新                                                            */
  /* ------------------------------------------------------------------ */

  update(dt: number, keys?: MoveKeys): void {
    const phys = this.body.body as Phaser.Physics.Arcade.Body | undefined;
    if (!phys || !this.body.active) return;
    let vx = 0;
    let vy = 0;

    if (!this.frozen && keys) {
      if (keys.left.isDown || keys.a.isDown) vx -= 1;
      if (keys.right.isDown || keys.d.isDown) vx += 1;
      if (keys.up.isDown || keys.w.isDown) vy -= 1;
      if (keys.down.isDown || keys.s.isDown) vy += 1;
    }

    if (vx !== 0 || vy !== 0) {
      this.cancelMove();
      const len = Math.hypot(vx, vy) || 1;
      phys.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
      this.facing = vx > 0 ? 1 : vx < 0 ? -1 : this.facing;
    } else if (this.target && !this.frozen) {
      const dx = this.target.x - this.body.x;
      const dy = this.target.y - this.body.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        phys.setVelocity(0, 0);
        const cb = this.onArrive;
        this.cancelMove();
        cb?.();
      } else {
        const speed = Math.min(SPEED, SPEED * (dist / 90));
        phys.setVelocity((dx / dist) * Math.max(90, speed), (dy / dist) * Math.max(90, speed));
        if (Math.abs(dx) > 6) this.facing = dx > 0 ? 1 : -1;
        if (Math.abs(phys.velocity.x) < 20 && Math.abs(phys.velocity.y) < 20) this.stuckFor += dt;
        else this.stuckFor = 0;
        if (this.stuckFor > 1200) {
          this.cancelMove();
          phys.setVelocity(0, 0);
        }
      }
    } else {
      phys.setVelocity(0, 0);
    }

    const speedNow = Math.hypot(phys.velocity.x, phys.velocity.y);
    this.moving = speedNow > 12;
    this.animT += dt * (this.moving ? 0.014 : 0.003);

    // 像素角色不做程序化的上下弹跳与旋转，否则会破坏像素网格
    const hop = this.moving ? Math.abs(Math.sin(this.animT)) * 2 : 0;
    this.view.setPosition(this.body.x, this.body.y - hop);
    this.view.setScale(this.facing, 1);
    this.view.setAngle(0);
    this.view.setDepth(DEPTH.sortedBase + this.body.y);
    this.shadow.setPosition(this.body.x, this.body.y);
    this.shadow.setDepth(DEPTH.sortedBase + this.body.y - 0.5);
    this.shadow.setScale(1, 1);
    this.shadow.setAlpha(this.moving ? 0.18 : 0.22);

    this.updateAction(this.moving);
  }

  /* ------------------------------------------------------------------ */
  /* 动作表现（粒子 / 道具）                                              */
  /* ------------------------------------------------------------------ */

  playAction(kind: ActionKind): void {
    const scene = this.scene;
    const dir = this.facing;
    switch (kind) {
      case 'water': {
        this.startAction('hold', 900);
        const can = scene.add
          .image(this.body.x + dir * 42, this.body.y - 76, 'props/watering_can')
          .setOrigin(0.5, 1)
          .setScale(0.55 * ART_K)
          .setDepth(this.view.depth + 5);
        can.setAngle(dir * 20);
        scene.tweens.add({ targets: can, angle: dir * -32, duration: 260, yoyo: true, repeat: 2 });
        const drops = scene.add.particles(this.body.x + dir * 60, this.body.y - 46, 'tex/dot', {
          speedY: { min: 90, max: 170 },
          speedX: { min: dir * 20 - 30, max: dir * 20 + 30 },
          scale: { start: 0.32, end: 0.05 },
          alpha: { start: 0.95, end: 0 },
          tint: 0x8fd3f4,
          lifespan: 620,
          quantity: 2,
          frequency: 55,
          emitting: true,
        });
        drops.setDepth(this.view.depth + 6);
        scene.time.delayedCall(760, () => {
          drops.stop();
          scene.time.delayedCall(700, () => drops.destroy());
        });
        scene.time.delayedCall(820, () => can.destroy());
        break;
      }
      case 'feed': {
        this.startAction('hold', 900);
        const bag = scene.add
          .image(this.body.x + dir * 34, this.body.y - 60, 'props/feed_bag')
          .setOrigin(0.5, 1)
          .setScale(0.5 * ART_K)
          .setDepth(this.view.depth + 5);
        scene.tweens.add({ targets: bag, y: bag.y - 14, duration: 220, yoyo: true, repeat: 2 });
        const seeds = scene.add.particles(this.body.x + dir * 52, this.body.y - 40, 'tex/dot', {
          speedY: { min: 40, max: 110 },
          speedX: { min: -40, max: 40 },
          scale: { start: 0.3, end: 0.05 },
          tint: 0xf5c542,
          lifespan: 700,
          quantity: 3,
          frequency: 90,
          emitting: true,
        });
        seeds.setDepth(this.view.depth + 4);
        scene.time.delayedCall(700, () => {
          seeds.stop();
          scene.time.delayedCall(800, () => seeds.destroy());
        });
        scene.time.delayedCall(820, () => bag.destroy());
        break;
      }
      case 'squeeze': {
        this.setSustainedAction('milk');
        break;
      }
      case 'pet':
      case 'cheer': {
        const hearts = scene.add.particles(this.body.x, this.body.y - 150, 'ui/heart', {
          speedY: { min: -60, max: -20 },
          speedX: { min: -30, max: 30 },
          scale: { start: 0.28 * ART_K, end: 0.05 * ART_K },
          alpha: { start: 1, end: 0 },
          lifespan: 900,
          quantity: 3,
          frequency: kind === 'cheer' ? 70 : 120,
          emitting: true,
        });
        hearts.setDepth(this.view.depth + 6);
        scene.time.delayedCall(kind === 'cheer' ? 900 : 600, () => {
          hearts.stop();
          scene.time.delayedCall(1000, () => hearts.destroy());
        });
        if (kind === 'cheer') {
          scene.tweens.add({ targets: this.view, y: this.view.y - 26, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
        }
        break;
      }
      case 'plant':
      case 'harvest':
      case 'pickup': {
        // 蹲下去捡 / 种：播一次性动作，并让服装图层跟着蹲下
        this.startAction('pickup');
        if (kind !== 'plant') {
          const sparks = scene.add.particles(this.body.x, this.body.y - 100, 'tex/spark', {
            speed: { min: 40, max: 120 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: kind === 'harvest' ? 0xffd45c : 0xffffff,
            lifespan: 520,
            quantity: 5,
            emitting: false,
          });
          sparks.setDepth(this.view.depth + 6);
          sparks.explode(6);
          scene.time.delayedCall(700, () => sparks.destroy());
        }
        break;
      }
      default:
        break;
    }
  }

  /** 头顶冒出的表情气泡 */
  bubble(icon: string): void {
    const img = this.scene.add
      .image(this.body.x, this.body.y - 178, icon)
      .setScale(0.001)
      .setDepth(DEPTH.bubble);
    this.scene.tweens.add({ targets: img, scale: 0.42 * ART_K, duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: img, y: img.y - 40, alpha: 0, delay: 700, duration: 700 });
    this.scene.time.delayedCall(1500, () => img.destroy());
  }

  destroy(): void {
    this.body.destroy();
    this.view.destroy();
    this.shadow.destroy();
  }
}

export { CHAR_FRAME_W, CHAR_FRAME_H };
