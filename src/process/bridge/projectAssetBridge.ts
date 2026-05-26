/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IProjectAssetService } from '@process/services/projectAssets';

export function initProjectAssetBridge(projectAssetService: IProjectAssetService): void {
  ipcBridge.projectAssets.list.provider(async ({ projectId, category, query, sort }) => {
    return projectAssetService.listAssets(projectId, category, query, sort);
  });

  ipcBridge.projectAssets.listContextEnabled.provider(async ({ projectId }) => {
    return projectAssetService.listContextEnabledAssets(projectId);
  });

  ipcBridge.projectAssets.refresh.provider(async ({ projectId }) => {
    await projectAssetService.refreshProjectAssets(projectId);
  });

  ipcBridge.projectAssets.setContextEnabled.provider(async ({ projectId, assetId, enabled }) => {
    return projectAssetService.setContextEnabled(projectId, assetId, enabled);
  });

  ipcBridge.projectAssets.remove.provider(async ({ projectId, assetId }) => {
    return projectAssetService.removeAsset(projectId, assetId);
  });
}
