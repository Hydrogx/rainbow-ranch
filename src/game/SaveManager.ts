/**
 * 存档读写（PRD 第 10 节）
 * - localStorage key: rainbow-ranch-save
 * - 带版本号；损坏/无法解析时返回 null，由上层创建新存档
 */
import type { GameStateData } from './types';

export const SAVE_KEY = 'rainbow-ranch-save';
export const SAVE_VERSION = 1;

export function readRawSave(): unknown {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch (err) {
    console.warn('[save] 存档损坏，将创建新存档', err);
    return null;
  }
}

export function writeSave(data: GameStateData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION, savedAt: Date.now() }));
    return true;
  } catch (err) {
    console.warn('[save] 写入存档失败（可能是隐私模式）', err);
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn('[save] 清除存档失败', err);
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
