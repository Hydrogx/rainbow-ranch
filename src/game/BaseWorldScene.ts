/**
 * 场景基类：负责所有户外/室内场景共用的部分
 * - 地面、光照、天气（SkySystem）
 * - 主人公与朝向
 * - 交互对象注册与"靠近提示"（PRD 第 9.3 节）
 * - 点击/触摸寻路与互动
 * - 场景切换
 */
import Phaser from 'phaser';
import { art } from '../assets';
import { bus, EV } from '../game/EventBus';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { Player, type MoveKeys } from '../entities/Player';
import { SkySystem } from '../systems/SkySystem';
import { ART_K, registerProceduralTextures } from '../systems/TextureFactory';

export interface Interactable {
  id: string;
  x: number;
  y: number;
  radius: number;
  icon: string;
  label: string;
  action: () => void;
  enabled?: () => boolean;
  /** 提示气泡相对目标的垂直偏移 */
  hintOffsetY?: number;
}

export interface WorldOptions {
  width: number;
  height: number;
  ground?: 'grass' | 'dirt' | 'straw';
  indoor?: boolean;
  playerStart: { x: number; y: number };
}

export abstract class BaseWorldScene extends Phaser.Scene {
  worldOpts!: WorldOptions;
  player!: Player;
  keys!: MoveKeys;
  spaceKey!: Phaser.Input.Keyboard.Key;
  sky!: SkySystem;
  interactables: Interactable[] = [];
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  groundLayer!: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle;

  protected hint?: Phaser.GameObjects.Container;
  protected hintIcon?: Phaser.GameObjects.Image;
  protected hintText?: Phaser.GameObjects.Text;
  private clickTargets = new Map<Phaser.GameObjects.GameObject, Interactable>();
  private current?: Interactable;
  private hintTimer = 0;
  private busy = false;
  private leaving = false;

  /* ------------------------------------------------------------------ */
  /* 世界构建                                                            */
  /* ------------------------------------------------------------------ */

  /** 子类可以覆盖：重置上一次运行留下的状态 */
  protected resetRun(): void {}

