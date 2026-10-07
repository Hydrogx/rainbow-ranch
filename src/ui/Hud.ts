/**
 * 顶部状态栏 + 底部快捷栏 + 提示 & 飘字（PRD 第 9 节）
 */
import { ART } from '../assets';
import { itemDef, CROPS } from '../data/catalog';
import { bus, EV } from '../game/EventBus';
import { store } from '../game/GameState';
import type { ToolId } from '../game/types';
import { audio } from '../systems/AudioSystem';
import { badge, el, icon, rawSvg } from './dom';

interface ToolDef {
  id: ToolId;
  icon: string;
  label: string;
  count?: () => number;
  picker?: 'seed' | 'decor';
}

const TOOLS: ToolDef[] = [
  { id: 'hand', icon: 'ui/hand', label: '手' },
  { id: 'feed', icon: 'ui/feed', label: '饲料', count: () => store.count('feed') },
  { id: 'water', icon: 'ui/water', label: '水壶' },
  { id: 'seed', icon: 'ui/seed', label: '种子', count: () => seedTotal(), picker: 'seed' },
  { id: 'bucket', icon: 'ui/bucket', label: '奶桶' },
  { id: 'basket', icon: 'ui/basket', label: '篮子' },
  { id: 'decor', icon: 'ui/decor', label: '装饰', count: () => decorTotal(), picker: 'decor' },
];

const seedTotal = () =>
  Object.keys(CROPS).reduce((sum, id) => sum + store.count(CROPS[id].seedId), 0);

const decorTotal = () =>
  ['path', 'flowers', 'mushroom', 'fence', 'pumpkin_lantern', 'mailbox', 'rainbow_flag', 'birdhouse', 'windmill', 'pond'].reduce(
    (sum, id) => sum + store.count(id),
    0,
  );

