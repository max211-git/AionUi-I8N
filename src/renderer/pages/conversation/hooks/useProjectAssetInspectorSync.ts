/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProjectAssetCategory } from '@/common/projectAssets';
import { useSyncExternalStore } from 'react';

type TProjectAssetInspectorSelection = {
  projectId: string;
  category: ProjectAssetCategory;
  openSequence: number;
};

type TProjectAssetInspectorOpenRequest = Omit<TProjectAssetInspectorSelection, 'openSequence'>;

const listeners = new Set<() => void>();
let selectionState: TProjectAssetInspectorSelection | null = null;
let openSequence = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => selectionState;

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const openProjectAssetInspector = (selection: TProjectAssetInspectorOpenRequest) => {
  openSequence += 1;
  selectionState = { ...selection, openSequence };
  emitChange();
};

export const clearProjectAssetInspector = () => {
  if (!selectionState) {
    return;
  }
  selectionState = null;
  emitChange();
};

export const useProjectAssetInspectorSelection = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const useProjectAssetInspectorState = (projectId?: string) => {
  const selection = useProjectAssetInspectorSelection();
  const isActive = Boolean(selection && projectId && selection.projectId === projectId);

  return {
    selection: isActive ? selection : null,
    isActive,
  };
};