  protected createWorld(opts: WorldOptions): void {
    // Phaser 重启场景时会复用同一个实例，所以必须清掉上次的引用
    this.resetRun();
    this.interactables = [];
    this.clickTargets.clear();
    this.current = undefined;
    this.busy = false;
    this.leaving = false;
    this.hintTimer = 0;
    this.worldOpts = opts;
    registerProceduralTextures(this);

    this.physics.world.setBounds(0, 0, opts.width, opts.height);
    this.cameras.main.setBounds(0, 0, opts.width, opts.height);
    this.cameras.main.setBackgroundColor(opts.indoor ? '#c9a86f' : '#9ed8f5');

    this.add.image(0, 0, 'tex/sky').setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(-10);

    const groundKey = opts.ground === 'dirt' ? 'tex/dirt' : 'tex/grass';
    this.groundLayer =
      opts.ground === 'straw'
        ? this.add.rectangle(0, 0, opts.width, opts.height, 0xd9b779).setOrigin(0, 0).setDepth(DEPTH.ground)
        : this.add.tileSprite(0, 0, opts.width, opts.height, groundKey).setOrigin(0, 0).setDepth(DEPTH.ground);

    this.obstacles = this.physics.add.staticGroup();

    this.player = new Player(this, opts.playerStart.x, opts.playerStart.y);
    this.cameras.main.startFollow(this.player.body, true, 0.12, 0.12);
    this.physics.add.collider(this.player.body, this.obstacles);

    const kb = this.input.keyboard;
    if (kb) {
      const cursors = kb.createCursorKeys();
      const wasd = kb.addKeys('W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      this.keys = {
        up: cursors.up,
        down: cursors.down,
        left: cursors.left,
        right: cursors.right,
        w: wasd.W,
        a: wasd.A,
        s: wasd.S,
        d: wasd.D,
      };
      this.spaceKey = wasd.SPACE;
      kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'W', 'A', 'S', 'D']);
    }

    this.sky = new SkySystem(this, { width: opts.width, height: opts.height, indoor: opts.indoor });
    this.createHint();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.sky?.destroy();
    });
  }

  private createHint(): void {
    const bg = this.add.ellipse(0, 0, 96, 72, 0xfffdf5, 0.94).setStrokeStyle(5, 0x5a3d2e, 0.9);
    this.hintIcon = this.add.image(0, -6, 'ui/hand').setScale(0.5);
    this.hintText = this.add
      .text(0, 46, '', {
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        fontSize: '20px',
        color: '#3b2a1d',
        backgroundColor: '#fffdf5cc',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 0);
    this.hint = this.add.container(0, 0, [bg, this.hintIcon, this.hintText]).setDepth(DEPTH.bubble).setVisible(false);
    this.tweens.add({ targets: this.hint, scale: { from: 0.98, to: 1.04 }, duration: 900, yoyo: true, repeat: -1 });
  }

  /* ------------------------------------------------------------------ */
  /* 交互对象                                                            */
  /* ------------------------------------------------------------------ */

  addInteractable(item: Interactable, clickTarget?: Phaser.GameObjects.GameObject): Interactable {
    this.interactables.push(item);
    if (clickTarget) {
      clickTarget.setInteractive({ useHandCursor: true });
      this.clickTargets.set(clickTarget, item);
    }
    return item;
  }

  clearInteractables(): void {
    this.interactables = [];
    this.clickTargets.clear();
  }

  /** 放一个按 y 排序的图片（origin 在底部中心） */
  addArt(key: string, x: number, y: number, scale = 1, depthBias = 0): Phaser.GameObjects.Image {
    return this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale * ART_K).setDepth(DEPTH.sortedBase + y + depthBias);
  }

  /** 建筑：既是装饰也是障碍物 */
  addBuilding(key: string, x: number, y: number, scale = 1, collisionScale = 0.72): Phaser.GameObjects.Image {
    const size = art(key);
    const img = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale * ART_K);
    img.setDepth(DEPTH.sortedBase + y - 2);
    const bodyW = size.w * scale * collisionScale;
    const bodyH = Math.max(28, size.h * scale * 0.22);
    const obstacle = this.obstacles.create(x, y - bodyH / 2, 'tex/dot') as Phaser.Physics.Arcade.Sprite;
    obstacle.setVisible(false);
    obstacle.setDisplaySize(bodyW, bodyH);
    obstacle.refreshBody();
    void img;
    return img;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) return;
    const hits = this.input.hitTestPointer(pointer) as Phaser.GameObjects.GameObject[];
    for (const hit of hits) {
      const item = this.clickTargets.get(hit);
      if (item && (!item.enabled || item.enabled())) {
        this.walkThenInteract(item);
        return;
      }
    }
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // 点到交互对象附近也算互动（平板上小朋友直接戳就行）
    let best: Interactable | undefined;
    let bestDist = Infinity;
    for (const item of this.interactables) {
      if (item.enabled && !item.enabled()) continue;
      const d = Phaser.Math.Distance.Between(world.x, world.y, item.x, item.y);
      if (d < item.radius * 0.85 && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best) {
      this.walkThenInteract(best);
      return;
    }

    if (this.isWalkable(world.x, world.y)) {
      this.player.moveTo(world.x, world.y);
    }
  }

  protected isWalkable(x: number, y: number): boolean {
    return x > 20 && y > 20 && x < this.worldOpts.width - 20 && y < this.worldOpts.height - 20;
  }

  private walkThenInteract(item: Interactable): void {
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
    if (dist < item.radius) {
      this.runInteract(item);
      return;
    }
    const angle = Phaser.Math.Angle.Between(item.x, item.y, this.player.x, this.player.y);
    const tx = item.x + Math.cos(angle) * Math.min(item.radius * 0.6, dist - 10);
    const ty = item.y + Math.sin(angle) * Math.min(item.radius * 0.6, dist - 10);
    this.player.moveTo(tx, ty, () => this.runInteract(item));
  }

  /** 触发交互（会防止短时间内重复触发） */
  runInteract(item: Interactable): void {
    if (this.busy) return;
    this.busy = true;
    this.time.delayedCall(180, () => {
      this.busy = false;
    });
    item.action();
  }

  /** 空格键交互当前最近的对象 */
  interactNearest(): boolean {
    if (this.current && (!this.current.enabled || this.current.enabled())) {
      this.runInteract(this.current);
      return true;
    }
    return false;
  }

  protected updateHint(): void {
    let nearest: Interactable | undefined;
    let nearestDist = Infinity;
    for (const item of this.interactables) {
      if (item.enabled && !item.enabled()) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (d < item.radius && d < nearestDist) {
        nearest = item;
        nearestDist = d;
      }
    }
    this.current = nearest;
    if (!this.hint) return;
    if (!nearest) {
      this.hint.setVisible(false);
      return;
    }
    this.hint.setVisible(true);
    this.hint.setPosition(nearest.x, nearest.y - 96 + (nearest.hintOffsetY ?? 0));
    if (this.hintIcon) this.hintIcon.setTexture(nearest.icon).setScale(Math.min(0.6, 74 / (Math.max(art(nearest.icon).w, art(nearest.icon).h) * 2)));
    if (this.hintText) this.hintText.setText(nearest.label);
  }

  /* ------------------------------------------------------------------ */
  /* 反馈效果                                                            */
  /* ------------------------------------------------------------------ */

  floatText(x: number, y: number, text: string, color = '#3b2a1d', icon?: string): void {
    const container = this.add.container(x, y).setDepth(DEPTH.bubble + 5);
    const label = this.add
      .text(0, 0, text, {
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        fontSize: '26px',
        color,
        stroke: '#fffdf5',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 1);
    container.add(label);
    if (icon) container.add(this.add.image(-label.width / 2 - 22, -14, icon).setScale(0.4 * ART_K));
    this.tweens.add({ targets: container, y: y - 66, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => container.destroy() });
  }

  sparkle(x: number, y: number, tint = 0xffd45c, count = 10): void {
    const emitter = this.add.particles(x, y, 'tex/spark', {
      speed: { min: 60, max: 170 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      lifespan: 700,
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(DEPTH.bubble);
    emitter.explode(count);
    this.time.delayedCall(900, () => emitter.destroy());
  }

  /* ------------------------------------------------------------------ */
  /* 生命周期                                                            */
  /* ------------------------------------------------------------------ */

  protected updateWorld(time: number, delta: number): void {
    this.player.update(delta, this.keys);
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.interactNearest();
    this.hintTimer -= delta;
    if (this.hintTimer <= 0) {
      this.hintTimer = 140;
      this.updateHint();
    }
    store.currentSceneKey = this.scene.key;
  }

  protected gotoScene(key: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(260, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }

  /** 场景入口：进入子场景 */
  protected sceneEntrance(id: string, x: number, y: number, icon: string, label: string, sceneKey: string, radius = 150): void {
    this.addInteractable(
      {
        id,
        x,
        y,
        radius,
        icon,
        label,
        action: () => {
          bus.emit(EV.sfx, 'open');
          this.gotoScene(sceneKey);
        },
      },
    );
  }
}

export { GAME_WIDTH, GAME_HEIGHT };
