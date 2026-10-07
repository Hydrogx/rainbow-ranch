/**
 * 菜地场景（PRD 第 4.5 节）
 * 挖土 → 播种 → 浇水 → 等待生长 → 收获。不设置植物死亡机制，避免挫败感。
 */
import Phaser from 'phaser';
import { BaseWorldScene, type Interactable } from '../game/BaseWorldScene';
import { DEPTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { bus, EV } from '../game/EventBus';
import { audio } from '../systems/AudioSystem';
import { CROPS, GARDEN_PLOTS, cropBySeed, itemDef } from '../data/catalog';
import { ART_K, makeCanvasTexture } from '../systems/TextureFactory';

interface PlotView {
  index: number;
  x: number;
  y: number;
  soil: Phaser.GameObjects.TileSprite;
  plant: Phaser.GameObjects.Image;
  droplet: Phaser.GameObjects.Image;
  ready: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  /** 植物基础缩放，风吹雨打在此之上叠加 */
  baseScale: number;
  /** 每株植物错开相位，看起来才自然 */
  phase: number;
}

const COLUMNS = 3;
const PLOT_W = 160;
const PLOT_H = 130;

export class GardenScene extends BaseWorldScene {
  private plots: PlotView[] = [];
  private lastStages: number[] = [];
  private rainDrip?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Garden');
  }

  protected override resetRun(): void {
    this.plots = [];
    this.lastStages = [];
  }

  create(): void {
    bus.emit('ui:scene', 'Garden');
    this.createWorld({ width: 1400, height: 800, ground: 'grass', playerStart: { x: 700, y: 720 } });
    this.makeStageTextures();

    this.add.rectangle(0, 0, 1400, 800, 0x9ee07c, 0.25).setOrigin(0, 0).setDepth(DEPTH.ground + 1);

    // 菜地围墙：篱笆
    for (let x = 50; x <= 1350; x += 115) {
      this.addArt('props/fence', x, 110, 0.95);
      this.addArt('props/fence', x, 760, 0.95);
    }
    for (let y = 200; y <= 700; y += 115) {
      this.addArt('props/fence', 50, y, 0.95);
      this.addArt('props/fence', 1350, y, 0.95);
    }

    const startX = 330;
    const startY = 200;
    const gapX = 370;
    const gapY = 200;

    for (let i = 0; i < GARDEN_PLOTS; i += 1) {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const x = startX + col * gapX;
      const y = startY + row * gapY;

      const soil = this.add
        .tileSprite(x - PLOT_W / 2, y - PLOT_H / 2, PLOT_W, PLOT_H, 'tex/dirt')
        .setOrigin(0, 0)
        .setDepth(DEPTH.path)
        .setAlpha(0.95);
      const border = this.add.graphics().setDepth(DEPTH.path + 0.1);
      border.lineStyle(7, 0x8a5a30, 0.55).strokeRoundedRect(x - PLOT_W / 2, y - PLOT_H / 2, PLOT_W, PLOT_H, 20);

      const plant = this.add.image(x, y + 42, 'tex/stage0').setOrigin(0.5, 0.85).setScale(0).setDepth(DEPTH.sortedBase + y);
      const droplet = this.add
        .image(x + PLOT_W / 2 - 26, y - PLOT_H / 2 + 24, 'ui/water')
        .setScale(0.4 * ART_K)
        .setVisible(false)
        .setDepth(DEPTH.bubble - 1);
      const ready = this.add.image(x, y - 96, 'ui/star').setScale(0.45 * ART_K).setVisible(false).setDepth(DEPTH.bubble - 1);
      this.tweens.add({ targets: ready, scale: { from: 0.4 * ART_K, to: 0.5 * ART_K }, duration: 800, yoyo: true, repeat: -1 });
      const label = this.add
        .text(x, y + PLOT_H / 2 + 10, '', {
          fontFamily: '"PingFang SC", system-ui, sans-serif',
          fontSize: '18px',
          color: '#3b2a1d',
          backgroundColor: '#fffdf5cc',
          padding: { left: 8, right: 8, top: 2, bottom: 2 },
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.bubble - 2);

      const view: PlotView = { index: i, x, y, soil, plant, droplet, ready, label, baseScale: 0.8, phase: i * 1.7 };
      this.plots.push(view);

      this.addInteractable({
        id: `plot_${i}`,
        x,
        y,
        radius: 150,
        icon: 'ui/seed',
        label: '这块地空着',
        action: () => this.plotInteract(view),
      });
    }

    this.addInteractable({
      id: 'exit',
      x: 700,
      y: 770,
      radius: 140,
      icon: 'ui/hand',
      label: '回到牧场',
      action: () => {
        audio.play('close');
        store.save();
        this.gotoScene('Ranch');
      },
    });

    // 下雨时雨点打在植物上的水花
    this.rainDrip = this.add.particles(0, 0, 'tex/dot', {
      x: { min: 260, max: 1140 },
      y: { min: 130, max: 640 },
      speedY: { min: 130, max: 230 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.26, end: 0.02 },
      alpha: { start: 0.9, end: 0 },
      tint: 0x9fd8f0,
      lifespan: 620,
      quantity: 2,
      frequency: 70,
      emitting: false,
    });
    this.rainDrip.setDepth(DEPTH.bubble);

    this.refreshPlots(true);
    this.time.delayedCall(600, () => bus.emit(EV.hint, '选好种子，点空菜地就能播种；用水壶浇水会长得更快哦！'));
  }

  /** 作物 5 个阶段（种子 → 小芽 → 叶子 → 开花 → 成熟）里的前 4 个用程序化贴图 */
  private makeStageTextures(): void {
    makeCanvasTexture(this, 'tex/stage0', 90, 80, (ctx) => {
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath();
      ctx.ellipse(45, 62, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5f8f45';
      ctx.beginPath();
      ctx.ellipse(45, 54, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    makeCanvasTexture(this, 'tex/stage1', 90, 90, (ctx) => {
      ctx.strokeStyle = '#63b96b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(45, 82);
      ctx.lineTo(45, 58);
      ctx.stroke();
      ctx.fillStyle = '#8ed66b';
      ctx.beginPath();
      ctx.ellipse(31, 56, 15, 10, -0.5, 0, Math.PI * 2);
      ctx.ellipse(59, 56, 15, 10, 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
    makeCanvasTexture(this, 'tex/stage2', 110, 110, (ctx) => {
      ctx.strokeStyle = '#63b96b';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(55, 100);
      ctx.lineTo(55, 52);
      ctx.stroke();
      ctx.fillStyle = '#7cc46a';
      [
        [30, 62, 22, 13, -0.4],
        [80, 62, 22, 13, 0.4],
        [34, 44, 18, 11, -0.6],
        [76, 44, 18, 11, 0.6],
      ].forEach(([x, y, rx, ry, rot]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    makeCanvasTexture(this, 'tex/stage3', 120, 130, (ctx) => {
      ctx.strokeStyle = '#63b96b';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(60, 118);
      ctx.lineTo(60, 44);
      ctx.stroke();
      ctx.fillStyle = '#7cc46a';
      [
        [32, 74, 24, 14, -0.4],
        [88, 74, 24, 14, 0.4],
        [38, 52, 19, 12, -0.6],
        [82, 52, 19, 12, 0.6],
      ].forEach(([x, y, rx, ry, rot]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#ffd45c';
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(60 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 12, 9, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff9cc1';
      ctx.beginPath();
      ctx.arc(60, 32, 10, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private plotInteract(view: PlotView): void {
    const crop = store.cropAt(view.index);
    const tool = store.tool;

    if (!crop) {
      const seed = store.selectedSeed;
      if (store.count(seed) <= 0) {
        audio.play('error');
        this.floatText(view.x, view.y - 60, '没有种子了，去商店买吧', '#b1553f', itemDef(seed).icon);
        return;
      }
      if (store.plant(view.index, seed)) {
        this.player.playAction('plant');
        this.floatText(view.x, view.y - 60, `种下 ${itemDef(seed).name}`, '#3b7a2f', itemDef(seed).icon);
        this.refreshPlots();
      }
      return;
    }

    const def = CROPS[crop.cropId];
    if (crop.stage >= 4) {
      const harvested = store.harvest(view.index);
      if (harvested) {
        this.player.playAction('harvest');
        this.sparkle(view.x, view.y - 20, 0xffd45c, 14);
        this.floatText(view.x, view.y - 60, `收获 ${def?.name ?? ''}`, '#3b7a2f', def?.icon);
        this.refreshPlots();
      }
      return;
    }

    if (tool === 'water' || !crop.watered) {
      store.waterPlot(view.index);
      this.player.playAction('water');
      this.floatText(view.x, view.y - 60, crop.watered ? '浇过水啦' : '浇水啦', '#3b7ea1', 'ui/water');
      this.refreshPlots();
      return;
    }

    const remain = Math.max(0, Math.ceil((def?.stageMinutes[Math.min(crop.stage, 3)] ?? 10) - crop.progress));
    this.floatText(view.x, view.y - 60, `还在长大…约 ${remain} 分钟`, '#7a5a2f', def?.icon);
  }

  private refreshPlots(force = false): void {
    this.plots.forEach((view) => {
      const crop = store.cropAt(view.index);
      const stage = crop ? crop.stage : -1;
      if (!force && this.lastStages[view.index] === stage && crop?.watered === view.soil.getData('watered')) return;
      this.lastStages[view.index] = stage;
      view.soil.setData('watered', crop?.watered ?? false);

      if (!crop) {
        view.plant.setVisible(false).setScale(0);
        view.droplet.setVisible(false);
        view.ready.setVisible(false);
        view.label.setText('');
        view.soil.setTint(0xffffff);
        return;
      }
      const def = CROPS[crop.cropId];
      view.plant.setVisible(true);
      view.soil.setTint(crop.watered ? 0xa8c98a : 0xffffff);
      if (crop.stage >= 4) {
        view.plant.setTexture(def.icon);
        view.baseScale = 0.62 * ART_K;
        view.plant.setScale(view.baseScale);
        view.ready.setVisible(true);
        view.droplet.setVisible(false);
        view.label.setText('可以收获啦！');
      } else {
        view.plant.setTexture(`tex/stage${crop.stage}`);
        view.baseScale = 0.8 - crop.stage * 0.06;
        view.plant.setScale(view.baseScale);
        view.ready.setVisible(false);
        view.droplet.setVisible(!crop.watered);
        const names = ['小种子', '发芽了', '长叶子', '开花了'];
        view.label.setText(names[crop.stage] ?? '');
      }
    });
  }

  update(time: number, delta: number): void {
    this.updateWorld(time, delta);
    this.refreshPlots();
    this.animatePlants(time, delta);
    // 提示文字跟着工具变化
    this.interactables.forEach((item: Interactable) => {
      if (!item.id.startsWith('plot_')) return;
      const index = Number(item.id.split('_')[1]);
      const crop = store.cropAt(index);
      if (!crop) {
        item.icon = 'ui/seed';
        item.label = `播种（${itemDef(store.selectedSeed).name} ×${store.count(store.selectedSeed)}）`;
      } else if (crop.stage >= 4) {
        item.icon = 'ui/basket';
        item.label = '收获';
      } else if (!crop.watered) {
        item.icon = 'ui/water';
        item.label = '浇水';
      } else {
        item.icon = itemDef(CROPS[crop.cropId].icon).icon;
        item.label = '还在长大';
      }
    });
    this.sky.update(delta);
  }

  /**
   * 植物随风摆动 + 下雨被打得点头。
   * 风力/雨势都跟着天气走：阴天风最大，雨天摆幅小一些但会上下点头。
   */
  private animatePlants(time: number, delta: number): void {
    void delta;
    const weather = store.data.weather;
    const gust = weather === 'cloudy' ? 1.9 : weather === 'rainy' ? 1 : 0.85;
    const speed = weather === 'cloudy' ? 0.0055 : weather === 'rainy' ? 0.0042 : 0.0026;
    const amp = weather === 'rainy' ? 2.6 : weather === 'cloudy' ? 4.4 : 2.2;
    this.plots.forEach((view) => {
      if (!view.plant.visible) return;
      const t = time * speed + view.phase;
      view.plant.setAngle(Math.sin(t) * amp * gust);
      if (weather === 'rainy') {
        const nod = Math.abs(Math.sin(time * 0.006 + view.phase));
        view.plant.setScale(view.baseScale * (1 - nod * 0.07), view.baseScale * (1 + nod * 0.05));
      } else {
        view.plant.setScale(view.baseScale);
      }
    });
    if (this.rainDrip) this.rainDrip.emitting = weather === 'rainy';
  }

  /** 种子选择变化时刷新 */
  override runInteract(item: Interactable): void {
    super.runInteract(item);
  }
}

export { cropBySeed };
