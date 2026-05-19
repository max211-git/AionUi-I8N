/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IProjectService } from '@process/services/ProjectServiceImpl';

export function initProjectBridge(projectService: IProjectService): void {
  const emitListChanged = (projectId: string, action: 'created' | 'updated' | 'deleted') => {
    ipcBridge.project.listChanged.emit({ projectId, action });
  };

  ipcBridge.project.create.provider(async ({ name, rootPath }) => {
    try {
      const created = await projectService.createProject({ name, rootPath });
      emitListChanged(created.id, 'created');
      return created;
    } catch (error) {
      console.error('[projectBridge] Failed to create project:', error);
      throw error;
    }
  });
  ipcBridge.project.list.provider(async () => {
    try {
      return await projectService.listProjects();
    } catch (error) {
      console.error('[projectBridge] Failed to list projects:', error);
      throw error;
    }
  });
  ipcBridge.project.get.provider(async ({ id }) => {
    try {
      return await projectService.getProject(id);
    } catch (error) {
      console.error('[projectBridge] Failed to get project:', error);
      throw error;
    }
  });
  ipcBridge.project.update.provider(async ({ id, updates }) => {
    try {
      const success = await projectService.updateProject(id, updates);
      if (success) emitListChanged(id, 'updated');
      return success;
    } catch (error) {
      console.error('[projectBridge] Failed to update project:', error);
      throw error;
    }
  });
  ipcBridge.project.remove.provider(async ({ id }) => {
    try {
      const success = await projectService.removeProject(id);
      if (success) emitListChanged(id, 'deleted');
      return success;
    } catch (error) {
      console.error('[projectBridge] Failed to remove project:', error);
      throw error;
    }
  });
}
