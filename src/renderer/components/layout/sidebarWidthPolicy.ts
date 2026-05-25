/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const DESKTOP_SIDER_WIDTH_STORAGE_KEY = 'layout.desktopSiderWidth';
export const DEFAULT_DESKTOP_SIDER_WIDTH = 320;
export const MIN_DESKTOP_SIDER_WIDTH = 304;
export const MAX_DESKTOP_SIDER_WIDTH = DEFAULT_DESKTOP_SIDER_WIDTH * 2;
export const DESKTOP_COLLAPSED_WIDTH = 72;
export const SIDER_DRAG_SNAP_THRESHOLD = Math.round((MIN_DESKTOP_SIDER_WIDTH + DESKTOP_COLLAPSED_WIDTH) / 2);
export const SIDER_DRAG_HYSTERESIS = 6;

export function clampDesktopSiderWidth(width: number): number {
  return Math.max(MIN_DESKTOP_SIDER_WIDTH, Math.min(MAX_DESKTOP_SIDER_WIDTH, Math.round(width)));
}

export function readStoredDesktopSiderWidth(rawValue: string | null): number {
  const parsed = rawValue ? Number(rawValue) : NaN;
  if (Number.isFinite(parsed)) {
    return clampDesktopSiderWidth(parsed);
  }
  return DEFAULT_DESKTOP_SIDER_WIDTH;
}
