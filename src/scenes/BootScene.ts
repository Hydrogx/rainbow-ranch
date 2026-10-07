/**
 * 启动场景：把全部 SVG 资源栅格化成贴图，并更新载入进度条。
 */
import Phaser from 'phaser';
import { ART } from '../assets';
import { registerProceduralTextures, registerSvgTextures } from '../systems/TextureFactory';
import { store } from '../game/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const fill = document.getElementById('loading-fill');
    const label = document.querySelector<HTMLParagraphElement>('#loading-screen p');
    const keys = Object.keys(ART);
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

    void run().then(() => {
      if (fill) fill.style.width = '100%';
      const next = store.data.started ? 'Ranch' : 'Title';
      this.time.delayedCall(120, () => this.scene.start(next));
    });
  }
}
