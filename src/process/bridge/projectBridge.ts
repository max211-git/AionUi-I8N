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
    const created = await projectService.createProject({ name, rootPath });
    emitListChanged(created.id, 'created');
    return created;
  });
  ipcBridge.project.list.provider(async () => projectService.listProjects());
  ipcBridge.project.get.provider(async ({ id }) => projectService.getProject(id));
  ipcBridge.project.update.provider(async ({ id, updates }) => {
    const success = await projectService.updateProject(id, updates);
    if (success) emitListChanged(id, 'updated');
    return success;
  });
  ipcBridge.project.remove.provider(async ({ id }) => {
    const success = await projectService.removeProject(id);
    if (success) emitListChanged(id, 'deleted');
    return success;
  });
}
