/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CreateProjectMemoryEntryInput,
  TProjectMemoryEntry,
  TProjectMemorySettings,
  UpdateProjectMemoryEntryInput,
} from '@/common/projectMemory';

export interface IProjectMemoryRepository {
  listEntries(userId: string, projectId: string): Promise<TProjectMemoryEntry[]>;
  getEntry(userId: string, projectId: string, entryId: string): Promise<TProjectMemoryEntry | null>;
  createEntry(userId: string, entry: TProjectMemoryEntry): Promise<TProjectMemoryEntry>;
  updateEntry(
    userId: string,
    projectId: string,
    entryId: string,
    updates: UpdateProjectMemoryEntryInput & { updatedAt: number }
  ): Promise<boolean>;
  removeEntry(userId: string, projectId: string, entryId: string): Promise<boolean>;
  getSettings(userId: string, projectId: string): Promise<TProjectMemorySettings | null>;
  upsertSettings(userId: string, settings: TProjectMemorySettings): Promise<TProjectMemorySettings>;
}
