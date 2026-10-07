/**
 * 启动场景：把全部 SVG 资源栅格化成贴图，并更新载入进度条。
 */
import Phaser from 'phaser';
import { ART } from '../assets';
import {
  PIXEL_FRAME_H,
  PIXEL_FRAME_W,
  PIXEL_FRAMES,
  PIXEL_SHEET_KEY,
  WALK_ANIM_KEY,
  registerPixelSheet,
  registerProceduralTextures,
  registerSvgTextures,
} from '../systems/TextureFactory';
import { store } from '../game/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const fill = document.getElementById('loading-fill');
    const label = document.querySelector<HTMLParagraphElement>('#loading-screen p');
    // 像素行走图单独走"像素管线"，不参与普通 SVG 贴图注册
    const keys = Object.keys(ART).filter((k) => k !== PIXEL_SHEET_KEY && ART[k]?.key !== PIXEL_SHEET_KEY);
    registerProceduralTextures(this);

    const chunks: string[][] = [];
    const chunkSize = 12;
    for (let i = 0; i < keys.length; i += chunkSize) chunks.push(keys.slice(i, i + chunkSize));

    const run = async () => {
      for (let i = 0; i < chunks.length; i += 1) {
        await registerSvgTextures(this, chunks[i]);
        const pct = Math.round(((i + 1) / chunks.length) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (label) label.textContent = `正在准备牧场… ${pct}%`;
      }
    };

    void run()
      .then(() => registerPixelSheet(this, PIXEL_SHEET_KEY, PIXEL_SHEET_KEY, PIXEL_FRAME_W, PIXEL_FRAME_H, PIXEL_FRAMES))
      .then((ok) => {
        if (ok && !this.anims.exists(WALK_ANIM_KEY)) {
          this.anims.create({
            key: WALK_ANIM_KEY,
            frames: this.anims.generateFrameNumbers(PIXEL_SHEET_KEY, { start: 0, end: PIXEL_FRAMES - 1 }),
            // 每帧约 140ms（PRD 建议 120~160ms）
            frameRate: 7,
            repeat: -1,
          });
        }
      })
      .then(() => {
        if (fill) fill.style.width = '100%';
        const next = store.data.started ? 'Ranch' : 'Title';
        this.time.delayedCall(120, () => this.scene.start(next));
      });
  }
}
