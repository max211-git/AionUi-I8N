/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProjectAssetCategory, ProjectAssetSortOption, TProjectAsset } from '@/common/projectAssets';

export type TUpsertProjectAssetInput = {
  userId: string;
  projectId: string;
  sourceType: TProjectAsset['sourceType'];
  absolutePath: string;
  relativePath: string;
  fileName: string;
  category: ProjectAssetCategory;
  mimeType?: string;
  size?: number;
  modifiedAt?: number;
  indexedAt: number;
};

export interface IProjectAssetRepository {
  upsertDiscoveredAssets(assets: TUpsertProjectAssetInput[]): Promise<void>;
  pruneMissingActiveFolderAssets(userId: string, projectId: string, indexedAt: number): Promise<void>;
  listAssets(
    userId: string,
    projectId: string,
    category: ProjectAssetCategory,
    query?: string,
    sort?: ProjectAssetSortOption
  ): Promise<TProjectAsset[]>;
  listContextEnabledAssets(userId: string, projectId: string): Promise<TProjectAsset[]>;
  setContextEnabled(userId: string, projectId: string, assetId: string, enabled: boolean): Promise<boolean>;
  removeAsset(userId: string, projectId: string, assetId: string, removedAt: number): Promise<boolean>;
}
