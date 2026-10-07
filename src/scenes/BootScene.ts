/**
 * 启动场景：把全部 SVG 资源栅格化成贴图（含角色／动物精灵图），并创建动画。
 */
import Phaser from 'phaser';
import { ART } from '../assets';
import {
  allSheetDefs,
  createSheetsAnimations,
  registerProceduralTextures,
  registerSheet,
  registerSvgTextures,
  sheetKeySet,
} from '../systems/TextureFactory';
import { store } from '../game/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const fill = document.getElementById('loading-fill');
    const label = document.querySelector<HTMLParagraphElement>('#loading-screen p');
    // 精灵图（角色动作 / 服装 / 动物动作）单独注册，不参与普通 SVG 贴图注册
    const sheets = allSheetDefs();
    const skip = sheetKeySet();
    const keys = Object.keys(ART).filter((k) => !skip.has(k) && !skip.has(ART[k].key));
    registerProceduralTextures(this);

    const chunks: string[][] = [];
    const chunkSize = 12;
    for (let i = 0; i < keys.length; i += chunkSize) chunks.push(keys.slice(i, i + chunkSize));

    const run = async () => {
      for (let i = 0; i < chunks.length; i += 1) {
        await registerSvgTextures(this, chunks[i]);
        const pct = Math.round(((i + 1) / (chunks.length + 1)) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (label) label.textContent = `正在准备牧场… ${pct}%`;
      }
      // 逐张注册精灵图，顺便更新进度
      for (let i = 0; i < sheets.length; i += 1) {
        await registerSheet(this, sheets[i]);
        if (i % 4 === 0) {
          const pct = Math.round(90 + (i / sheets.length) * 10);
          if (fill) fill.style.width = `${pct}%`;
        }
      }
      createSheetsAnimations(this);
    };

    void run().then(() => {
      if (fill) fill.style.width = '100%';
      const next = store.data.started ? 'Ranch' : 'Title';
      this.time.delayedCall(120, () => this.scene.start(next));
    });
  }
}
