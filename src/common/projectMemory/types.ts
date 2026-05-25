/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const PROJECT_MEMORY_ENTRY_TYPES = ['user', 'project', 'reference', 'feedback'] as const;

export type ProjectMemoryEntryType = (typeof PROJECT_MEMORY_ENTRY_TYPES)[number];

export type TProjectMemoryEntry = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: ProjectMemoryEntryType;
  content: string;
  source: 'user-explicit';
  status: 'approved';
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type TProjectMemorySettings = {
  projectId: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateProjectMemoryEntryInput = {
  name: string;
  description?: string;
  type: ProjectMemoryEntryType;
  content: string;
  tags?: string[];
};

export type UpdateProjectMemoryEntryInput = Partial<CreateProjectMemoryEntryInput>;
