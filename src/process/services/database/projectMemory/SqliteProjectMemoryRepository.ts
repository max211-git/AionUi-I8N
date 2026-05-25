/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TProjectMemoryEntry, TProjectMemorySettings, UpdateProjectMemoryEntryInput } from '@/common/projectMemory';
import { getDatabase } from '@process/services/database';

import type { IProjectMemoryRepository } from './IProjectMemoryRepository';

type ProjectMemoryEntryRow = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  type: TProjectMemoryEntry['type'];
  content: string;
  source: TProjectMemoryEntry['source'];
  status: TProjectMemoryEntry['status'];
  tags?: string | null;
  created_at: number;
  updated_at: number;
};

type ProjectMemorySettingsRow = {
  user_id: string;
  project_id: string;
  enabled: number;
  created_at: number;
  updated_at: number;
};

function rowToProjectMemoryEntry(row: ProjectMemoryEntryRow): TProjectMemoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    content: row.content,
    source: row.source,
    status: row.status,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProjectMemorySettings(row: ProjectMemorySettingsRow): TProjectMemorySettings {
  return {
    projectId: row.project_id,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteProjectMemoryRepository implements IProjectMemoryRepository {
  private getDb() {
    return getDatabase();
  }

  async listEntries(userId: string, projectId: string): Promise<TProjectMemoryEntry[]> {
    const db = await this.getDb();
    const rows = db
      .getDriver()
      .prepare(
        `SELECT id, user_id, project_id, name, description, type, content, source, status, tags, created_at, updated_at
         FROM project_memory_entries
         WHERE user_id = ? AND project_id = ?
         ORDER BY type ASC, updated_at DESC, created_at DESC`
      )
      .all(userId, projectId) as ProjectMemoryEntryRow[];
    return rows.map(rowToProjectMemoryEntry);
  }

  async getEntry(userId: string, projectId: string, entryId: string): Promise<TProjectMemoryEntry | null> {
    const db = await this.getDb();
    const row = db
      .getDriver()
      .prepare(
        `SELECT id, user_id, project_id, name, description, type, content, source, status, tags, created_at, updated_at
         FROM project_memory_entries
         WHERE user_id = ? AND project_id = ? AND id = ?`
      )
      .get(userId, projectId, entryId) as ProjectMemoryEntryRow | undefined;
    return row ? rowToProjectMemoryEntry(row) : null;
  }

  async createEntry(userId: string, entry: TProjectMemoryEntry): Promise<TProjectMemoryEntry> {
    const db = await this.getDb();
    db.getDriver()
      .prepare(
        `INSERT INTO project_memory_entries
         (id, user_id, project_id, name, description, type, content, source, status, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        userId,
        entry.projectId,
        entry.name,
        entry.description ?? null,
        entry.type,
        entry.content,
        entry.source,
        entry.status,
        JSON.stringify(entry.tags),
        entry.createdAt,
        entry.updatedAt
      );
    return entry;
  }

  async updateEntry(
    userId: string,
    projectId: string,
    entryId: string,
    updates: UpdateProjectMemoryEntryInput & { updatedAt: number }
  ): Promise<boolean> {
    const db = await this.getDb();
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description ?? null);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (fields.length === 0) {
      return true;
    }

    fields.push('updated_at = ?');
    values.push(updates.updatedAt, userId, projectId, entryId);

    const result = db
      .getDriver()
      .prepare(
        `UPDATE project_memory_entries SET ${fields.join(', ')}
         WHERE user_id = ? AND project_id = ? AND id = ?`
      )
      .run(...values);
    return result.changes > 0;
  }

  async removeEntry(userId: string, projectId: string, entryId: string): Promise<boolean> {
    const db = await this.getDb();
    const result = db
      .getDriver()
      .prepare('DELETE FROM project_memory_entries WHERE user_id = ? AND project_id = ? AND id = ?')
      .run(userId, projectId, entryId);
    return result.changes > 0;
  }

  async getSettings(userId: string, projectId: string): Promise<TProjectMemorySettings | null> {
    const db = await this.getDb();
    const row = db
      .getDriver()
      .prepare(
        `SELECT user_id, project_id, enabled, created_at, updated_at
         FROM project_memory_settings
         WHERE user_id = ? AND project_id = ?`
      )
      .get(userId, projectId) as ProjectMemorySettingsRow | undefined;
    return row ? rowToProjectMemorySettings(row) : null;
  }

  async upsertSettings(userId: string, settings: TProjectMemorySettings): Promise<TProjectMemorySettings> {
    const db = await this.getDb();
    db.getDriver()
      .prepare(
        `INSERT INTO project_memory_settings (user_id, project_id, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET
           enabled = excluded.enabled,
           updated_at = excluded.updated_at`
      )
      .run(userId, settings.projectId, settings.enabled ? 1 : 0, settings.createdAt, settings.updatedAt);
    return settings;
  }
}
