/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi } from 'vitest';

import { ProjectAssetService } from '@process/services/projectAssets';
import type { IProjectRepository } from '@process/services/database/IProjectRepository';
import type { IProjectAssetRepository } from '@process/services/database/projectAssets';

const createProjectRepo = (rootPath?: string): IProjectRepository =>
  ({
    get: vi.fn().mockResolvedValue(
      rootPath
        ? {
            id: 'project-1',
            userId: 'system_default_user',
            name: 'Project',
            rootPath,
            createdAt: 1,
            updatedAt: 1,
          }
        : {
            id: 'project-1',
            userId: 'system_default_user',
            name: 'Project',
            createdAt: 1,
            updatedAt: 1,
          }
    ),
  }) as unknown as IProjectRepository;

const createAssetRepo = (): IProjectAssetRepository =>
  ({
    upsertDiscoveredAssets: vi.fn(),
    pruneMissingActiveFolderAssets: vi.fn(),
    listAssets: vi.fn().mockResolvedValue([]),
    listContextEnabledAssets: vi.fn().mockResolvedValue([]),
    setContextEnabled: vi.fn().mockResolvedValue(true),
    removeAsset: vi.fn().mockResolvedValue(true),
  }) as unknown as IProjectAssetRepository;

describe('ProjectAssetService', () => {
  it('should list context-enabled assets for folder-backed projects', async () => {
    const repo = createAssetRepo();
    const service = new ProjectAssetService(repo, createProjectRepo('/tmp/project'));

    await service.listContextEnabledAssets('project-1');

    expect(repo.listContextEnabledAssets).toHaveBeenCalledWith('system_default_user', 'project-1');
  });

  it('should update context-enabled state for active project assets', async () => {
    const repo = createAssetRepo();
    const service = new ProjectAssetService(repo, createProjectRepo('/tmp/project'));

    const updated = await service.setContextEnabled('project-1', 'asset-1', true);

    expect(updated).toBe(true);
    expect(repo.setContextEnabled).toHaveBeenCalledWith('system_default_user', 'project-1', 'asset-1', true);
  });

  it('should reject context asset operations when the project has no root path', async () => {
    const repo = createAssetRepo();
    const service = new ProjectAssetService(repo, createProjectRepo());

    await expect(service.listContextEnabledAssets('project-1')).rejects.toThrow('Project does not have a root path');
    await expect(service.setContextEnabled('project-1', 'asset-1', true)).rejects.toThrow(
      'Project does not have a root path'
    );
  });
});
