/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import {
  clampDesktopSiderWidth,
  DEFAULT_DESKTOP_SIDER_WIDTH,
  MAX_DESKTOP_SIDER_WIDTH,
  MIN_DESKTOP_SIDER_WIDTH,
  readStoredDesktopSiderWidth,
  SIDER_DRAG_SNAP_THRESHOLD,
} from '@/renderer/components/layout/sidebarWidthPolicy';

describe('sidebar width policy', () => {
  it('uses the wider desktop default when there is no stored width', () => {
    expect(readStoredDesktopSiderWidth(null)).toBe(DEFAULT_DESKTOP_SIDER_WIDTH);
  });

  it('clamps stored widths below the supported minimum', () => {
    expect(readStoredDesktopSiderWidth('282')).toBe(MIN_DESKTOP_SIDER_WIDTH);
  });

  it('clamps stored widths above the supported maximum', () => {
    expect(readStoredDesktopSiderWidth(String(MAX_DESKTOP_SIDER_WIDTH + 120))).toBe(MAX_DESKTOP_SIDER_WIDTH);
  });

  it('keeps a valid stored width unchanged', () => {
    expect(readStoredDesktopSiderWidth('400')).toBe(400);
  });

  it('rounds and clamps dragged widths into the allowed desktop range', () => {
    expect(clampDesktopSiderWidth(MIN_DESKTOP_SIDER_WIDTH - 50)).toBe(MIN_DESKTOP_SIDER_WIDTH);
    expect(clampDesktopSiderWidth(455.7)).toBe(456);
    expect(clampDesktopSiderWidth(MAX_DESKTOP_SIDER_WIDTH + 1)).toBe(MAX_DESKTOP_SIDER_WIDTH);
  });

  it('uses a collapse snap threshold below the minimum expanded width', () => {
    expect(SIDER_DRAG_SNAP_THRESHOLD).toBeLessThan(MIN_DESKTOP_SIDER_WIDTH);
  });
});
