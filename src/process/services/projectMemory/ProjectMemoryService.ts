/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { uuid } from '@/common/utils';
import type {
  CreateProjectMemoryEntryInput,
  TProjectMemoryEntry,
  TProjectMemorySettings,
  UpdateProjectMemoryEntryInput,
} from '@/common/projectMemory';
import type { IProjectRepository } from '@process/services/database/IProjectRepository';
import type { IProjectMemoryRepository } from '@process/services/database/projectMemory';

import { buildProjectMemorySummary } from './buildProjectMemorySummary';

export interface IProjectMemoryService {
  listEntries(projectId: string): Promise<TProjectMemoryEntry[]>;
  getEntry(projectId: string, entryId: string): Promise<TProjectMemoryEntry | null>;
  createEntry(projectId: string, input: CreateProjectMemoryEntryInput): Promise<TProjectMemoryEntry>;
  updateEntry(projectId: string, entryId: string, updates: UpdateProjectMemoryEntryInput): Promise<boolean>;
  removeEntry(projectId: string, entryId: string): Promise<boolean>;
  getSettings(projectId: string): Promise<TProjectMemorySettings>;
  updateSettings(projectId: string, updates: { enabled: boolean }): Promise<TProjectMemorySettings>;
  buildSummary(projectId: string): Promise<string>;
}

export class ProjectMemoryService implements IProjectMemoryService {
  constructor(
    private readonly repo: IProjectMemoryRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly userId = 'system_default_user'
  ) {}

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.get(this.userId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
  }

  private async getOrCreateSettings(projectId: string): Promise<TProjectMemorySettings> {
    await this.assertProjectExists(projectId);
    const existing = await this.repo.getSettings(this.userId, projectId);
    if (existing) {
      return existing;
    }

    const now = Date.now();
    return this.repo.upsertSettings(this.userId, {
      projectId,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listEntries(projectId: string): Promise<TProjectMemoryEntry[]> {
    await this.assertProjectExists(projectId);
    return this.repo.listEntries(this.userId, projectId);
  }

  async getEntry(projectId: string, entryId: string): Promise<TProjectMemoryEntry | null> {
    await this.assertProjectExists(projectId);
    return this.repo.getEntry(this.userId, projectId, entryId);
  }

  async createEntry(projectId: string, input: CreateProjectMemoryEntryInput): Promise<TProjectMemoryEntry> {
    await this.assertProjectExists(projectId);
    const now = Date.now();
    const entry: TProjectMemoryEntry = {
      id: uuid(),
      projectId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      type: input.type,
      content: input.content.trim(),
      source: 'user-explicit',
      status: 'approved',
      tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createEntry(this.userId, entry);
  }

  async updateEntry(projectId: string, entryId: string, updates: UpdateProjectMemoryEntryInput): Promise<boolean> {
    await this.assertProjectExists(projectId);
    return this.repo.updateEntry(this.userId, projectId, entryId, {
      ...updates,
      name: updates.name?.trim(),
      description: updates.description?.trim(),
      content: updates.content?.trim(),
      tags: updates.tags?.map((tag) => tag.trim()).filter(Boolean),
      updatedAt: Date.now(),
    });
  }

  async removeEntry(projectId: string, entryId: string): Promise<boolean> {
    await this.assertProjectExists(projectId);
    return this.repo.removeEntry(this.userId, projectId, entryId);
  }

  async getSettings(projectId: string): Promise<TProjectMemorySettings> {
    return this.getOrCreateSettings(projectId);
  }

  async updateSettings(projectId: string, updates: { enabled: boolean }): Promise<TProjectMemorySettings> {
    const current = await this.getOrCreateSettings(projectId);
    return this.repo.upsertSettings(this.userId, {
      ...current,
      enabled: updates.enabled,
      updatedAt: Date.now(),
    });
  }

  async buildSummary(projectId: string): Promise<string> {
    const settings = await this.getOrCreateSettings(projectId);
    if (!settings.enabled) {
      return '';
    }

    const entries = await this.repo.listEntries(this.userId, projectId);
    return buildProjectMemorySummary(entries);
  }
}
