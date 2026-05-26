/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const PROJECT_ASSET_CATEGORIES = ['images', 'documents', 'pdfs', 'code-text', 'other'] as const;

export const PROJECT_ASSET_SORT_OPTIONS = [
  'name-asc',
  'name-desc',
  'modified-desc',
  'modified-asc',
  'size-desc',
  'size-asc',
] as const;

export type ProjectAssetCategory = (typeof PROJECT_ASSET_CATEGORIES)[number];
export type ProjectAssetSortOption = (typeof PROJECT_ASSET_SORT_OPTIONS)[number];

export type TProjectAsset = {
  id: string;
  projectId: string;
  sourceType: 'folder';
  absolutePath: string;
  relativePath: string;
  fileName: string;
  category: ProjectAssetCategory;
  mimeType?: string;
  size?: number;
  modifiedAt?: number;
  indexedAt: number;
  contextEnabled: boolean;
  removedAt?: number;
};

export type TProjectAssetListParams = {
  category: ProjectAssetCategory;
  query?: string;
  sort?: ProjectAssetSortOption;
};
