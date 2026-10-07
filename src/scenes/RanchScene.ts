/**
 * 牧场主场景（PRD 第 4.1 节）
 * 包含小屋、鸡舍入口、牛棚、羊圈、菜地、水井、仓库、烹饪小屋、商店、客人接待区与装饰区域。
 *
 * 世界尺寸 2400 x 1900：
 *   y ≈ 620  一排建筑（小屋 / 鸡舍 / 牛棚 / 仓库）
 *   y ≈ 980  两个围栏（羊圈在左、牛圈在右）
 *   y ≈ 1250 菜地
 *   y ≈ 1800 厨房与商店
 *   x ≈ 1410 主路
 */
import Phaser from 'phaser';
import { BaseWorldScene, type Interactable } from '../game/BaseWorldScene';
import { DEPTH } from '../game/GameConfig';
import { store } from '../game/GameState';
import { bus, EV } from '../game/EventBus';
import { Animal, type AnimalWorld } from '../entities/Animal';
import { audio } from '../systems/AudioSystem';
import { itemDef, customerById } from '../data/catalog';
import { ART_K } from '../systems/TextureFactory';

interface GroundEgg {
  sprite: Phaser.GameObjects.Image;
  kind: 'egg' | 'egg_color' | 'egg_gold';
  expire: number;
  item: Interactable;
}

const WORLD_W = 2400;
const WORLD_H = 1900;
const GARDEN = { x: 900, y: 1250, w: 420, h: 360 };
const RUG = { x: 1750, y: 1650 };

export class RanchScene extends BaseWorldScene {
  private animals: Animal[] = [];
  private animalWorld!: AnimalWorld;
  private eggs: GroundEgg[] = [];
  private placing: string | null = null;
  private ghost?: Phaser.GameObjects.Image;
  private decorSprites: Phaser.GameObjects.Image[] = [];
  private customerSprites: Phaser.GameObjects.GameObject[] = [];
  private buildings: Record<string, Phaser.GameObjects.Image> = {};
  private unsubscribe?: () => void;
  private decorSignature = '';
  private orderSignature = '';

  constructor() {
    super('Ranch');
  }

  protected override resetRun(): void {
    this.animals = [];
    this.eggs = [];
    this.decorSprites = [];
    this.customerSprites = [];
    this.buildings = {};
    this.placing = null;
    this.ghost = undefined;
    this.decorSignature = '';
    this.orderSignature = '';
  }

  create(): void {
    bus.emit('ui:scene', 'Ranch');
    this.createWorld({ width: WORLD_W, height: WORLD_H, ground: 'grass', playerStart: { x: 1410, y: 1560 } });

    this.drawLandscape();
    this.buildBuildings();
    this.spawnDecorations();
    this.spawnAnimals();
    this.buildInteractables();
    this.refreshCustomers();

    this.unsubscribe = store.subscribe(() => this.onStateChanged());
    bus.on('decor:place', this.beginPlacing, this);
    bus.on('decor:cancel', this.cancelPlacing, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      bus.off('decor:place', this.beginPlacing, this);
      bus.off('decor:cancel', this.cancelPlacing, this);
    });

