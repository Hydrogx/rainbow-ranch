/**
 * 天气 + 昼夜系统（PRD 第 8 节）
 * - 天气：晴天 / 阴天 / 雨天，带渐变过渡
 * - 昼夜：白天 / 傍晚 / 晚上，天空颜色、灯光、星星、萤火虫随之变化
 * 所有效果都用 Phaser 图形、粒子与补间实现，不消耗额外图片资源。
 */
import Phaser from 'phaser';
import { DEPTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { ART_K, makeCanvasTexture } from './TextureFactory';

export interface SkyOptions {
  width: number;
  height: number;
  /** 室内场景（鸡舍/牛棚）只保留轻微的光线变化 */
  indoor?: boolean;
}

const TINTS = {
  day: { r: 255, g: 255, b: 255, a: 0 },
  dusk: { r: 255, g: 158, b: 92, a: 0.26 },
  night: { r: 38, g: 52, b: 110, a: 0.46 },
};

export class SkySystem {
  private scene: Phaser.Scene;
  private opts: SkyOptions;
  private tint: Phaser.GameObjects.Rectangle;
  private warm: Phaser.GameObjects.Rectangle;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireflies?: Phaser.GameObjects.Particles.ParticleEmitter;
  private sunRays?: Phaser.GameObjects.Particles.ParticleEmitter;
  private clouds: Phaser.GameObjects.Image[] = [];
  private stars: Phaser.GameObjects.Image[] = [];
  private moon: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Image;
  private sunGlow: Phaser.GameObjects.Image;
  private puddles: Phaser.GameObjects.Image[] = [];
  private grassSway: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private cloudTimer = 0;
  private lastWeather = '';

  constructor(scene: Phaser.Scene, opts: SkyOptions) {
    this.scene = scene;
    this.opts = opts;
    const w = 1280;
    const h = 720;

    makeCanvasTexture(scene, 'tex/moon', 96, 96, (ctx) => {
      ctx.fillStyle = '#FFF6D8';
      ctx.beginPath();
      ctx.arc(48, 48, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F2E3B8';
      ctx.beginPath();
      ctx.arc(36, 38, 8, 0, Math.PI * 2);
      ctx.arc(60, 60, 6, 0, Math.PI * 2);
      ctx.arc(52, 30, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    makeCanvasTexture(scene, 'tex/puddle', 180, 70, (ctx) => {
      ctx.fillStyle = 'rgba(150,205,235,0.65)';
      ctx.beginPath();
      ctx.ellipse(90, 35, 84, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(64, 26, 26, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 星空（屏幕坐标，只在画面上方）
    for (let i = 0; i < 46; i += 1) {
      const star = scene.add
        .image(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h * 0.42), 'tex/star')
        .setScrollFactor(0)
        .setDepth(DEPTH.night + 2)
        .setVisible(false)
        .setScale(Phaser.Math.FloatBetween(0.25, 0.7))
        .setAlpha(0);
      scene.tweens.add({
        targets: star,
        alpha: { from: 0.35, to: 0.95 },
        duration: Phaser.Math.Between(700, 1800),
        yoyo: true,
        repeat: -1,
      });
      this.stars.push(star);
    }

    this.moon = scene.add
      .image(w - 300, 190, 'tex/moon')
      .setScrollFactor(0)
      .setDepth(DEPTH.night + 2)
      .setAlpha(0)
      .setScale(0.9);
    this.sunGlow = scene.add
      .image(w - 290, 180, 'tex/glow')
      .setScrollFactor(0)
      .setDepth(DEPTH.night + 1)
      .setAlpha(0)
      .setScale(4.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.sun = scene.add.image(w - 290, 180, 'ui/sun').setScrollFactor(0).setDepth(DEPTH.night + 2).setAlpha(0).setScale(1.35 * ART_K);

    // 云朵（世界坐标，带视差）
    for (let i = 0; i < 5; i += 1) {
      const cloud = scene.add
        .image(Phaser.Math.Between(0, opts.width), Phaser.Math.Between(40, opts.height * 0.5), 'ui/cloud')
        .setScrollFactor(0.35)
        .setDepth(DEPTH.overhead)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.5) * ART_K)
        .setAlpha(0.9);
      this.clouds.push(cloud);
    }

    this.tint = scene.add
      .rectangle(0, 0, w, h, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.night);

    this.warm = scene.add
      .rectangle(0, 0, w, h, 0xffb066, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.night + 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.rebuildWeather();
    this.applyPhase(1);
  }

  /** 天气切换时重建粒子效果 */
  private rebuildWeather(): void {
    const weather = store.data.weather;
    if (weather === this.lastWeather) return;
    this.lastWeather = weather;

    this.rain?.destroy();
    this.rain = undefined;
    this.sunRays?.destroy();
    this.sunRays = undefined;
    this.fireflies?.destroy();
    this.fireflies = undefined;

    if (weather === 'rainy' && !this.opts.indoor) {
      this.rain = this.scene.add.particles(0, 0, 'tex/rain', {
        x: { min: -220, max: 1500 },
        y: { min: -120, max: -20 },
        speedY: { min: 760, max: 1050 },
        speedX: { min: -170, max: -90 },
        scale: { min: 0.9, max: 1.6 },
        alpha: { min: 0.65, max: 1 },
        lifespan: 1500,
        quantity: 6,
        frequency: 14,
        emitting: true,
      });
      this.rain.setScrollFactor(0).setDepth(DEPTH.weather);

      // 雨天的水洼
      while (this.puddles.length < 7) {
        const p = this.scene.add
          .image(Phaser.Math.Between(120, this.opts.width - 120), Phaser.Math.Between(200, this.opts.height - 120), 'tex/puddle')
          .setDepth(DEPTH.path + 1)
          .setScale(Phaser.Math.FloatBetween(0.5, 1.05))
          .setAlpha(0);
        this.puddles.push(p);
      }
      this.puddles.forEach((p) => this.scene.tweens.add({ targets: p, alpha: 0.75, duration: 900 }));
    } else {
      this.puddles.forEach((p) => this.scene.tweens.add({ targets: p, alpha: 0, duration: 700 }));
      if (weather === 'sunny') {
        this.sunRays = this.scene.add.particles(0, 0, 'tex/dot', {
          x: { min: 0, max: 1280 },
          y: { min: -20, max: 240 },
          speedY: { min: 12, max: 40 },
          speedX: { min: -18, max: 18 },
          scale: { start: 0.5, end: 0.05 },
          alpha: { start: 0.5, end: 0 },
          tint: 0xfff0b8,
          lifespan: 4200,
          quantity: 1,
          frequency: 220,
        });
        this.sunRays.setScrollFactor(0).setDepth(DEPTH.weather - 1);
      }
    }
  }

  /** 夜间萤火虫（世界坐标） */
  private ensureFireflies(on: boolean): void {
    if (on && !this.fireflies) {
      this.fireflies = this.scene.add.particles(0, 0, 'tex/dot', {
        x: { min: 0, max: this.opts.width },
        y: { min: 120, max: this.opts.height - 60 },
        speedX: { min: -18, max: 18 },
        speedY: { min: -14, max: 14 },
        scale: { start: 0.42, end: 0.12 },
        alpha: { start: 0.9, end: 0 },
        tint: 0xfff59a,
        lifespan: 3400,
        quantity: 1,
        frequency: 260,
      });
      this.fireflies.setDepth(DEPTH.sortedBase + 400);
    } else if (!on && this.fireflies) {
      this.fireflies.destroy();
      this.fireflies = undefined;
    }
  }

  private applyPhase(phaseBlend: number): void {
    void phaseBlend;
    const phase = store.phase;
    const weather = store.data.weather;
    const indoor = this.opts.indoor;

    let target = TINTS.day;
    if (phase === 'dusk') target = TINTS.dusk;
    else if (phase === 'night') target = TINTS.night;
    if (weather === 'cloudy' && phase === 'day') target = { r: 210, g: 220, b: 230, a: 0.14 };
    if (weather === 'rainy' && phase === 'day') target = { r: 160, g: 180, b: 200, a: 0.24 };

    const a = target.a * (indoor ? 0.45 : 1);
    this.tint.setFillStyle(Phaser.Display.Color.GetColor(target.r, target.g, target.b), a);
    this.warm.setAlpha(phase === 'dusk' ? (indoor ? 0.05 : 0.12) : 0);

    const nightAlpha = (phase === 'night' ? 1 : phase === 'dusk' ? 0.25 : 0) * (indoor ? 0 : 1);
    const showSky = !indoor;
    this.stars.forEach((s) => s.setVisible(showSky && nightAlpha > 0.05));
    this.moon.setAlpha(nightAlpha * 0.95);
    this.moon.setVisible(showSky && nightAlpha > 0.05 && weather !== 'rainy');
    const sunAlpha = showSky && phase === 'day' ? (weather === 'sunny' ? 0.72 : 0.3) : 0;
    this.sun.setAlpha(sunAlpha);
    this.sunGlow.setAlpha(sunAlpha * (weather === 'sunny' ? 0.55 : 0.2));
    this.ensureFireflies(phase === 'night' && !indoor);
    this.clouds.forEach((c) => {
      c.setVisible(showSky);
      c.setAlpha(weather === 'sunny' ? 0.55 : weather === 'cloudy' ? 0.95 : 1);
    });
  }

  update(dt: number): void {
    this.rebuildWeather();
    this.applyPhase(1);

    // 云朵飘动
    this.clouds.forEach((c, i) => {
      c.x += dt * (0.012 + i * 0.004) * (store.data.weather === 'sunny' ? 1 : 1.6);
      if (c.x > this.opts.width + 260) c.x = -260;
    });

    this.cloudTimer -= dt;
    if (this.cloudTimer <= 0) {
      this.cloudTimer = 2500;
    }
  }

  destroy(): void {
    this.rain?.destroy();
    this.sunRays?.destroy();
    this.fireflies?.destroy();
    this.stars.forEach((s) => s.destroy());
    this.clouds.forEach((c) => c.destroy());
    this.puddles.forEach((p) => p.destroy());
    this.grassSway.forEach((g) => g.destroy());
    this.moon.destroy();
    this.sun.destroy();
    this.sunGlow.destroy();
    this.tint.destroy();
    this.warm.destroy();
  }
}
