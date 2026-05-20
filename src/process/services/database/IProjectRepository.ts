/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TProject } from '@/common/adapter/ipcBridge';

export interface IProjectRepository {
  list(userId: string): Promise<TProject[]>;
  get(userId: string, id: string): Promise<TProject | null>;
  create(userId: string, project: TProject): Promise<TProject>;
  update(
    userId: string,
    id: string,
    updates: Partial<Pick<TProject, 'name' | 'rootPath' | 'pinnedAt' | 'sortOrder'>>
  ): Promise<boolean>;
  remove(userId: string, id: string): Promise<boolean>;
  clearProjectFromConversations(userId: string, projectId: string): Promise<void>;
}
