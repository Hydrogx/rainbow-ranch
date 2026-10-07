/**
 * 面板：商店 / 背包 / 换装 / 厨房 / 订单 / 设置 / 睡觉确认
 * 全部用 DOM + 内联 SVG 实现，文字清晰、触摸目标大，适合小朋友操作。
 */
import { CROPS, ITEMS, RECIPES, SHOP_CATEGORIES, customerById, itemDef, recipeById, type ShopCategoryId } from '../data/catalog';
import { bus, EV } from '../game/EventBus';
import { store } from '../game/GameState';
import { audio } from '../systems/AudioSystem';
import { el, icon, rawSvg } from './dom';
import { Hud } from './Hud';

type PanelName = 'shop' | 'bag' | 'wardrobe' | 'kitchen' | 'orders' | 'settings' | 'sleep';

export class Panels {
  private hud: Hud;
  private backdrop?: HTMLElement;
  private current: PanelName | null = null;
  private shopTab: ShopCategoryId = 'seed';
  private kitchen = { recipeId: null as string | null, added: [] as string[], phase: 0 };
  private dragging = false;
  private refreshTimer = 0;

  constructor(hud: Hud) {
    this.hud = hud;
    bus.on(EV.openPanel, (payload: { name: PanelName }) => this.open(payload.name));
    bus.on(EV.closePanel, () => this.close());
    bus.on(EV.stateChanged, () => this.scheduleRefresh());
  }

