/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProjectAssetCategory, ProjectAssetSortOption, TProjectAsset } from '@/common/projectAssets';
import { getDatabase } from '@process/services/database';

import type { IProjectAssetRepository, TUpsertProjectAssetInput } from './IProjectAssetRepository';

type ProjectAssetRow = {
  id: string;
  user_id: string;
  project_id: string;
  source_type: TProjectAsset['sourceType'];
  absolute_path: string;
  relative_path: string;
  file_name: string;
  category: ProjectAssetCategory;
  mime_type?: string | null;
  size?: number | null;
  modified_at?: number | null;
  indexed_at: number;
  context_enabled: number;
  removed_at?: number | null;
};

const SORT_SQL: Record<ProjectAssetSortOption, string> = {
  'name-asc': 'file_name COLLATE NOCASE ASC, relative_path COLLATE NOCASE ASC',
  'name-desc': 'file_name COLLATE NOCASE DESC, relative_path COLLATE NOCASE DESC',
  'modified-desc': 'modified_at DESC, file_name COLLATE NOCASE ASC',
  'modified-asc': 'modified_at ASC, file_name COLLATE NOCASE ASC',
  'size-desc': 'size DESC, file_name COLLATE NOCASE ASC',
  'size-asc': 'size ASC, file_name COLLATE NOCASE ASC',
};

function rowToProjectAsset(row: ProjectAssetRow): TProjectAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceType: row.source_type,
    absolutePath: row.absolute_path,
    relativePath: row.relative_path,
    fileName: row.file_name,
    category: row.category,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    modifiedAt: row.modified_at ?? undefined,
    indexedAt: row.indexed_at,
    contextEnabled: row.context_enabled === 1,
    removedAt: row.removed_at ?? undefined,
  };
}

export class SqliteProjectAssetRepository implements IProjectAssetRepository {
  private async getDb() {
    return getDatabase();
  }

  async upsertDiscoveredAssets(assets: TUpsertProjectAssetInput[]): Promise<void> {
    if (assets.length === 0) {
      return;
    }

    const db = await this.getDb();
    const statement = db.getDriver().prepare(
      `INSERT INTO project_assets
       (id, user_id, project_id, source_type, absolute_path, relative_path, file_name, category, mime_type, size, modified_at, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, relative_path) DO UPDATE SET
         absolute_path = excluded.absolute_path,
         file_name = excluded.file_name,
         category = excluded.category,
         mime_type = excluded.mime_type,
         size = excluded.size,
         modified_at = excluded.modified_at,
         indexed_at = excluded.indexed_at`
    );

    const runMany = db.getDriver().transaction((items: TUpsertProjectAssetInput[]) => {
      for (const asset of items) {
        statement.run(
          `${asset.projectId}:${asset.relativePath}`,
          asset.userId,
          asset.projectId,
          asset.sourceType,
          asset.absolutePath,
          asset.relativePath,
          asset.fileName,
          asset.category,
          asset.mimeType ?? null,
          asset.size ?? null,
          asset.modifiedAt ?? null,
          asset.indexedAt
        );
      }
    });

    runMany(assets);
  }

  async pruneMissingActiveFolderAssets(userId: string, projectId: string, indexedAt: number): Promise<void> {
    const db = await this.getDb();
    db.getDriver()
      .prepare(
        `DELETE FROM project_assets
         WHERE user_id = ? AND project_id = ? AND source_type = 'folder' AND removed_at IS NULL AND indexed_at < ?`
      )
      .run(userId, projectId, indexedAt);
  }

  async listAssets(
    userId: string,
    projectId: string,
    category: ProjectAssetCategory,
    query?: string,
    sort: ProjectAssetSortOption = 'modified-desc'
  ): Promise<TProjectAsset[]> {
    const db = await this.getDb();
    const orderBy = SORT_SQL[sort] ?? SORT_SQL['modified-desc'];
    const normalizedQuery = query?.trim().toLowerCase();

    const rows = db
      .getDriver()
      .prepare(
        `SELECT id, user_id, project_id, source_type, absolute_path, relative_path, file_name, category, mime_type, size, modified_at, indexed_at, context_enabled, removed_at
         FROM project_assets
         WHERE user_id = ? AND project_id = ? AND category = ? AND removed_at IS NULL
           AND (
             ? IS NULL
             OR lower(file_name) LIKE ?
             OR lower(relative_path) LIKE ?
           )
         ORDER BY ${orderBy}`
      )
      .all(
        userId,
        projectId,
        category,
        normalizedQuery ?? null,
        normalizedQuery ? `%${normalizedQuery}%` : null,
        normalizedQuery ? `%${normalizedQuery}%` : null
      ) as ProjectAssetRow[];

    return rows.map(rowToProjectAsset);
  }

  async listContextEnabledAssets(userId: string, projectId: string): Promise<TProjectAsset[]> {
    const db = await this.getDb();
    const rows = db
      .getDriver()
      .prepare(
        `SELECT id, user_id, project_id, source_type, absolute_path, relative_path, file_name, category, mime_type, size, modified_at, indexed_at, context_enabled, removed_at
         FROM project_assets
         WHERE user_id = ? AND project_id = ? AND removed_at IS NULL AND context_enabled = 1
         ORDER BY category ASC, file_name COLLATE NOCASE ASC, relative_path COLLATE NOCASE ASC`
      )
      .all(userId, projectId) as ProjectAssetRow[];

    return rows.map(rowToProjectAsset);
  }

  async setContextEnabled(userId: string, projectId: string, assetId: string, enabled: boolean): Promise<boolean> {
    const db = await this.getDb();
    const result = db
      .getDriver()
      .prepare(
        `UPDATE project_assets
         SET context_enabled = ?
         WHERE user_id = ? AND project_id = ? AND id = ? AND removed_at IS NULL`
      )
      .run(enabled ? 1 : 0, userId, projectId, assetId);
    return result.changes > 0;
  }

  async removeAsset(userId: string, projectId: string, assetId: string, removedAt: number): Promise<boolean> {
    const db = await this.getDb();
    const result = db
      .getDriver()
      .prepare(
        `UPDATE project_assets
         SET removed_at = ?
         WHERE user_id = ? AND project_id = ? AND id = ? AND removed_at IS NULL`
      )
      .run(removedAt, userId, projectId, assetId);
    return result.changes > 0;
  }
}