export class Hud {
  root: HTMLElement;
  hud: HTMLElement;
  private timeEl!: HTMLElement;
  private dayEl!: HTMLElement;
  private weatherEl!: HTMLElement;
  private coinsEl!: HTMLElement;
  private starsEl!: HTMLElement;
  private hotbarEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private toastRoot!: HTMLElement;
  private panelRoot!: HTMLElement;
  private pickerRoot!: HTMLElement;
  private backBtn!: HTMLButtonElement;
  private ordersBtn!: HTMLButtonElement;
  private hintTimer = 0;
  private lastCoins = -1;
  private lastStars = -1;
  private modalRoot!: HTMLElement;
  private visible = true;

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = el('div', 'hud');
    root.appendChild(this.hud);
    this.build();
    this.bind();
    this.refresh();
  }

  private build(): void {
    const top = el('div', 'hud-top');
    top.innerHTML = `
      <div class="pill" id="pill-time">${icon('ui/clock', 30)}<b></b><small></small></div>
      <div class="pill" id="pill-weather">${icon('ui/sun', 30)}<b></b></div>
      <div class="pill" id="pill-coin">${icon('ui/coin', 30)}<b>0</b></div>
      <div class="pill" id="pill-star">${icon('ui/rainbow_star', 30)}<b>0</b></div>
      <div class="spacer"></div>
      <button class="hud-btn" id="btn-orders" title="客人订单">${icon('ui/order', 40)}</button>
      <button class="hud-btn" id="btn-bag" title="背包">${icon('ui/bag', 40)}</button>
      <button class="hud-btn" id="btn-wardrobe" title="换装">${icon('characters/hat_straw', 40)}</button>
      <button class="hud-btn" id="btn-settings" title="设置">${icon('ui/gear', 40)}</button>
    `;
    this.hud.appendChild(top);

    this.hintEl = el('div', 'hint-bar');
    this.hud.appendChild(this.hintEl);

    const bottom = el('div', 'hud-bottom');
    this.hotbarEl = el('div', 'hotbar');
    bottom.appendChild(this.hotbarEl);
    this.backBtn = el('button', 'back-btn', `${icon('ui/hand', 26)} 返回牧场`);
    bottom.appendChild(this.backBtn);
    this.hud.appendChild(bottom);

    this.toastRoot = el('div');
    this.toastRoot.id = 'toast-root';
    this.hud.appendChild(this.toastRoot);

    this.pickerRoot = el('div');
    this.hud.appendChild(this.pickerRoot);

    this.panelRoot = el('div');
    this.hud.appendChild(this.panelRoot);

    this.modalRoot = el('div');
    this.hud.appendChild(this.modalRoot);

    this.timeEl = top.querySelector('#pill-time b') as HTMLElement;
    this.dayEl = top.querySelector('#pill-time small') as HTMLElement;
    this.weatherEl = top.querySelector('#pill-weather b') as HTMLElement;
    this.coinsEl = top.querySelector('#pill-coin b') as HTMLElement;
    this.starsEl = top.querySelector('#pill-star b') as HTMLElement;
    this.ordersBtn = top.querySelector('#btn-orders') as HTMLButtonElement;

    this.renderHotbar();
  }

  private bind(): void {
    this.hud.querySelector('#btn-orders')?.addEventListener('click', () => {
      audio.play('click');
      bus.emit(EV.openPanel, { name: 'orders' });
    });
    this.hud.querySelector('#btn-bag')?.addEventListener('click', () => {
      audio.play('click');
      bus.emit(EV.openPanel, { name: 'bag' });
    });
    this.hud.querySelector('#btn-wardrobe')?.addEventListener('click', () => {
      audio.play('click');
      bus.emit(EV.openPanel, { name: 'wardrobe' });
    });
    this.hud.querySelector('#btn-settings')?.addEventListener('click', () => {
      audio.play('click');
      bus.emit(EV.openPanel, { name: 'settings' });
    });
    this.backBtn.addEventListener('click', () => {
      audio.play('close');
      bus.emit(EV.gotoScene, 'Ranch');
    });

    bus.on(EV.stateChanged, () => this.refresh());
    bus.on(EV.toolChanged, () => this.renderHotbar());
    bus.on(EV.hint, (text: string) => this.hint(text));
    bus.on(EV.toast, (payload: { icon: string; text: string }) => this.toast(payload.icon, payload.text));
    bus.on('ui:scene', (key: string) => this.setScene(key));
    bus.on('ui:title', (on: boolean) => this.setVisible(!on));
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.hud.classList.toggle('visible', on);
  }

  get panelsRoot(): HTMLElement {
    return this.panelRoot;
  }

  get modalsRoot(): HTMLElement {
    return this.modalRoot;
  }

  setScene(key: string): void {
    this.setVisible(true);
    this.backBtn.classList.toggle('show', key !== 'Ranch' && key !== 'Title');
    this.clearPicker();
  }

  /* ---------------------------------------------------------------- */

  private renderHotbar(): void {
    this.hotbarEl.innerHTML = '';
    TOOLS.forEach((tool) => {
      const slot = el('div', `hotbar-slot${store.tool === tool.id ? ' active' : ''}`);
      slot.dataset.tool = tool.id;
      slot.id = `hotbar-${tool.id}`;
      const count = tool.count ? tool.count() : 0;
      slot.innerHTML = `${icon(tool.icon, 42)}<span class="label">${tool.label}</span>${badge(count)}`;
      slot.addEventListener('click', () => {
        audio.play('click');
        store.setTool(tool.id);
        if (tool.picker === 'seed') store.selectedSeed = store.selectedSeed || 'carrot_seed';
        if (tool.picker) this.showPicker(tool.picker);
        else this.clearPicker();
      });
      this.hotbarEl.appendChild(slot);
    });
  }

  private clearPicker(): void {
    this.pickerRoot.innerHTML = '';
  }

  private showPicker(kind: 'seed' | 'decor'): void {
    this.clearPicker();
    const box = el('div', 'picker');
    const entries: Array<{ id: string; name: string; iconKey: string; active: boolean }> = [];

    if (kind === 'seed') {
      Object.values(CROPS).forEach((crop) => {
        const n = store.count(crop.seedId);
        if (n <= 0) return;
        entries.push({ id: crop.seedId, name: `${crop.name}×${n}`, iconKey: itemDef(crop.seedId).icon, active: store.selectedSeed === crop.seedId });
      });
    } else {
      ['path', 'flowers', 'mushroom', 'fence', 'pumpkin_lantern', 'mailbox', 'rainbow_flag', 'birdhouse', 'windmill', 'pond'].forEach((id) => {
        const n = store.count(id);
        if (n <= 0) return;
        entries.push({ id, name: `${itemDef(id).name}×${n}`, iconKey: itemDef(id).icon, active: false });
      });
    }

    if (!entries.length) {
      box.innerHTML = `<div class="picker-empty">${
        kind === 'seed' ? '还没有种子，去商店买一些吧！' : '还没有装饰品，去商店看看吧！'
      }</div>`;
      this.pickerRoot.appendChild(box);
      return;
    }

    entries.forEach((entry) => {
      const node = el('div', `picker-item${entry.active ? ' active' : ''}`);
      node.innerHTML = `${icon(entry.iconKey, 40)}<span>${entry.name}</span>`;
      node.addEventListener('click', () => {
        audio.play('click');
        if (kind === 'seed') {
          store.selectedSeed = entry.id;
          store.setTool('seed');
          this.clearPicker();
        } else {
          bus.emit('decor:place', entry.id);
          this.clearPicker();
        }
      });
      box.appendChild(node);
    });
    this.pickerRoot.appendChild(box);
  }

  /* ---------------------------------------------------------------- */

  hint(text: string): void {
    this.hintEl.textContent = text;
    this.hintEl.classList.add('show');
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => this.hintEl.classList.remove('show'), 4200);
  }

  toast(iconKey: string, text: string): void {
    const node = el('div', 'toast', `${icon(iconKey, 30)}<span>${text}</span>`);
    this.toastRoot.appendChild(node);
    window.setTimeout(() => node.remove(), 2000);
    while (this.toastRoot.childElementCount > 5) this.toastRoot.firstElementChild?.remove();
  }

  private bump(node: HTMLElement): void {
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
  }

  refresh(): void {
    if (!this.visible) return;
    const data = store.data;
    this.timeEl.textContent = store.timeString;
    this.dayEl.textContent = `第 ${data.day} 天`;
    const weatherIcon = data.weather === 'sunny' ? 'ui/sun' : data.weather === 'cloudy' ? 'ui/cloud' : 'ui/rain';
    const weatherName = data.weather === 'sunny' ? '晴天' : data.weather === 'cloudy' ? '阴天' : '雨天';
    const weatherPill = this.hud.querySelector('#pill-weather') as HTMLElement;
    if (weatherPill.dataset.icon !== weatherIcon) {
      weatherPill.dataset.icon = weatherIcon;
      weatherPill.innerHTML = `${icon(weatherIcon, 32)}<b>${weatherName}</b>`;
      this.weatherEl = weatherPill.querySelector('b') as HTMLElement;
    }
    this.weatherEl.textContent = weatherName;

    const coins = Math.round(data.coins);
    if (coins !== this.lastCoins) {
      this.coinsEl.textContent = String(coins);
      if (this.lastCoins >= 0 && coins !== this.lastCoins) this.bump(this.coinsEl.parentElement as HTMLElement);
      this.lastCoins = coins;
    }
    const stars = Math.round(data.stars);
    if (stars !== this.lastStars) {
      this.starsEl.textContent = String(stars);
      if (this.lastStars >= 0 && stars !== this.lastStars) this.bump(this.starsEl.parentElement as HTMLElement);
      this.lastStars = stars;
    }

    const deliverable = data.orders.filter((o) => store.hasAll(o.request)).length;
    const badgeHtml = deliverable > 0 ? `<span class="badge">${deliverable}</span>` : '';
    if (this.ordersBtn.dataset.count !== String(deliverable)) {
      this.ordersBtn.dataset.count = String(deliverable);
      this.ordersBtn.innerHTML = `${icon('ui/order', 40)}${badgeHtml}`;
      this.ordersBtn.classList.toggle('pulse', deliverable > 0);
    }

    // 快捷栏数量随时更新
    const slots = this.hotbarEl.children;
    TOOLS.forEach((tool, i) => {
      const slot = slots[i] as HTMLElement | undefined;
      if (!slot) return;
      const count = tool.count ? tool.count() : 0;
      const old = slot.querySelector('.badge');
      const html = badge(count);
      if (count > 0 && !old) slot.insertAdjacentHTML('beforeend', html);
      else if (count > 0 && old) old.textContent = String(count);
      else if (count === 0 && old) old.remove();
    });
  }

  /** 角色预览用的分层 SVG（换装界面用） */
  static wardrobePreview(): string {
    const eq = store.data.equipped;
    const isBoy = store.data.character === 'boy';
    // 注意顺序：背包在身体后面，其余装扮叠在身体上面
    const parts: string[] = [];
    if (eq.backpack) parts.push(`<div class="layer">${rawSvg('characters/backpack', 'svg-icon')}</div>`);
    if (isBoy && ART['characters/boy_walk']) {
      // 男孩用像素行走图的站立帧（CSS 裁切出第 2 帧）
      parts.push(`<div class="layer pixel-layer">${rawSvg('characters/boy_walk', 'svg-icon')}</div>`);
    } else {
      parts.push(`<div class="layer">${rawSvg(isBoy ? 'characters/boy' : 'characters/girl', 'svg-icon')}</div>`);
    }
    const overlays: Array<string | undefined> = [
      eq.top ? (eq.top === 'overalls' ? 'characters/overalls' : 'characters/raincoat') : undefined,
      eq.shoes ? (eq.shoes === 'boots' ? 'characters/boots' : 'characters/sneakers') : undefined,
      eq.hat ? (eq.hat === 'hat_straw' ? 'characters/hat_straw' : eq.hat === 'hat_rain' ? 'characters/hat_rain' : 'characters/hat_chef') : undefined,
      eq.accessory ? (eq.accessory === 'ears' ? 'characters/ears' : eq.accessory === 'hairpin' ? 'characters/hairpin' : 'characters/scarf') : undefined,
    ];
    overlays.forEach((key) => {
      if (key) parts.push(`<div class="layer">${rawSvg(key, 'svg-icon')}</div>`);
    });
    return parts.join('');
  }

  static closeButton(): string {
    return `<button class="panel-close" data-close="1">×</button>`;
  }
}
