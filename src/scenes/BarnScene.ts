/**
 * 牛棚挤牛奶场景（PRD 第 4.4 节）
 * 按屏幕提示依次点击左右按钮，节奏正确会得到更多牛奶；点错也没有惩罚，一样有基础牛奶。
 *
 * 场景大小刚好等于设计分辨率（1280x720），相机不会滚动，
 * 界面按钮因此可以稳定地接收点击。
 */
import Phaser from 'phaser';
import { BaseWorldScene } from '../game/BaseWorldScene';
import { DEPTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { bus, EV } from '../game/EventBus';
import { audio } from '../systems/AudioSystem';
import { ART_K, makeCanvasTexture } from '../systems/TextureFactory';

type Dir = 'left' | 'right';

const STEPS = 8;
const COW = { x: 500, y: 470 };
const CX = 640;

export class BarnScene extends BaseWorldScene {
  private cow!: Phaser.GameObjects.Image;
  private cowShadow!: Phaser.GameObjects.Ellipse;
  private bucket!: Phaser.GameObjects.Image;
  private sequence: Dir[] = [];
  private step = 0;
  private correct = 0;
  private playing = false;
  private finished = false;
  private slots: Phaser.GameObjects.Container[] = [];
  private progressBar!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Container[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('Barn');
  }

  protected override resetRun(): void {
    this.slots = [];
    this.buttons = [];
    this.sequence = [];
    this.step = 0;
    this.correct = 0;
    this.playing = false;
    this.finished = false;
  }

  create(): void {
    bus.emit('ui:scene', 'Barn');
    this.createWorld({ width: 1280, height: 720, ground: 'straw', indoor: true, playerStart: { x: 800, y: 600 } });

    this.makeArrowTextures();
    this.buildBarn();

    this.cowShadow = this.add.ellipse(COW.x, COW.y, 300, 56, 0x3b2a1d, 0.18).setDepth(DEPTH.sortedBase + COW.y - 1);
    this.cow = this.add.image(COW.x, COW.y, 'animals/cow').setOrigin(0.5, 1).setScale(1.9 * ART_K).setDepth(DEPTH.sortedBase + COW.y);
    this.bucket = this.add
      .image(COW.x, COW.y + 150, 'props/milk_pail')
      .setOrigin(0.5, 1)
      .setScale(1.5 * ART_K)
      .setDepth(DEPTH.sortedBase + COW.y + 150);
    this.tweens.add({ targets: this.cow, scaleY: 1.9 * ART_K * 0.97, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.addInteractable({
      id: 'milking',
      x: COW.x,
      y: COW.y - 20,
      radius: 230,
      icon: 'ui/bucket',
      label: '给小牛挤奶',
      hintOffsetY: 150,
      action: () => this.startMilking(),
    });

    this.addInteractable({
      id: 'exit',
      x: 130,
      y: 600,
      radius: 170,
      icon: 'ui/hand',
      label: '回到牧场',
      action: () => {
        audio.play('close');
        store.save();
        this.gotoScene('Ranch');
      },
    });

    this.buildMinigameUi();
    this.updateStatus();
    this.time.delayedCall(500, () =>
      bus.emit(EV.hint, this.cowData()?.produceReady ? '走到奶糖身边，按空格或点它开始挤奶！' : '奶糖还在休息，等一会儿再来吧'),
    );
  }

  private buildBarn(): void {
    const hays: Array<[number, number, number]> = [
      [130, 330, 0.9], [290, 270, 0.7], [1130, 320, 0.9], [1210, 440, 0.7], [110, 620, 0.8],
    ];
    hays.forEach(([x, y, s]) => this.addArt('props/haypile', x, y, s));
    this.addArt('props/crate', 250, 500, 0.8);
    this.addArt('props/crate', 1060, 520, 0.8);
    this.addArt('props/bell', 900, 300, 0.7);
    this.addArt('props/water_trough', 1080, 690, 0.9);

    this.add.rectangle(0, 0, 1280, 70, 0x8a5a30, 0.92).setOrigin(0, 0).setDepth(DEPTH.overhead + 20);
    for (let x = 90; x < 1280; x += 200) {
      this.add.rectangle(x, 0, 24, 76, 0x6f4523, 0.85).setOrigin(0, 0).setDepth(DEPTH.overhead + 19);
    }
    const g = this.add.graphics().setDepth(DEPTH.path);
    for (let i = 0; i < 50; i += 1) {
      g.fillStyle(i % 2 ? 0xe6c98d : 0xd9b779, 0.55).fillEllipse(
        Phaser.Math.Between(80, 1200),
        Phaser.Math.Between(110, 700),
        Phaser.Math.Between(50, 130),
        Phaser.Math.Between(16, 34),
      );
    }
  }

  private makeArrowTextures(): void {
    makeCanvasTexture(this, 'tex/arrow_left', 80, 80, (ctx) => {
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.moveTo(20, 40);
      ctx.lineTo(58, 12);
      ctx.lineTo(58, 68);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5a3d2e';
      ctx.lineWidth = 5;
      ctx.stroke();
    });
    makeCanvasTexture(this, 'tex/arrow_right', 80, 80, (ctx) => {
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.moveTo(60, 40);
      ctx.lineTo(22, 12);
      ctx.lineTo(22, 68);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5a3d2e';
      ctx.lineWidth = 5;
      ctx.stroke();
    });
  }

  private cowData() {
    return store.data.animals.find((a) => a.species === 'cow');
  }

  /* ------------------------------------------------------------------ */
  /* 挤奶小游戏 UI                                                       */
  /* ------------------------------------------------------------------ */

  private buildMinigameUi(): void {
    this.statusText = this.add
      .text(CX, 268, '', {
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        fontSize: '26px',
        color: '#3b2a1d',
        backgroundColor: '#fffdf5e6',
        padding: { left: 18, right: 18, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui)
      .setVisible(false);

    for (let i = 0; i < STEPS; i += 1) {
      const x = CX - ((STEPS - 1) * 74) / 2 + i * 74;
      const box = this.add.rectangle(0, 0, 62, 62, 0xfffdf5, 0.9).setStrokeStyle(4, 0x5a3d2e, 0.7);
      const arrow = this.add.image(0, 0, 'tex/arrow_left').setScale(0.55);
      const container = this.add.container(x, 150, [box, arrow]).setDepth(DEPTH.ui).setVisible(false);
      container.setData('arrow', arrow);
      container.setData('box', box);
      this.slots.push(container);
    }

    const mkButton = (x: number, dir: Dir) => {
      const bg = this.add.circle(0, 0, 74, dir === 'left' ? 0x9ed8f5 : 0xffd9e7).setStrokeStyle(7, 0x5a3d2e, 0.9);
      const arrow = this.add.image(0, 0, dir === 'left' ? 'tex/arrow_left' : 'tex/arrow_right').setScale(0.9);
      const label = this.add
        .text(0, -110, dir === 'left' ? '左边' : '右边', { fontFamily: '"PingFang SC", system-ui, sans-serif', fontSize: '24px', color: '#3b2a1d' })
        .setOrigin(0.5);
      const container = this.add.container(x, 470, [bg, arrow, label]).setDepth(DEPTH.ui).setVisible(false);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.press(dir));
      this.buttons.push(container);
    };
    mkButton(170, 'left');
    mkButton(1110, 'right');

    this.progressBar = this.add.graphics().setDepth(DEPTH.ui).setVisible(false);
  }

  private drawProgress(): void {
    const filled = this.getFilled();
    this.progressBar.clear();
    this.progressBar.fillStyle(0xfffdf5, 0.92).fillRoundedRect(CX - 190, 206, 380, 30, 15);
    this.progressBar.fillStyle(0x9ed8f5, 1).fillRoundedRect(CX - 186, 210, Math.max(0, 372 * filled), 22, 11);
    this.progressBar.lineStyle(5, 0x5a3d2e, 0.8).strokeRoundedRect(CX - 190, 206, 380, 30, 15);
  }

  private getFilled(): number {
    const stepPart = this.sequence.length ? this.step / this.sequence.length : 0;
    return Math.min(1, stepPart * 0.75 + (this.correct / Math.max(1, this.sequence.length)) * 0.25);
  }

  private startMilking(): void {
    const cow = this.cowData();
    if (!cow) return;
    if (this.playing) return;
    if (this.finished) {
      this.statusText.setVisible(true).setText('今天已经挤过啦，明天再来吧～');
      return;
    }
    if (!cow.produceReady) {
      audio.play('error');
      this.statusText.setVisible(true).setText('奶糖还在休息，等一会儿再来吧～');
      this.player.bubble('ui/clock');
      return;
    }
    this.playing = true;
    this.sequence = Array.from({ length: STEPS }, () => (Math.random() < 0.5 ? 'left' : 'right'));
    this.step = 0;
    this.correct = 0;
    this.player.freeze(true);
    this.player.setPosition(760, 560);
    this.player.facing = -1;
    this.player.playAction('squeeze');
    this.statusText.setVisible(true).setText('按顺序点按钮，左边一下、右边一下～');
    this.slots.forEach((s) => s.setVisible(true));
    this.buttons.forEach((b) => b.setVisible(true));
    this.progressBar.setVisible(true);
    this.refreshSlots();
    this.drawProgress();
    audio.play('open');
  }

  private refreshSlots(): void {
    this.slots.forEach((slot, i) => {
      const dir = this.sequence[i];
      const arrow = slot.getData('arrow') as Phaser.GameObjects.Image;
      const box = slot.getData('box') as Phaser.GameObjects.Rectangle;
      arrow.setTexture(dir === 'left' ? 'tex/arrow_left' : 'tex/arrow_right');
      arrow.setAlpha(i > this.step ? 0.35 : i === this.step ? 1 : 0.75);
      box.setFillStyle(i < this.step ? 0xbfe6a8 : i === this.step ? 0xffd45c : 0xfffdf5, 0.95);
      slot.setScale(i === this.step ? 1.1 : 1);
    });
  }

  private press(dir: Dir): void {
    if (!this.playing || this.step >= this.sequence.length) return;
    const expected = this.sequence[this.step];
    const ok = expected === dir;
    if (ok) {
      this.correct += 1;
      audio.play('milk');
      this.splashMilk();
      this.floatText(this.player.x, this.player.y - 150, '咕嘟！', '#3b7ea1', 'ui/bucket');
    } else {
      audio.play('pop');
      this.floatText(this.player.x, this.player.y - 150, '没关系～', '#b1553f');
    }
    this.step += 1;
    this.bucket.setScale((1.5 + this.getFilled() * 0.35) * ART_K);
    this.refreshSlots();
    this.drawProgress();
    if (this.step >= this.sequence.length) this.finishMilking();
  }

  private splashMilk(): void {
    const emitter = this.add.particles(COW.x, COW.y + 70, 'tex/dot', {
      speedY: { min: 120, max: 260 },
      speedX: { min: -70, max: 70 },
      scale: { start: 0.4, end: 0.05 },
      alpha: { start: 0.95, end: 0 },
      tint: 0xfffdf5,
      lifespan: 620,
      quantity: 6,
      emitting: false,
    });
    emitter.setDepth(DEPTH.bubble);
    emitter.explode(6);
    this.time.delayedCall(800, () => emitter.destroy());
  }

  private finishMilking(): void {
    this.playing = false;
    this.finished = true;
    const cow = this.cowData();
    if (!cow) return;
    const accuracy = this.correct / this.sequence.length;
    let amount = 1;
    if (accuracy >= 0.6) amount += 1;
    if (accuracy >= 0.9) amount += 1;

    cow.produceReady = false;
    cow.lastProduceAt = store.absoluteMinute;
    cow.mood = Math.min(100, cow.mood + 8);
    cow.friendship = Math.min(5, cow.friendship + 0.2);
    store.addItem('milk', amount);
    store.notify();

    audio.play('cheer');
    this.statusText.setText(`装满啦！得到 ${amount} 瓶牛奶 🎉`);
    this.slots.forEach((s) => s.setVisible(false));
    this.buttons.forEach((b) => b.setVisible(false));
    this.player.freeze(false);
    this.player.setSustainedAction(null);
    this.player.playAction('cheer');

    const hearts = this.add.particles(COW.x, COW.y - 120, 'ui/heart', {
      speedY: { min: -110, max: -50 },
      speedX: { min: -60, max: 60 },
      scale: { start: 0.55 * ART_K, end: 0.1 * ART_K },
      alpha: { start: 1, end: 0 },
      lifespan: 1400,
      quantity: 3,
      frequency: 90,
    });
    hearts.setDepth(DEPTH.bubble);
    this.time.delayedCall(1400, () => {
      hearts.stop();
      this.time.delayedCall(1200, () => hearts.destroy());
    });
    this.sparkle(COW.x, COW.y - 40, 0xfff0b8, 16);
    this.player.playAction('cheer');
    this.updateStatus();
  }

  private updateStatus(): void {
    const cow = this.cowData();
    if (!cow) return;
    if (!this.playing && !this.finished) {
      this.statusText.setVisible(true).setText(
        cow.produceReady ? `${cow.name} 想被挤奶啦，快来吧！` : `${cow.name} 还在休息，先去做别的事吧～`,
      );
    }
  }

  update(time: number, delta: number): void {
    this.updateWorld(time, delta);
    const t = this.time.now;
    this.cow.setAngle(Math.sin(t / 900) * 1.6);
    this.cowShadow.setScale(1 + Math.sin(t / 1600) * 0.02, 1);
    this.sky.update(delta);
  }
}
