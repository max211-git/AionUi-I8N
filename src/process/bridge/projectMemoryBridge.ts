/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IProjectMemoryService } from '@process/services/projectMemory';

export function initProjectMemoryBridge(projectMemoryService: IProjectMemoryService): void {
  ipcBridge.projectMemory.list.provider(async ({ projectId }) => {
    return projectMemoryService.listEntries(projectId);
  });

  ipcBridge.projectMemory.get.provider(async ({ projectId, entryId }) => {
    return projectMemoryService.getEntry(projectId, entryId);
  });

  ipcBridge.projectMemory.create.provider(async ({ projectId, input }) => {
    return projectMemoryService.createEntry(projectId, input);
  });

  ipcBridge.projectMemory.update.provider(async ({ projectId, entryId, updates }) => {
    return projectMemoryService.updateEntry(projectId, entryId, updates);
  });

  ipcBridge.projectMemory.remove.provider(async ({ projectId, entryId }) => {
    return projectMemoryService.removeEntry(projectId, entryId);
  });

  ipcBridge.projectMemory.getSettings.provider(async ({ projectId }) => {
    return projectMemoryService.getSettings(projectId);
  });

  ipcBridge.projectMemory.updateSettings.provider(async ({ projectId, enabled }) => {
    return projectMemoryService.updateSettings(projectId, { enabled });
  });

  ipcBridge.projectMemory.getSummary.provider(async ({ projectId }) => {
    return projectMemoryService.buildSummary(projectId);
  });
}
