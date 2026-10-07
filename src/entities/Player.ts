/**
 * 主人公（PRD 第 6 节）
 * - 男孩 / 女孩共用同一套骨架，装扮以图层方式叠加，因此帽子/上衣/鞋子/背包都能实时更换
 * - 物理体与显示分离：物理体是一个不可见 sprite，视觉部分放在 container 里，
 *   这样走路时的上下弹跳不会影响碰撞盒，也不会抖。
 */
import Phaser from 'phaser';
import { art } from '../assets';
import { store } from '../game/GameState';
import { DEPTH } from '../game/GameConfig';
import { ART_K } from '../systems/TextureFactory';

export const PLAYER_SCALE = 0.86;
const IMG = PLAYER_SCALE * ART_K;
const BODY_W = 46;
const BODY_H = 34;
const SPEED = 235;

export type PlayerSlot = 'hat' | 'top' | 'shoes' | 'backpack' | 'accessory';

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

export class Player {
  scene: Phaser.Scene;
  body: Phaser.Physics.Arcade.Sprite;
  view: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;

  private baseImage: Phaser.GameObjects.Image;
  private layers: Partial<Record<PlayerSlot, Phaser.GameObjects.Image>> = {};
  private target: Phaser.Math.Vector2 | null = null;
  private onArrive: (() => void) | null = null;
  private animT = 0;
  private frozen = false;
  private stuckFor = 0;

  facing: 1 | -1 = 1;
  moving = false;
  /** 玩家当前是否被"点击寻路"驱动 */
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
    this.baseImage = scene.add.image(0, 0, this.baseKey()).setOrigin(0.5, 1).setScale(IMG);
    this.view.add(this.baseImage);
    this.refreshEquipment();
  }

  private baseKey(): string {
    return store.data.character === 'boy' ? 'characters/boy' : 'characters/girl';
  }

  /** 换角色 / 换装扮后重建图层 */
  refreshEquipment(): void {
    const key = this.baseKey();
    if (this.baseImage.texture.key !== key) {
      this.baseImage.setTexture(key);
      this.baseImage.setOrigin(0.5, 1).setScale(IMG);
    }
    const order: PlayerSlot[] = ['backpack', 'top', 'shoes', 'hat', 'accessory'];
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
      const textureKey = this.iconFor(itemId);
      if (existing) {
        if (existing.texture.key !== textureKey) existing.setTexture(textureKey);
        existing.setOrigin(0.5, 1).setScale(IMG);
        continue;
      }
      const img = this.scene.add.image(0, 0, textureKey).setOrigin(0.5, 1).setScale(IMG);
      this.view.add(img);
      this.layers[slot] = img;
    }
    // 保证背包在身体后面
    if (this.layers.backpack) this.view.sendToBack(this.layers.backpack);
    else this.view.sendToBack(this.baseImage);
    if (this.layers.backpack) this.view.bringToTop(this.baseImage);
  }

  private iconFor(itemId: string): string {
    const map: Record<string, string> = {
      hat_straw: 'characters/hat_straw',
      hat_rain: 'characters/hat_rain',
      hat_chef: 'characters/hat_chef',
      ears: 'characters/ears',
      hairpin: 'characters/hairpin',
      scarf: 'characters/scarf',
      overalls: 'characters/overalls',
      raincoat: 'characters/raincoat',
      boots: 'characters/boots',
      sneakers: 'characters/sneakers',
      backpack: 'characters/backpack',
    };
    return map[itemId] ?? 'characters/hat_straw';
  }

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

  /** 点击地面后走过去 */
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

  update(dt: number, keys?: MoveKeys): void {
    // 场景切换时物理体会先被销毁，这里做个保护
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
        // 被建筑卡住时自动放弃，避免小朋友觉得"人物不动了"
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

    const hop = this.moving ? Math.abs(Math.sin(this.animT)) * 5 : Math.sin(this.animT) * 1.5;
    const tilt = this.moving ? Math.sin(this.animT) * 2.2 : Math.sin(this.animT * 0.6) * 0.6;

    this.view.setPosition(this.body.x, this.body.y - hop);
    this.view.setScale(this.facing, 1);
    this.view.setAngle(tilt);
    this.view.setDepth(DEPTH.sortedBase + this.body.y);
    this.shadow.setPosition(this.body.x, this.body.y);
    this.shadow.setDepth(DEPTH.sortedBase + this.body.y - 0.5);
    const squash = this.moving ? 1 : 1 + Math.sin(this.animT) * 0.012;
    this.shadow.setScale(squash, squash);
    this.shadow.setAlpha(this.moving ? 0.18 : 0.22);
  }

  /* ------------------------------------------------------------------ */
  /* 动作表现                                                            */
  /* ------------------------------------------------------------------ */

  /** 靠近作物/动物时的伸手动作 */
  playAction(kind: 'water' | 'feed' | 'pet' | 'plant' | 'harvest' | 'pickup' | 'cheer'): void {
    const scene = this.scene;
    const dir = this.facing;
    switch (kind) {
      case 'water': {
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
        scene.tweens.add({ targets: this.view, scaleY: 0.92, duration: 130, yoyo: true, repeat: 1 });
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

export const playerArtSize = () => art('characters/boy');
