/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { ProjectAssetCategory, ProjectAssetSortOption, TProjectAsset } from '@/common/projectAssets';
import type { IProjectRepository } from '@process/services/database/IProjectRepository';
import type { IProjectAssetRepository, TUpsertProjectAssetInput } from '@process/services/database/projectAssets';

import { classifyProjectAsset } from './classifyProjectAsset';

const IGNORED_DIRECTORY_NAMES = new Set(['.git', 'node_modules', 'dist', 'build', 'out', 'coverage', '.next']);

export interface IProjectAssetService {
  listAssets(
    projectId: string,
    category: ProjectAssetCategory,
    query?: string,
    sort?: ProjectAssetSortOption
  ): Promise<TProjectAsset[]>;
  listContextEnabledAssets(projectId: string): Promise<TProjectAsset[]>;
  refreshProjectAssets(projectId: string): Promise<void>;
  setContextEnabled(projectId: string, assetId: string, enabled: boolean): Promise<boolean>;
  removeAsset(projectId: string, assetId: string): Promise<boolean>;
}

export class ProjectAssetService implements IProjectAssetService {
  constructor(
    private readonly repo: IProjectAssetRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly userId = 'system_default_user'
  ) {}

  private async getProjectRootPath(projectId: string): Promise<string> {
    const project = await this.projectRepository.get(this.userId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    if (!project.rootPath) {
      throw new Error(`Project does not have a root path: ${projectId}`);
    }
    return project.rootPath;
  }

  async listAssets(
    projectId: string,
    category: ProjectAssetCategory,
    query?: string,
    sort: ProjectAssetSortOption = 'modified-desc'
  ): Promise<TProjectAsset[]> {
    await this.getProjectRootPath(projectId);
    return this.repo.listAssets(this.userId, projectId, category, query, sort);
  }

  async refreshProjectAssets(projectId: string): Promise<void> {
    const rootPath = await this.getProjectRootPath(projectId);
    const indexedAt = Date.now();
    const discoveredAssets = await this.scanProjectRoot(projectId, rootPath, indexedAt);

    await this.repo.upsertDiscoveredAssets(discoveredAssets);
    await this.repo.pruneMissingActiveFolderAssets(this.userId, projectId, indexedAt);
  }

  async listContextEnabledAssets(projectId: string): Promise<TProjectAsset[]> {
    await this.getProjectRootPath(projectId);
    return this.repo.listContextEnabledAssets(this.userId, projectId);
  }

  async setContextEnabled(projectId: string, assetId: string, enabled: boolean): Promise<boolean> {
    await this.getProjectRootPath(projectId);
    return this.repo.setContextEnabled(this.userId, projectId, assetId, enabled);
  }

  async removeAsset(projectId: string, assetId: string): Promise<boolean> {
    await this.getProjectRootPath(projectId);
    return this.repo.removeAsset(this.userId, projectId, assetId, Date.now());
  }

  private async scanProjectRoot(
    projectId: string,
    rootPath: string,
    indexedAt: number
  ): Promise<TUpsertProjectAssetInput[]> {
    const discoveredAssets: TUpsertProjectAssetInput[] = [];

    const walk = async (currentDirectory: string): Promise<void> => {
      const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(currentDirectory, entry.name);
        const relativePath = path.relative(rootPath, absolutePath);

        if (entry.isDirectory()) {
          if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
            continue;
          }
          await walk(absolutePath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const stats = await fs.stat(absolutePath);
        const classification = classifyProjectAsset(absolutePath);

        discoveredAssets.push({
          userId: this.userId,
          projectId,
          sourceType: 'folder',
          absolutePath,
          relativePath: relativePath.split(path.sep).join('/'),
          fileName: entry.name,
          category: classification.category,
          mimeType: classification.mimeType,
          size: stats.size,
          modifiedAt: Math.floor(stats.mtimeMs),
          indexedAt,
        });
      }
    };

    await walk(rootPath);
    return discoveredAssets;
  }
}
