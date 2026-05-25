/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { TProjectMemoryEntry } from '@/common/projectMemory';
import { buildProjectMemorySummary } from '@process/services/projectMemory';

function makeEntry(overrides: Partial<TProjectMemoryEntry>): TProjectMemoryEntry {
  return {
    id: 'entry-1',
    projectId: 'project-1',
    name: 'Entry',
    type: 'project',
    content: 'Content',
    source: 'user-explicit',
    status: 'approved',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('buildProjectMemorySummary', () => {
  it('returns empty string for empty entries', () => {
    expect(buildProjectMemorySummary([])).toBe('');
  });

  it('groups entries by type in stable order', () => {
    const summary = buildProjectMemorySummary([
      makeEntry({ id: 'user-1', type: 'user', name: 'Concision', description: 'Keep responses concise' }),
      makeEntry({ id: 'project-1', type: 'project', name: 'Architecture', description: 'Use service seams' }),
    ]);

    expect(summary).toContain('[Shared Project Memory]');
    expect(summary.indexOf('Project conventions:')).toBeLessThan(summary.indexOf('User preferences:'));
    expect(summary).toContain('- Architecture: Use service seams');
    expect(summary).toContain('- Concision: Keep responses concise');
  });

  it('falls back to content when no description is provided', () => {
    const summary = buildProjectMemorySummary([
      makeEntry({ name: 'Workflow', content: 'Ask before refactors and preserve user edits.' }),
    ]);

    expect(summary).toContain('- Workflow: Ask before refactors and preserve user edits.');
  });
});
