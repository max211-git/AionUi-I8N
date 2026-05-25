/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IProjectRepository } from '@process/services/database/IProjectRepository';
import type { IProjectMemoryRepository } from '@process/services/database/projectMemory';
import { ProjectMemoryService } from '@process/services/projectMemory';

function makeProjectRepo(overrides: Partial<IProjectRepository> = {}): IProjectRepository {
  return {
    list: vi.fn(),
    get: vi.fn(async () => ({ id: 'project-1', name: 'Project', createdAt: 1000, updatedAt: 1000 })),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clearProjectFromConversations: vi.fn(),
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IProjectMemoryRepository> = {}): IProjectMemoryRepository {
  return {
    listEntries: vi.fn(async () => []),
    getEntry: vi.fn(async () => null),
    createEntry: vi.fn(async (_userId, entry) => entry),
    updateEntry: vi.fn(async () => true),
    removeEntry: vi.fn(async () => true),
    getSettings: vi.fn(async () => null),
    upsertSettings: vi.fn(async (_userId, settings) => settings),
    ...overrides,
  };
}

describe('ProjectMemoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates disabled default settings on first read', async () => {
    const repo = makeRepo();
    const service = new ProjectMemoryService(repo, makeProjectRepo());

    const settings = await service.getSettings('project-1');

    expect(settings.enabled).toBe(false);
    expect(repo.upsertSettings).toHaveBeenCalledTimes(1);
  });

  it('builds no summary when project memory is disabled', async () => {
    const repo = makeRepo({
      getSettings: vi.fn(async () => ({
        projectId: 'project-1',
        enabled: false,
        createdAt: 1000,
        updatedAt: 1000,
      })),
    });
    const service = new ProjectMemoryService(repo, makeProjectRepo());

    await expect(service.buildSummary('project-1')).resolves.toBe('');
    expect(repo.listEntries).not.toHaveBeenCalled();
  });

  it('creates entries with normalized metadata', async () => {
    const repo = makeRepo();
    const service = new ProjectMemoryService(repo, makeProjectRepo());

    const entry = await service.createEntry('project-1', {
      name: ' Collaboration Style ',
      description: ' Keep diffs concise ',
      type: 'user',
      content: ' Ask before refactors ',
      tags: [' style ', ' workflow '],
    });

    expect(entry.name).toBe('Collaboration Style');
    expect(entry.description).toBe('Keep diffs concise');
    expect(entry.content).toBe('Ask before refactors');
    expect(entry.tags).toEqual(['style', 'workflow']);
  });
});
