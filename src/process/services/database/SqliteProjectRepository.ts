/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';

import type { TProject } from '@/common/adapter/ipcBridge';

import type { IProjectRepository } from './IProjectRepository';
import { projectRowToProject } from './types';

export class SqliteProjectRepository implements IProjectRepository {
  private getDb() {
    return getDatabase();
  }

  async list(userId: string): Promise<TProject[]> {
    const db = await this.getDb();
    const rows = db
      .getDriver()
      .prepare(
        'SELECT id, user_id, name, root_path, pinned_at, sort_order, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY pinned_at DESC NULLS LAST, sort_order ASC NULLS LAST, updated_at DESC, created_at DESC'
      )
      .all(userId) as Array<{
      id: string;
      user_id: string;
      name: string;
      root_path?: string | null;
      pinned_at?: number | null;
      sort_order?: number | null;
      created_at: number;
      updated_at: number;
    }>;
    return rows.map(projectRowToProject);
  }

  async get(userId: string, id: string): Promise<TProject | null> {
    const db = await this.getDb();
    const row = db
      .getDriver()
      .prepare(
        'SELECT id, user_id, name, root_path, pinned_at, sort_order, created_at, updated_at FROM projects WHERE user_id = ? AND id = ?'
      )
      .get(userId, id) as
      | {
          id: string;
          user_id: string;
          name: string;
          root_path?: string | null;
          pinned_at?: number | null;
          sort_order?: number | null;
          created_at: number;
          updated_at: number;
        }
      | undefined;
    return row ? projectRowToProject(row) : null;
  }

  async create(userId: string, project: TProject): Promise<TProject> {
    const db = await this.getDb();
    db.getDriver()
      .prepare(
        'INSERT INTO projects (id, user_id, name, root_path, pinned_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        project.id,
        userId,
        project.name,
        project.rootPath ?? null,
        project.pinnedAt ?? null,
        project.sortOrder ?? null,
        project.createdAt,
        project.updatedAt
      );
    return project;
  }

  async update(
    userId: string,
    id: string,
    updates: Partial<Pick<TProject, 'name' | 'rootPath' | 'pinnedAt' | 'sortOrder'>>
  ): Promise<boolean> {
    const db = await this.getDb();
    console.log('[SqliteProjectRepository] update request', { userId, id, updates });
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.rootPath !== undefined) {
      fields.push('root_path = ?');
      values.push(updates.rootPath || null);
    }
    if (updates.pinnedAt !== undefined) {
      fields.push('pinned_at = ?');
      values.push(updates.pinnedAt ?? null);
    }
    if (updates.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(updates.sortOrder ?? null);
    }

    if (fields.length === 0) {
      return true;
    }

    fields.push('updated_at = ?');
    values.push(Date.now(), userId, id);

    const result = db
      .getDriver()
      .prepare(`UPDATE projects SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`)
      .run(...values);
    console.log('[SqliteProjectRepository] update result', { userId, id, changes: result.changes, values });
    return result.changes > 0;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = db.getDriver().prepare('DELETE FROM projects WHERE user_id = ? AND id = ?').run(userId, id);
    return result.changes > 0;
  }

  async clearProjectFromConversations(userId: string, projectId: string): Promise<void> {
    const db = await this.getDb();
    db.getDriver()
      .prepare('UPDATE conversations SET project_id = NULL, updated_at = ? WHERE user_id = ? AND project_id = ?')
      .run(Date.now(), userId, projectId);
  }
}