    this.time.delayedCall(500, () => {
      if (!store.data.tutorialDone.includes('welcome')) {
        store.markTutorial('welcome');
        bus.emit(EV.hint, '用方向键 / WASD 走路，靠近后按空格或直接点击来互动！');
      }
    });
  }

  private onStateChanged(): void {
    const decorSig = store.data.decorations.map((d) => d.uid).join(',');
    if (decorSig !== this.decorSignature) {
      this.decorSignature = decorSig;
      this.refreshDecorations();
    }
    const orderSig = store.data.orders.map((o) => o.id).join(',');
    if (orderSig !== this.orderSignature) {
      this.orderSignature = orderSig;
      this.refreshCustomers();
    }
  }

  /* ------------------------------------------------------------------ */
  /* 场景搭建                                                            */
  /* ------------------------------------------------------------------ */

  private drawLandscape(): void {
    const g = this.add.graphics().setDepth(DEPTH.path);

    const roads: Array<{ points: number[]; outer: number; inner: number }> = [
      { points: [1410, 1900, 1410, 1500, 1420, 1150, 1520, 950, 1720, 800, 1950, 700, 2160, 620], outer: 56, inner: 44 },
      { points: [1410, 1120, 1250, 950, 1080, 800, 960, 690], outer: 40, inner: 30 },
      { points: [1410, 1860, 1100, 1860, 800, 1850, 480, 1830], outer: 40, inner: 30 },
      { points: [1410, 1860, 1750, 1855, 2020, 1840], outer: 40, inner: 30 },
    ];
    roads.forEach(({ points, outer }) => {
      new Phaser.Curves.Spline(points).getPoints(80).forEach((p) => g.fillStyle(0xdcc09a, 1).fillCircle(p.x, p.y, outer));
    });
    roads.forEach(({ points, inner }) => {
      new Phaser.Curves.Spline(points).getPoints(80).forEach((p) => g.fillStyle(0xe8d2b3, 1).fillCircle(p.x, p.y, inner));
    });

    // 菜地：翻好的土
    this.add
      .tileSprite(GARDEN.x, GARDEN.y, GARDEN.w, GARDEN.h, 'tex/dirt')
      .setOrigin(0, 0)
      .setDepth(DEPTH.path + 1)
      .setAlpha(0.96);
    g.lineStyle(8, 0x8a5a30, 0.5).strokeRoundedRect(GARDEN.x, GARDEN.y, GARDEN.w, GARDEN.h, 26);

    // 羊圈 / 牛圈栅栏
    const pen = (x1: number, y1: number, x2: number, y2: number) => {
      this.drawFence(x1, y1, x2, y1);
      this.drawFence(x1, y2, x2, y2);
      this.drawFence(x1, y1, x1, y2);
      this.drawFence(x2, y1, x2, y2);
    };
    pen(350, 980, 850, 1380);
    pen(1500, 980, 1950, 1380);

    const trees: Array<[number, number, number]> = [
      [120, 950, 1.6], [210, 1280, 1.5], [2200, 980, 1.6], [2290, 1300, 1.5],
      [1200, 200, 1.5], [560, 210, 1.4], [1980, 210, 1.5], [2320, 1720, 1.5],
      [110, 1720, 1.5], [620, 1520, 1.3], [1320, 1760, 1.25], [2020, 1480, 1.45],
      [1180, 700, 1.1], [220, 700, 1.2],
    ];
    trees.forEach(([x, y, s]) => {
      const t = this.addArt('props/tree', x, y, s);
      this.obstacles.create(x, y - 20, 'tex/dot').setVisible(false).setDisplaySize(64 * s, 44).refreshBody();
      this.tweens.add({
        targets: t,
        angle: Phaser.Math.FloatBetween(-1.2, 1.2),
        duration: Phaser.Math.Between(2600, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const bushes: Array<[number, number, number]> = [
      [520, 660, 1.1], [760, 1220, 1], [1080, 700, 1.1], [1300, 1450, 1],
      [1830, 1450, 1], [2180, 780, 1.1], [340, 1120, 1], [1000, 1680, 1], [2060, 1680, 1], [640, 900, 1],
    ];
    bushes.forEach(([x, y, s]) => {
      const b = this.addArt('props/bush', x, y, s);
      this.tweens.add({ targets: b, angle: -1.5, duration: Phaser.Math.Between(2000, 3400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    for (let i = 0; i < 34; i += 1) {
      const x = Phaser.Math.Between(80, WORLD_W - 80);
      const y = Phaser.Math.Between(140, WORLD_H - 120);
      const inPen = (x > 330 && x < 870 && y > 960 && y < 1400) || (x > 1480 && x < 1970 && y > 960 && y < 1400);
      const inGarden = x > GARDEN.x - 40 && x < GARDEN.x + GARDEN.w + 40 && y > GARDEN.y - 40 && y < GARDEN.y + GARDEN.h + 40;
      const onRoad = Math.abs(x - 1410) < 90;
      if (inPen || inGarden || onRoad) continue;
      const f = this.addArt('props/flower', x, y, Phaser.Math.FloatBetween(0.6, 0.95));
      f.setTint([0xff9cc1, 0xffd45c, 0xa97be0, 0xffffff][i % 4]);
      this.tweens.add({
        targets: f,
        angle: Phaser.Math.FloatBetween(-3, 3),
        duration: Phaser.Math.Between(1600, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 客人接待区
    this.add.image(RUG.x, RUG.y, 'tex/rug').setDepth(DEPTH.path + 2).setScale(1.1);
    this.addArt('props/crate', RUG.x + 150, RUG.y - 90, 0.8);
    this.addArt('props/crate', RUG.x - 160, RUG.y - 70, 0.7);
  }

  private drawFence(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.round(dist / 120));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      this.addArt('props/fence', Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t), 0.95);
    }
  }

  private buildBuildings(): void {
    const list: Array<{ key: string; x: number; y: number; s: number }> = [
      { key: 'props/cottage', x: 280, y: 620, s: 1 },
      { key: 'props/coop', x: 900, y: 620, s: 1.05 },
      { key: 'props/barn', x: 1560, y: 620, s: 1.05 },
      { key: 'props/warehouse', x: 2160, y: 620, s: 1 },
      { key: 'props/kitchen', x: 300, y: 1800, s: 1 },
      { key: 'props/shop', x: 2100, y: 1800, s: 1 },
    ];
    list.forEach((b) => {
      const img = this.addBuilding(b.key, b.x, b.y, b.s);
      this.buildings[b.key] = img;
    });

    this.addArt('props/well', 1720, 880, 1.1);
    this.obstacles.create(1720, 850, 'tex/dot').setVisible(false).setDisplaySize(130, 60).refreshBody();
    this.addArt('props/sign', 930, 1320, 0.95);
  }

  private spawnDecorations(): void {
    this.decorSignature = store.data.decorations.map((d) => d.uid).join(',');
    store.data.decorations.forEach((d) => this.createDecorSprite(d.uid, d.itemId, d.x, d.y));
    this.registerDecorInteractions();
  }

  private decorScale(itemId: string): number {
    return itemId === 'pond' || itemId === 'path' || itemId === 'fence' ? 1 : 0.85;
  }

  private createDecorSprite(uid: string, itemId: string, x: number, y: number): void {
    const img = this.addArt(itemDef(itemId).icon, x, y, this.decorScale(itemId));
    img.setData('uid', uid);
    this.decorSprites.push(img);
  }

  private refreshDecorations(): void {
    this.decorSprites = this.decorSprites.filter((s) => {
      if (!store.data.decorations.some((d) => d.uid === s.getData('uid'))) {
        s.destroy();
        return false;
      }
      return true;
    });
    const known = new Set(this.decorSprites.map((s) => s.getData('uid') as string));
    store.data.decorations.forEach((d) => {
      if (known.has(d.uid)) return;
      this.createDecorSprite(d.uid, d.itemId, d.x, d.y);
    });
    this.registerDecorInteractions();
  }

  private registerDecorInteractions(): void {
    this.decorSprites.forEach((s) => {
      if (s.getData('interactive')) return;
      s.setData('interactive', true);
      const uid = s.getData('uid') as string;
      s.setInteractive({ useHandCursor: true });
      s.on('pointerdown', () => {
        if (store.tool !== 'hand') return;
        store.removeDecoration(uid);
        audio.play('pickup');
        this.floatText(s.x, s.y - 40, '收回装饰', '#3b2a1d');
      });
    });
  }

  private spawnAnimals(): void {
    this.animalWorld = {
      homes: {
        chicken: { x: 720, y: 680, w: 620, h: 280 },
        sheep: { x: 380, y: 1000, w: 450, h: 350 },
        cow: { x: 1520, y: 1000, w: 410, h: 350 },
      },
      shelter: {
        chicken: { x: 900, y: 700 },
        sheep: { x: 470, y: 1030 },
        cow: { x: 1600, y: 1040 },
      },
      feedTrough: store.data.owned.includes('colorful_trough') ? { x: 1120, y: 800 } : undefined,
      waterTrough: store.data.owned.includes('star_trough') ? { x: 1260, y: 850 } : undefined,
      onProduce: (a) => this.onAnimalProduce(a),
    };

    store.data.animals.forEach((data) => {
      const animal = new Animal(this, data, this.animalWorld);
      this.animals.push(animal);
      const item: Interactable = {
        id: `animal_${data.id}`,
        x: data.x,
        y: data.y,
        radius: 130,
        icon: 'ui/hand',
        label: '摸摸它',
        action: () => this.animalInteract(animal),
      };
      this.addInteractable(item, animal.hitArea);
      animal.body.setData('interactable', item);
    });
  }

  private animalInteract(animal: Animal): void {
    const a = animal.data;
    const tool = store.tool;

    if (tool === 'feed') {
      if (store.feed(a.id)) {
        animal.react('fed');
        this.player.playAction('feed');
        this.floatText(a.x, a.y - 104, '真好吃！', '#3b2a1d', 'ui/feed');
      } else {
        this.needFeedHint();
      }
      return;
    }
    if (tool === 'water') {
      store.wash(a.id);
      animal.react('washed');
      this.player.playAction('water');
      this.floatText(a.x, a.y - 104, '洗干净啦', '#3b7ea1');
      return;
    }
    if (tool === 'bucket' && a.species === 'cow') {
      audio.play('open');
      this.gotoScene('Barn');
      return;
    }
    if ((tool === 'bucket' || tool === 'basket') && a.produceReady) {
      const result = store.collectProduce(a.id);
      if (result === 'need_brush') {
        this.floatText(a.x, a.y - 104, '需要羊毛刷（商店有卖）', '#b1553f');
        audio.play('error');
        return;
      }
      if (result) {
        animal.react('collected');
        this.player.playAction('harvest');
        this.sparkle(a.x, a.y - 70);
        return;
      }
    }
    if (a.produceReady) {
      const hint = a.species === 'cow' ? '用牛奶桶挤奶' : a.species === 'sheep' ? '用羊毛刷梳毛' : '可以捡蛋';
      this.floatText(a.x, a.y - 104, hint, '#b1553f');
      return;
    }
    store.pet(a.id);
    animal.react('petted');
    this.player.playAction('pet');
    this.floatText(a.x, a.y - 104, a.friendship >= 5 ? '最喜欢你了！' : '好开心', '#e0567f', 'ui/heart');
  }

  private needFeedHint(): void {
    this.player.bubble('ui/feed');
    bus.emit(EV.hint, '饲料用完了，可以去商店买哦');
    audio.play('error');
  }

  private buildInteractables(): void {
    this.addInteractable(
      {
        id: 'home',
        x: 280,
        y: 620,
        radius: 230,
        icon: 'ui/clock',
        label: '回家睡一觉',
        action: () => bus.emit(EV.openPanel, { name: 'sleep' }),
      },
      this.buildings['props/cottage'],
    );

    this.addInteractable(
      {
        id: 'coop_entrance',
        x: 900,
        y: 660,
        radius: 190,
        icon: 'props/egg',
        label: '进鸡舍捡鸡蛋',
        action: () => {
          audio.play('open');
          this.gotoScene('ChickenCoop');
        },
      },
      this.buildings['props/coop'],
    );

    this.addInteractable(
      {
        id: 'barn_entrance',
        x: 1560,
        y: 660,
        radius: 200,
        icon: 'ui/bucket',
        label: '去牛棚挤牛奶',
        action: () => {
          audio.play('open');
          this.gotoScene('Barn');
        },
      },
      this.buildings['props/barn'],
    );

    this.addInteractable({
      id: 'garden_entrance',
      x: GARDEN.x + GARDEN.w / 2,
      y: GARDEN.y + GARDEN.h / 2,
      radius: 260,
      icon: 'ui/seed',
      label: '去菜地种菜',
      action: () => {
        audio.play('open');
        this.gotoScene('Garden');
      },
    });

    this.addInteractable({
      id: 'well',
      x: 1720,
      y: 900,
      radius: 170,
      icon: 'ui/water',
      label: '打水（装满水壶）',
      action: () => {
        audio.play('water');
        this.player.playAction('water');
        this.sparkle(1720, 820, 0x8fd3f4, 12);
        this.floatText(1720, 760, '水壶装满啦', '#3b7ea1');
      },
    });

    this.addInteractable(
      {
        id: 'warehouse',
        x: 2160,
        y: 660,
        radius: 200,
        icon: 'ui/bag',
        label: '打开仓库（背包）',
        action: () => bus.emit(EV.openPanel, { name: 'bag' }),
      },
      this.buildings['props/warehouse'],
    );

    this.addInteractable(
      {
        id: 'kitchen',
        x: 300,
        y: 1820,
        radius: 220,
        icon: 'food/corn_soup',
        label: '去厨房做料理',
        action: () => bus.emit(EV.openPanel, { name: 'kitchen' }),
      },
      this.buildings['props/kitchen'],
    );

    this.addInteractable(
      {
        id: 'shop',
        x: 2100,
        y: 1820,
        radius: 220,
        icon: 'ui/gear',
        label: '逛商店',
        action: () => bus.emit(EV.openPanel, { name: 'shop' }),
      },
      this.buildings['props/shop'],
    );

    this.addInteractable({
      id: 'guests',
      x: RUG.x,
      y: RUG.y,
      radius: 210,
      icon: 'ui/order',
      label: '看看客人的订单',
      action: () => bus.emit(EV.openPanel, { name: 'orders' }),
    });
  }

  private refreshCustomers(): void {
    this.customerSprites.forEach((s) => s.destroy());
    this.customerSprites = [];
    const spots = [
      { x: RUG.x - 90, y: RUG.y - 10 },
      { x: RUG.x + 96, y: RUG.y + 20 },
      { x: RUG.x + 6, y: RUG.y - 96 },
    ];
    store.data.orders.slice(0, 3).forEach((order, i) => {
      const def = customerById(order.customerId);
      const spot = spots[i];
      const base = this.add
        .image(spot.x, spot.y, `characters/${def.character}`)
        .setOrigin(0.5, 1)
        .setScale(0.78 * ART_K)
        .setDepth(DEPTH.sortedBase + spot.y);
      const hat = this.add
        .image(spot.x, spot.y, def.hat)
        .setOrigin(0.5, 1)
        .setScale(0.78 * ART_K)
        .setDepth(DEPTH.sortedBase + spot.y + 0.1);
      const bubble = this.add.ellipse(spot.x, spot.y - 150, 70, 62, 0xfffdf5, 0.94).setStrokeStyle(5, 0x5a3d2e, 0.9).setDepth(DEPTH.bubble);
      const icon = this.add.image(spot.x, spot.y - 150, itemDef(order.request[0].item).icon).setScale(0.5 * ART_K).setDepth(DEPTH.bubble + 0.1);
      this.tweens.add({ targets: [bubble, icon], y: '-=8', duration: 1100 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: [base, hat], scaleY: 0.77 * ART_K, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.customerSprites.push(base, hat, bubble, icon);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 动物在牧场里下蛋                                                    */
  /* ------------------------------------------------------------------ */

  private onAnimalProduce(animal: Animal): void {
    if (animal.data.species !== 'chicken') return;
    if (this.eggs.length >= 6) return;
    const kind: GroundEgg['kind'] = Math.random() < 0.08 ? 'egg_gold' : Math.random() < 0.25 ? 'egg_color' : 'egg';
    const sprite = this.add
      .image(animal.x, animal.y + 4, `props/${kind}`)
      .setOrigin(0.5, 0.9)
      .setScale(0.2 * ART_K)
      .setDepth(DEPTH.sortedBase + animal.y - 1);
    this.tweens.add({ targets: sprite, scaleX: 0.5 * ART_K, scaleY: 0.5 * ART_K, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const item: Interactable = {
      id: `egg_${Math.random().toString(36).slice(2, 8)}`,
      x: sprite.x,
      y: sprite.y,
      radius: 120,
      icon: 'ui/basket',
      label: '捡起来',
      action: () => undefined,
    };
    const egg: GroundEgg = { sprite, kind, expire: this.time.now + 180000, item };
    item.action = () => this.pickEgg(egg);
    this.eggs.push(egg);
    this.addInteractable(item, sprite);
    animal.data.produceReady = false;
    animal.data.lastProduceAt = store.absoluteMinute;
    this.sparkle(sprite.x, sprite.y - 10, 0xfff0b8, 6);
  }

  private pickEgg(egg: GroundEgg): void {
    if (!this.eggs.includes(egg)) return;
    this.eggs = this.eggs.filter((e) => e !== egg);
    store.collectEgg(egg.kind);
    this.sparkle(egg.sprite.x, egg.sprite.y - 10, 0xfff0b8, 8);
    this.floatText(egg.sprite.x, egg.sprite.y - 24, `+1 ${itemDef(egg.kind).name}`, '#3b2a1d', itemDef(egg.kind).icon);
    this.player.playAction('pickup');
    this.interactables = this.interactables.filter((i) => i !== egg.item);
    egg.sprite.destroy();
  }

  /* ------------------------------------------------------------------ */
  /* 装饰摆放模式                                                        */
  /* ------------------------------------------------------------------ */

  beginPlacing(itemId: string): void {
    this.placing = itemId;
    this.ghost?.destroy();
    this.ghost = this.add
      .image(1410, 1500, itemDef(itemId).icon)
      .setOrigin(0.5, 1)
      .setScale(this.decorScale(itemId) * ART_K)
      .setAlpha(0.72)
      .setDepth(DEPTH.bubble)
      .setVisible(false);
    bus.emit(EV.hint, '点击草地放下装饰吧（再点一次快捷栏可以取消）');
  }

  cancelPlacing(): void {
    this.placing = null;
    this.ghost?.destroy();
    this.ghost = undefined;
  }

  /* ------------------------------------------------------------------ */
  /* 主循环                                                              */
  /* ------------------------------------------------------------------ */

  update(time: number, delta: number): void {
    this.updateWorld(time, delta);
    const hour = store.data.minutes / 60;
    this.animals.forEach((a) => {
      a.update(delta, this.player.x, this.player.y, hour);
      const item = a.body.getData('interactable') as Interactable | undefined;
      if (item) {
        item.x = a.x;
        item.y = a.y;
      }
    });

    if (this.placing && this.ghost) {
      const p = this.input.activePointer;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      this.ghost.setPosition(world.x, world.y).setVisible(true);
      this.ghost.setDepth(DEPTH.sortedBase + world.y);
    }

    this.eggs = this.eggs.filter((e) => {
      if (this.time.now > e.expire) {
        this.interactables = this.interactables.filter((i) => i !== e.item);
        e.sprite.destroy();
        return false;
      }
      return true;
    });

    this.sky.update(delta);
  }

  /** 装饰摆放模式下，点击草地就是"放下装饰" */
  protected override isWalkable(x: number, y: number): boolean {
    if (this.placing) {
      store.placeDecoration(this.placing, Math.round(x), Math.round(y));
      audio.play('plant');
      this.sparkle(x, y - 20, 0xffffff, 8);
      if (store.count(this.placing) <= 0) this.cancelPlacing();
      return false;
    }
    return super.isWalkable(x, y);
  }
}
