/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDriver } from '@process/services/database/drivers/createDriver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { runMigrations, ALL_MIGRATIONS } from '@process/services/database/migrations';
import { initSchema } from '@process/services/database/schema';

describe('migration v31: project memory tables', () => {
  let driver: ISqliteDriver;

  beforeEach(async () => {
    driver = await createDriver(':memory:');
    initSchema(driver);
    runMigrations(driver, 0, 30);
  });

  afterEach(() => {
    driver.close();
  });

  it('creates project_memory_settings and project_memory_entries tables', () => {
    runMigrations(driver, 30, 31);

    const tables = driver
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('project_memory_settings', 'project_memory_entries')"
      )
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(['project_memory_settings', 'project_memory_entries'])
    );
  });

  it('rollback drops project memory tables', () => {
    runMigrations(driver, 30, 31);
    ALL_MIGRATIONS.find((migration) => migration.version === 31)!.down(driver);

    const tables = driver
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('project_memory_settings', 'project_memory_entries')"
      )
      .all() as Array<{ name: string }>;

    expect(tables).toHaveLength(0);
  });
});
