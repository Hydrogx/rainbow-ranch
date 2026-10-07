/**
 * 捡鸡蛋专门场景（PRD 第 4.2 节）
 * 鸡会在鸡舍里走来走去、停下、咯咯叫、下蛋；玩家走过去按空格或点击鸡蛋即可拾取。
 */
import Phaser from 'phaser';
import { BaseWorldScene, type Interactable } from '../game/BaseWorldScene';
import { DEPTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { bus, EV } from '../game/EventBus';
import { Animal } from '../entities/Animal';
import { audio } from '../systems/AudioSystem';
import { itemDef } from '../data/catalog';
import { ART_K } from '../systems/TextureFactory';

interface CoopEgg {
  sprite: Phaser.GameObjects.Image;
  kind: 'egg' | 'egg_color' | 'egg_gold';
  item: Interactable;
  glow?: Phaser.GameObjects.Image;
}

export class ChickenCoopScene extends BaseWorldScene {
  private chickens: Animal[] = [];
  private eggs: CoopEgg[] = [];
  private layTimer = 3000;
  private hatched = 0;

  constructor() {
    super('ChickenCoop');
  }

  protected override resetRun(): void {
    this.chickens = [];
    this.eggs = [];
    this.layTimer = 3000;
    this.hatched = 0;
  }

  create(): void {
    bus.emit('ui:scene', 'ChickenCoop');
    this.createWorld({ width: 1500, height: 1100, ground: 'straw', indoor: true, playerStart: { x: 750, y: 900 } });

    this.buildCoop();
    this.spawnChickens();
    this.spawnInitialEggs();

    this.addInteractable({
      id: 'exit',
      x: 750,
      y: 1070,
      radius: 150,
      icon: 'ui/hand',
      label: '回到牧场',
      action: () => {
        audio.play('close');
        store.save();
        this.gotoScene('Ranch');
      },
    });

    this.time.delayedCall(600, () => bus.emit(EV.hint, '走到鸡蛋旁边，按空格或点击鸡蛋就能捡起来！'));
  }

  private buildCoop(): void {
    // 干草与木箱
    // 干草地面质感
    const g = this.add.graphics().setDepth(DEPTH.path);
    for (let i = 0; i < 70; i += 1) {
      g.fillStyle(i % 2 ? 0xe6c98d : 0xcdae72, 0.55).fillEllipse(
        Phaser.Math.Between(90, 1410),
        Phaser.Math.Between(140, 1040),
        Phaser.Math.Between(50, 150),
        Phaser.Math.Between(16, 34),
      );
    }

    // 产蛋箱（一排木箱）
    [400, 610, 820, 1030].forEach((x) => {
      this.addArt('props/crate', x, 330, 0.8);
      this.obstacles.create(x, 310, 'tex/dot').setVisible(false).setDisplaySize(80, 44).refreshBody();
      this.addArt('props/haypile', x, 344, 0.34);
    });

    // 干草堆
    const hays: Array<[number, number, number]> = [
      [200, 540, 1], [350, 610, 0.8], [1200, 540, 1], [1340, 610, 0.8], [190, 900, 0.9], [1310, 900, 0.9],
    ];
    hays.forEach(([x, y, s]) => this.addArt('props/haypile', x, y, s));

    // 饲料槽与饮水槽
    this.addArt('props/trough', 320, 720, 1);
    this.addArt('props/water_trough', 1200, 720, 1);

    // 四周栅栏
    for (let x = 60; x <= 1440; x += 115) {
      this.addArt('props/fence', x, 1050, 0.95);
    }
    for (let y = 220; y <= 1000; y += 115) {
      this.addArt('props/fence', 50, y, 0.95);
      this.addArt('props/fence', 1450, y, 0.95);
    }

    // 屋顶横梁（走到鸡舍上方时能看到）
    this.add.rectangle(0, 0, 1500, 100, 0x8a5a30, 0.92).setOrigin(0, 0).setDepth(DEPTH.overhead + 20);
    this.add.rectangle(0, 106, 1500, 16, 0x6f4523, 0.9).setOrigin(0, 0).setDepth(DEPTH.overhead + 20);
    for (let x = 100; x < 1500; x += 220) {
      this.add.rectangle(x, 0, 26, 106, 0x6f4523, 0.85).setOrigin(0, 0).setDepth(DEPTH.overhead + 19);
    }
  }

  private spawnChickens(): void {
    const world = {
      homes: { chicken: { x: 220, y: 420, w: 1060, h: 520 }, sheep: { x: 0, y: 0, w: 1, h: 1 }, cow: { x: 0, y: 0, w: 1, h: 1 } },
      shelter: { chicken: { x: 750, y: 960 }, sheep: { x: 0, y: 0 }, cow: { x: 0, y: 0 } },
      feedTrough: { x: 320, y: 760 },
      waterTrough: { x: 1200, y: 760 },
    };
    const chickens = store.data.animals.filter((a) => a.species === 'chicken');
    chickens.forEach((data, i) => {
      const animal = new Animal(this, { ...data, x: 400 + i * 300, y: 560 + (i % 2) * 170 }, world);
      animal.data.produceReady = false;
      this.chickens.push(animal);
      this.addInteractable(
        {
          id: `coop_${data.id}`,
          x: animal.x,
          y: animal.y,
          radius: 110,
          icon: 'ui/hand',
          label: '摸摸小鸡',
          action: () => {
            store.pet(data.id);
            animal.react('petted');
            this.player.playAction('pet');
            this.floatText(animal.x, animal.y - 84, '咯咯哒～', '#e0567f', 'ui/heart');
          },
        },
        animal.hitArea,
      );
      animal.body.setData('interactable-id', `coop_${data.id}`);
    });
  }

  /** 进入鸡舍时，根据鸡的数量和天气生成一批鸡蛋 */
  private spawnInitialEggs(): void {
    const weather = store.data.weather;
    let count = 2 + (weather === 'sunny' ? 1 : 0) + (weather === 'rainy' ? 1 : 0);
    const ready = store.data.animals.filter((a) => a.species === 'chicken' && a.produceReady);
    count += Math.min(ready.length, 3);
    ready.forEach((a) => {
      a.produceReady = false;
      a.lastProduceAt = store.absoluteMinute;
    });
    for (let i = 0; i < count; i += 1) {
      this.layEgg(
        Phaser.Math.Between(220, 1280),
        Phaser.Math.Between(430, 1000),
        false,
      );
    }
  }

  private layEgg(x: number, y: number, animate = true): void {
    if (this.eggs.length >= 14) return;
    const roll = Math.random();
    const kind: CoopEgg['kind'] = roll < 0.08 ? 'egg_gold' : roll < 0.32 ? 'egg_color' : 'egg';
    const sprite = this.add
      .image(x, y + 6, `props/${kind}`)
      .setOrigin(0.5, 0.9)
      .setScale((animate ? 0.05 : 0.46) * ART_K)
      .setDepth(DEPTH.sortedBase + y);
    if (animate)
      this.tweens.add({ targets: sprite, scaleX: 0.46 * ART_K, scaleY: 0.46 * ART_K, duration: 380, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let glow: Phaser.GameObjects.Image | undefined;
    if (kind !== 'egg') {
      glow = this.add.image(x, y - 6, 'tex/glow').setScale(0.5).setAlpha(0.7).setDepth(DEPTH.sortedBase + y - 1);
      this.tweens.add({ targets: glow, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });
    }

    const item: Interactable = {
      id: `coop_egg_${Math.random().toString(36).slice(2, 8)}`,
      x,
      y,
      radius: 110,
      icon: 'ui/basket',
      label: '捡鸡蛋',
      action: () => undefined,
    };
    const egg: CoopEgg = { sprite, kind, item, glow };
    item.action = () => this.pickEgg(egg);
    this.eggs.push(egg);
    this.addInteractable(item, sprite);
    this.sparkle(x, y - 10, kind === 'egg_gold' ? 0xffe58a : 0xfff0b8, 6);
  }

  private pickEgg(egg: CoopEgg): void {
    if (!this.eggs.includes(egg)) return;
    this.eggs = this.eggs.filter((e) => e !== egg);
    this.hatched += 1;
    store.collectEgg(egg.kind);
    this.player.playAction('pickup');
    this.floatText(egg.sprite.x, egg.sprite.y - 24, `+1 ${itemDef(egg.kind).name}`, '#3b2a1d', itemDef(egg.kind).icon);
    this.sparkle(egg.sprite.x, egg.sprite.y - 10, 0xfff0b8, 8);
    this.interactables = this.interactables.filter((i) => i !== egg.item);
    this.tweens.killTweensOf(egg.sprite);
    egg.sprite.destroy();
    egg.glow?.destroy();
  }

  update(time: number, delta: number): void {
    this.updateWorld(time, delta);
    const hour = store.data.minutes / 60;
    this.chickens.forEach((c) => {
      c.update(delta, this.player.x, this.player.y, hour);
      const item = this.interactables.find((i) => i.id === `coop_${c.data.id}`);
      if (item) {
        item.x = c.x;
        item.y = c.y;
      }
    });

    // 随机有鸡下蛋
    this.layTimer -= delta;
    if (this.layTimer <= 0) {
      this.layTimer = Phaser.Math.Between(5000, 11000);
      const chicken = this.chickens[Phaser.Math.Between(0, Math.max(0, this.chickens.length - 1))];
      if (chicken && this.eggs.length < 12) {
        chicken.setState('produce', 1200);
        this.floatText(chicken.x, chicken.y - 84, '咯咯哒！', '#e0567f', 'props/egg');
        audio.play('cluck');
        this.time.delayedCall(700, () => this.layEgg(chicken.x + Phaser.Math.Between(-20, 20), chicken.y + 10));
      }
    }

    this.sky.update(delta);
  }
}