  private scheduleRefresh(): void {
    if (!this.current || this.dragging || this.current === 'kitchen') return;
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      if (this.current && !this.dragging) this.render();
    }, 220);
  }

  open(name: PanelName): void {
    this.current = name;
    if (name === 'kitchen') this.resetKitchen();
    this.render();
    audio.play('open');
  }

  close(): void {
    this.current = null;
    this.backdrop?.remove();
    this.backdrop = undefined;
    audio.play('close');
  }

  private render(): void {
    if (!this.current) return;
    this.backdrop?.remove();
    const backdrop = el('div', 'panel-backdrop');
    const panel = el('div', 'panel');
    panel.appendChild(this.head(this.current));
    const body = el('div', 'panel-body');
    panel.appendChild(body);
    backdrop.appendChild(panel);
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) this.close();
    });
    this.hud.panelsRoot.appendChild(backdrop);
    this.backdrop = backdrop;

    switch (this.current) {
      case 'shop':
        this.renderShop(body);
        break;
      case 'bag':
        this.renderBag(body);
        break;
      case 'wardrobe':
        this.renderWardrobe(body);
        break;
      case 'kitchen':
        this.renderKitchen(body);
        break;
      case 'orders':
        this.renderOrders(body);
        break;
      case 'settings':
        this.renderSettings(body);
        break;
      case 'sleep':
        this.renderSleep(body);
        break;
      default:
        break;
    }

    panel.querySelector('[data-close]')?.addEventListener('click', () => this.close());
  }

  private head(name: PanelName): HTMLElement {
    const titles: Record<PanelName, string> = {
      shop: '彩虹商店',
      bag: '我的背包',
      wardrobe: '换装间',
      kitchen: '烹饪小屋',
      orders: '客人的订单',
      settings: '设置',
      sleep: '回家休息',
    };
    const head = el('div', 'panel-head');
    head.innerHTML = `<h2>${titles[name]}</h2><button class="panel-close" data-close="1">×</button>`;
    return head;
  }

  /* ================================================================== */
  /* 商店                                                                */
  /* ================================================================== */

  private renderShop(body: HTMLElement): void {
    const tabs = el('div', 'tabs');
    SHOP_CATEGORIES.forEach((cat) => {
      const tab = el('button', `tab${this.shopTab === cat.id ? ' active' : ''}`, `${icon(cat.icon, 32)}${cat.name}`);
      tab.addEventListener('click', () => {
        audio.play('click');
        this.shopTab = cat.id;
        this.render();
      });
      tabs.appendChild(tab);
    });
    body.appendChild(tabs);

    const wallet = el('div', 'setting-row');
    wallet.innerHTML = `<span class="grow">我的金币</span>${icon('ui/coin', 30)}<b>${Math.round(store.data.coins)}</b>
      <span style="margin-left:16px">彩虹星星</span>${icon('ui/rainbow_star', 30)}<b>${Math.round(store.data.stars)}</b>`;
    body.appendChild(wallet);

    const cat = SHOP_CATEGORIES.find((c) => c.id === this.shopTab) ?? SHOP_CATEGORIES[0];
    const grid = el('div', 'grid');
    cat.itemIds.forEach((id) => {
      const def = ITEMS[id];
      if (!def) return;
      const owned = store.data.owned.includes(id);
      const locked = !store.isUnlocked(id);
      const card = el('div', `item-card${locked ? ' locked' : ''}${owned && cat.id !== 'seed' ? ' owned' : ''}`);
      card.innerHTML = `
        ${icon(def.icon, 64)}
        <div class="name">${def.name}</div>
        <div class="desc">${def.desc}</div>
        <div class="price">${icon('ui/coin', 26)}${def.price}</div>
      `;
      const btn = el('button', 'big-btn green');
      if (locked) {
        btn.textContent = `需要 ${def.unlockStars} 颗星星`;
        btn.disabled = true;
      } else if (owned && cat.id !== 'seed' && cat.id !== 'decor') {
        btn.textContent = '已经拥有';
        btn.disabled = true;
      } else {
        btn.textContent = owned ? '再买一个' : '买下它';
        btn.disabled = store.data.coins < def.price;
        btn.addEventListener('click', () => {
          const result = store.buy(id);
          if (!result.ok) {
            audio.play('error');
            this.hud.toast('ui/gear', result.reason ?? '买不了');
          }
          this.render();
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ================================================================== */
  /* 背包                                                                */
  /* ================================================================== */

  private renderBag(body: HTMLElement): void {
    const entries = Object.entries(store.data.inventory).filter(([, n]) => n > 0);
    if (!entries.length) {
      body.appendChild(el('div', 'inv-empty', '背包空空的，去收集一些东西吧！'));
    } else {
      const grid = el('div', 'inv-grid');
      entries
        .sort((a, b) => itemDef(a[0]).category.localeCompare(itemDef(b[0]).category))
        .forEach(([id, n]) => {
          const def = itemDef(id);
          const cell = el('div', 'inv-cell');
          cell.innerHTML = `${icon(def.icon, 46)}<span>${def.name}</span><b>×${n}</b>`;
          grid.appendChild(cell);
        });
      body.appendChild(grid);
    }

    const stats = store.data.stats;
    const info = el('div', 'setting-row');
    info.innerHTML = `<span class="grow">已捡鸡蛋 ${stats.eggs} · 收获蔬菜 ${stats.harvests} · 完成订单 ${stats.orders} · 做好料理 ${stats.cooked} · 抚摸动物 ${stats.pets}</span>`;
    body.appendChild(info);

    const tip = el('div', 'inv-empty', '小提示：点击物品栏里的"装饰"可以把买到的装饰摆到草地上～');
    body.appendChild(tip);
  }

  /* ================================================================== */
  /* 换装                                                                */
  /* ================================================================== */

  private renderWardrobe(body: HTMLElement): void {
    const preview = el('div', 'wardrobe-preview');
    preview.innerHTML = Hud.wardrobePreview();
    body.appendChild(preview);

    const slots: Array<{ key: 'hat' | 'top' | 'shoes' | 'backpack' | 'accessory'; name: string; ids: string[] }> = [
      { key: 'hat', name: '帽子', ids: ['hat_straw', 'hat_rain', 'hat_chef'] },
      { key: 'top', name: '上衣', ids: ['overalls', 'raincoat'] },
      { key: 'shoes', name: '鞋子', ids: ['boots', 'sneakers'] },
      { key: 'backpack', name: '背包', ids: ['backpack'] },
      { key: 'accessory', name: '发饰', ids: ['ears', 'hairpin', 'scarf'] },
    ];

    slots.forEach((slot) => {
      const row = el('div', 'slot-row');
      row.appendChild(el('h3', undefined, slot.name));
      const owns = slot.ids.filter((id) => store.data.owned.includes(id));
      if (!owns.length) {
        row.appendChild(el('span', undefined, '<i style="color:#7a5a45">还没有这类装扮，去商店买吧</i>'));
      }
      owns.forEach((id) => {
        const active = store.data.equipped[slot.key] === id;
        const chip = el('button', `ing-chip${active ? ' done' : ''}`, `${icon(ITEMS[id].icon, 34)}${ITEMS[id].name}`);
        chip.addEventListener('click', () => {
          store.equip(id, slot.key);
          audio.play('pop');
          this.render();
        });
        row.appendChild(chip);
      });
      if (store.data.equipped[slot.key]) {
        const off = el('button', 'big-btn', '取下');
        off.addEventListener('click', () => {
          store.equip(null, slot.key);
          audio.play('click');
          this.render();
        });
        row.appendChild(off);
      }
      body.appendChild(row);
    });
  }

  /* ================================================================== */
  /* 厨房                                                                */
  /* ================================================================== */

  private resetKitchen(): void {
    this.kitchen = { recipeId: null, added: [], phase: 0 };
  }

  private renderKitchen(body: HTMLElement): void {
    const wrap = el('div', 'kitchen-wrap');
    const list = el('div', 'recipe-list');

    RECIPES.forEach((recipe) => {
      const locked = (recipe.unlockStars ?? 0) > store.data.stars;
      const row = el('div', `recipe-row${this.kitchen.recipeId === recipe.id ? ' active' : ''}${locked ? ' locked' : ''}`);
      row.innerHTML = `${icon(recipe.icon, 44)}<span>${recipe.name}</span><span class="hint">${
        locked ? `需要 ${recipe.unlockStars} ★` : recipe.hint
      }</span>`;
      row.addEventListener('click', () => {
        if (locked) {
          audio.play('error');
          this.hud.toast('ui/rainbow_star', `还需要 ${recipe.unlockStars} 颗彩虹星星`);
          return;
        }
        audio.play('click');
        this.kitchen = { recipeId: recipe.id, added: [], phase: 0 };
        this.render();
      });
      list.appendChild(row);
    });
    wrap.appendChild(list);

    const stage = el('div', 'cook-stage');
    const recipe = this.kitchen.recipeId ? recipeById(this.kitchen.recipeId) : undefined;

    if (!recipe) {
      stage.innerHTML = `<div class="pot"><div class="contents">${icon('food/corn_soup', 60)}</div></div>
        <div class="inv-empty">先在左边选一个想做的料理吧！</div>`;
      wrap.appendChild(stage);
      body.appendChild(wrap);
      return;
    }

    const contents = this.kitchen.added.map((id) => icon(itemDef(id).icon, 40)).join('');
    stage.innerHTML = `<div class="pot${this.kitchen.phase === 2 ? ' hot' : ''}"><div class="contents">${
      contents || icon('food/milk', 40)
    }</div></div>`;

    const dots = el('div', 'step-dots');
    ['放材料', '搅拌', '加热', '装盘'].forEach((_, i) => {
      dots.appendChild(el('div', `step-dot${this.kitchen.phase > i ? ' on' : ''}`));
    });
    stage.appendChild(dots);

    const ingredients = el('div', 'ingredients');
    Object.entries(recipe.ingredients).forEach(([id, need]) => {
      const have = store.count(id);
      const addedTimes = this.kitchen.added.filter((x) => x === id).length;
      const done = addedTimes >= need;
      const chip = el('div', `ing-chip${done ? ' done' : ''}`);
      chip.innerHTML = `${icon(itemDef(id).icon, 34)}${itemDef(id).name} ${addedTimes}/${need}（有 ${have}）`;
      chip.addEventListener('click', () => this.addIngredient(id));
      chip.addEventListener('pointerdown', (ev: PointerEvent) => this.startDrag(ev, id, chip));
      ingredients.appendChild(chip);
    });
    stage.appendChild(ingredients);

    const actions = el('div', 'cook-actions');
    const stepNames = ['搅拌', '加热', '装盘'];
    stepNames.forEach((label, i) => {
      const needAll = Object.entries(recipe.ingredients).every(([id, n]) => this.kitchen.added.filter((x) => x === id).length >= n);
      const enabled = this.kitchen.phase === i + 1 && needAll;
      const btn = el('button', `big-btn${i === 0 ? ' blue' : i === 1 ? ' pink' : ' green'}`, label);
      btn.disabled = !enabled;
      btn.addEventListener('click', () => this.advanceCooking(i + 1));
      actions.appendChild(btn);
    });
    const reset = el('button', 'big-btn', '重来');
    reset.addEventListener('click', () => {
      audio.play('click');
      this.resetKitchen();
      this.kitchen.recipeId = recipe.id;
      this.render();
    });
    actions.appendChild(reset);
    stage.appendChild(actions);

    if (this.kitchen.phase === 4) {
      stage.appendChild(el('div', 'inv-empty', `${recipe.name} 做好啦！已经放进背包 ✨`));
    } else if (this.kitchen.phase === 0) {
      stage.appendChild(el('div', 'inv-empty', '点一下材料（或把它拖进锅里）就能放进去'));
    }

    wrap.appendChild(stage);
    body.appendChild(wrap);
  }

  private addIngredient(id: string): void {
    const recipe = this.kitchen.recipeId ? recipeById(this.kitchen.recipeId) : undefined;
    if (!recipe || this.kitchen.phase !== 0) return;
    const need = recipe.ingredients[id] ?? 0;
    const added = this.kitchen.added.filter((x) => x === id).length;
    if (added >= need) return;
    if (store.count(id) < added + 1) {
      audio.play('error');
      this.hud.toast(itemDef(id).icon, `没有更多${itemDef(id).name}了`);
      return;
    }
    this.kitchen.added.push(id);
    audio.play('pop');
    const allAdded = Object.entries(recipe.ingredients).every(([key, n]) => this.kitchen.added.filter((x) => x === key).length >= n);
    if (allAdded) this.kitchen.phase = 1;
    this.render();
  }

  private startDrag(ev: PointerEvent, id: string, chip: HTMLElement): void {
    const recipe = this.kitchen.recipeId ? recipeById(this.kitchen.recipeId) : undefined;
    if (!recipe || this.kitchen.phase !== 0) return;
    ev.preventDefault();
    this.dragging = true;
    const ghost = el('div', 'ing-chip', chip.innerHTML);
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '99';
    ghost.style.left = `${ev.clientX - 40}px`;
    ghost.style.top = `${ev.clientY - 20}px`;
    document.body.appendChild(ghost);

    const move = (e: PointerEvent) => {
      ghost.style.left = `${e.clientX - 40}px`;
      ghost.style.top = `${e.clientY - 20}px`;
      const pot = document.querySelector('.pot') as HTMLElement | null;
      if (pot) {
        const r = pot.getBoundingClientRect();
        const over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
        pot.classList.toggle('hot', over);
      }
    };
    const up = (e: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      ghost.remove();
      this.dragging = false;
      const pot = document.querySelector('.pot') as HTMLElement | null;
      if (pot) {
        const r = pot.getBoundingClientRect();
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) this.addIngredient(id);
        pot.classList.remove('hot');
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  private advanceCooking(step: number): void {
    if (this.kitchen.phase !== step) return;
    const recipe = this.kitchen.recipeId ? recipeById(this.kitchen.recipeId) : undefined;
    if (!recipe) return;
    if (step < 3) {
      this.kitchen.phase = step + 1;
      audio.play(step === 1 ? 'pop' : 'cook');
      this.render();
      return;
    }
    const result = store.cook(recipe.id);
    if (!result.ok) {
      audio.play('error');
      this.hud.toast('ui/gear', result.reason ?? '还差一点材料');
      return;
    }
    audio.play('cheer');
    this.kitchen.phase = 4;
    this.render();
  }

  /* ================================================================== */
  /* 订单                                                                */
  /* ================================================================== */

  private renderOrders(body: HTMLElement): void {
    if (!store.data.orders.length) {
      body.appendChild(el('div', 'inv-empty', '现在没有客人，休息一下，或者去照顾小动物吧！'));
      return;
    }
    const grid = el('div', 'order-grid');
    store.data.orders.forEach((order) => {
      const def = customerById(order.customerId);
      const card = el('div', 'order-card');
      const canDeliver = store.hasAll(order.request);
      const reqs = order.request
        .map((r) => {
          const enough = store.count(r.item) >= r.quantity;
          return `<span class="req${enough ? '' : ' lack'}">${icon(itemDef(r.item).icon, 34)}${itemDef(r.item).name} ×${r.quantity}
            <small>（有 ${store.count(r.item)}）</small></span>`;
        })
        .join('');
      card.innerHTML = `
        <div class="order-head">
          <span class="avatar">${rawSvg(`characters/${def.character}`, 'svg-icon')}</span>
          <span>${def.name}<br /><small style="font-size:0.7em;color:#7a5a45">${def.kind}</small></span>
        </div>
        <div style="font-size:calc(19px * var(--ui-scale));color:#7a5a45">“${def.line}”</div>
        <div class="order-request">${reqs}</div>
        <div class="order-reward">
          <span class="r">${icon('ui/coin', 30)}${order.reward.coins}</span>
          <span class="r">${icon('ui/rainbow_star', 30)}${order.reward.stars}</span>
        </div>
      `;
      const btn = el('button', 'big-btn green', canDeliver ? '交给客人' : '还差一些材料');
      btn.disabled = !canDeliver;
      btn.addEventListener('click', () => {
        if (store.deliverOrder(order.id)) {
          this.hud.toast('ui/heart', `${def.name}：${def.thanks}`);
          bus.emit(EV.sfx, 'cheer');
        }
        this.render();
      });
      card.appendChild(btn);

      const skip = el('button', 'big-btn', '这单先不要');
      skip.addEventListener('click', () => {
        store.data.orders = store.data.orders.filter((o) => o.id !== order.id);
        store.ensureOrders();
        store.notify();
        audio.play('click');
        this.render();
      });
      card.appendChild(skip);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ================================================================== */
  /* 设置                                                                */
  /* ================================================================== */

  private renderSettings(body: HTMLElement): void {
    const sound = el('div', 'setting-row');
    sound.innerHTML = `<span class="grow">音效</span><div class="toggle${store.data.settings.sound ? ' on' : ''}"></div>`;
    sound.querySelector('.toggle')?.addEventListener('click', () => {
      store.toggleSound();
      audio.setSound(store.data.settings.sound);
      this.render();
    });
    body.appendChild(sound);

    const music = el('div', 'setting-row');
    music.innerHTML = `<span class="grow">背景音乐</span><div class="toggle${store.data.settings.music ? ' on' : ''}"></div>`;
    music.querySelector('.toggle')?.addEventListener('click', () => {
      store.toggleMusic();
      audio.setMusic(store.data.settings.music);
      this.render();
    });
    body.appendChild(music);

    const help = el('div', 'setting-row');
    help.innerHTML = `<span class="grow">方向键 / WASD 走路 · 空格或点击互动 · 点击地面会自己走过去</span>`;
    body.appendChild(help);

    const saveInfo = el('div', 'setting-row');
    saveInfo.innerHTML = `<span class="grow">进度会自动保存到这台设备上（离线也能继续玩）</span>`;
    body.appendChild(saveInfo);

    const reset = el('button', 'big-btn pink', '重新开始（会清空存档）');
    reset.addEventListener('click', () => {
      const ok = window.confirm('确定要重新开始吗？现在的牧场进度会消失哦。');
      if (!ok) return;
      store.reset(store.data.character);
      this.close();
      bus.emit(EV.gotoScene, 'Ranch');
      bus.emit(EV.toast, { icon: 'ui/rainbow', text: '新牧场开始啦！' });
    });
    body.appendChild(reset);

    const about = el('div', 'inv-empty', '《小小彩虹牧场》· 给 5-8 岁小朋友的温柔牧场游戏 · 没有失败，也没有付费');
    body.appendChild(about);
  }

  /* ================================================================== */
  /* 睡觉                                                                */
  /* ================================================================== */

  private renderSleep(body: HTMLElement): void {
    const now = store.timeString;
    body.appendChild(
      el(
        'div',
        'inv-empty',
        `现在是 ${now}。回小屋睡一觉，就会到第二天早上，作物和小动物也会长大一些。`,
      ),
    );
    const row = el('div', 'cook-actions');
    const yes = el('button', 'big-btn green', '睡一觉到早上');
    yes.addEventListener('click', () => {
      store.sleepToMorning();
      this.close();
      audio.play('cheer');
      this.hud.toast('ui/sun', `新的一天开始啦：第 ${store.data.day} 天`);
    });
    const no = el('button', 'big-btn', '再玩一会儿');
    no.addEventListener('click', () => this.close());
    row.appendChild(yes);
    row.appendChild(no);
    body.appendChild(row);

    const seeds = Object.values(CROPS)
      .filter((c) => store.count(c.seedId) > 0)
      .map((c) => `${c.name}种子×${store.count(c.seedId)}`)
      .join(' · ');
    if (seeds) body.appendChild(el('div', 'inv-empty', `背包里的种子：${seeds}`));
  }
}
