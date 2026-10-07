/**
 * 标题 / 选择主人公场景（PRD 第 6.1 节：男孩或女孩，能力完全相同）
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { audio } from '../systems/AudioSystem';
import { bus, EV } from '../game/EventBus';
import type { CharacterKind } from '../game/types';
import { ART_K } from '../systems/TextureFactory';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    bus.emit('ui:title', true);
    const cx = GAME_WIDTH / 2;

    this.add.image(0, 0, 'tex/sky').setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-10);
    this.add.rectangle(0, GAME_HEIGHT - 200, GAME_WIDTH, 200, 0x8ed66b).setOrigin(0, 0).setDepth(-9);

    const rainbow = this.add.image(cx, 36, 'props/rainbow').setOrigin(0.5, 0).setScale(1.7 * ART_K).setAlpha(0.92).setDepth(-8);
    this.tweens.add({ targets: rainbow, y: 24, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    for (let i = 0; i < 4; i += 1) {
      const cloud = this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(90, 300), 'ui/cloud')
        .setScale(Phaser.Math.FloatBetween(0.6, 1.2) * ART_K)
        .setAlpha(0.85)
        .setDepth(-7);
      this.tweens.add({ targets: cloud, x: cloud.x + Phaser.Math.Between(120, 260), duration: Phaser.Math.Between(7000, 12000), yoyo: true, repeat: -1 });
    }

    this.add.image(140, GAME_HEIGHT - 60, 'props/cottage').setOrigin(0.5, 1).setScale(0.7 * ART_K).setDepth(-4);
    this.add.image(GAME_WIDTH - 130, GAME_HEIGHT - 50, 'props/barn').setOrigin(0.5, 1).setScale(0.66 * ART_K).setDepth(-4);
    const cow = this.add.image(GAME_WIDTH - 330, GAME_HEIGHT - 40, 'animals/cow').setOrigin(0.5, 1).setScale(0.55 * ART_K).setDepth(-3);
    const chicken = this.add.image(340, GAME_HEIGHT - 40, 'animals/chicken').setOrigin(0.5, 1).setScale(0.5 * ART_K).setDepth(-3);
    this.tweens.add({ targets: [cow, chicken], y: '-=10', duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const title = this.add
      .text(cx, 208, '小小彩虹牧场', {
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#FFF7E4',
        stroke: '#5A3D2E',
        strokeThickness: 14,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.03 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(cx, 300, '照顾小动物、捡鸡蛋、种蔬菜、做好吃的！', {
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        fontSize: '26px',
        color: '#3b2a1d',
        backgroundColor: '#fffdf5d9',
        padding: { left: 16, right: 16, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setDepth(5);

    const hasSave = store.data.started;

    this.add
      .text(cx, 362, hasSave ? '欢迎回来！' : '请选择你的小主人公（能力完全一样哦）', {
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        fontSize: '22px',
        color: '#4a3527',
      })
      .setOrigin(0.5)
      .setDepth(5);

    if (hasSave) {
      this.makeButton(cx, 436, '继续游玩', 280, 86, 0x8ed66b, () => this.enterRanch(store.data.character));
      this.makeCharacterButton(cx - 170, 580, 'boy', 0.8);
      this.makeCharacterButton(cx + 170, 580, 'girl', 0.8);
      this.add
        .text(cx, 700, '点小人可以重新开始', { fontFamily: '"PingFang SC", system-ui, sans-serif', fontSize: '18px', color: '#4a3527' })
        .setOrigin(0.5)
        .setDepth(5);
    } else {
      this.makeCharacterButton(cx - 195, 560, 'boy', 1.0);
      this.makeCharacterButton(cx + 195, 560, 'girl', 1.0);
    }
  }

  private makeCharacterButton(x: number, y: number, kind: CharacterKind, scale: number): void {
    const container = this.add.container(x, y).setDepth(6);
    const circle = this.add.circle(0, -64 * scale, 112 * scale, kind === 'boy' ? 0x9ed8f5 : 0xffd9e7).setStrokeStyle(8, 0x5a3d2e, 0.85);
    const character = this.add.image(0, 52 * scale, `characters/${kind}`).setOrigin(0.5, 1).setScale(0.8 * scale * ART_K);
    const name = this.add
      .text(0, 150 * scale, kind === 'boy' ? '男孩' : '女孩', {
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#3b2a1d',
        backgroundColor: '#fffdf5e6',
        padding: { left: 18, right: 18, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);
    container.add([circle, character, name]);
    circle.setInteractive({ useHandCursor: true });
    circle.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.06, duration: 140 }));
    circle.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 140 }));
    circle.on('pointerdown', () => {
      audio.play('pop');
      this.tweens.add({ targets: container, scale: 1.2, duration: 160, yoyo: true });
      if (kind !== store.data.character || !store.data.started) store.chooseCharacter(kind);
      this.enterRanch(kind);
    });
    this.tweens.add({ targets: character, y: character.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private makeButton(x: number, y: number, label: string, w: number, h: number, color: number, onClick: () => void): void {
    const container = this.add.container(x, y).setDepth(6);
    const bg = this.add.rectangle(0, 0, w, h, color).setStrokeStyle(7, 0x5a3d2e, 0.9);
    const text = this.add
      .text(0, 0, label, { fontFamily: '"PingFang SC", system-ui, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#3b2a1d' })
      .setOrigin(0.5);
    container.add([bg, text]);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.05, duration: 140 }));
    bg.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 140 }));
    bg.on('pointerdown', () => {
      audio.play('click');
      onClick();
    });
  }

  private enterRanch(kind: CharacterKind): void {
    if (!store.data.started || store.data.character !== kind) {
      store.chooseCharacter(kind);
    }
    bus.emit('ui:title', false);
    audio.play('open');
    this.cameras.main.fadeOut(300, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Ranch'));
  }
}
