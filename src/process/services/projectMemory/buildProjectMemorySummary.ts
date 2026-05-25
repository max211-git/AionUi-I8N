/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TProjectMemoryEntry } from '@/common/projectMemory';

const TYPE_LABELS: Record<TProjectMemoryEntry['type'], string> = {
  user: 'User preferences',
  project: 'Project conventions',
  reference: 'Reference facts',
  feedback: 'Feedback',
};

const TYPE_ORDER: Record<TProjectMemoryEntry['type'], number> = {
  project: 0,
  user: 1,
  reference: 2,
  feedback: 3,
};

const MAX_SUMMARY_LENGTH = 2400;
const MAX_ENTRY_LINES = 12;

function summarizeEntry(entry: TProjectMemoryEntry): string {
  const detail = entry.description?.trim() || entry.content.trim().replace(/\s+/g, ' ');
  return `- ${entry.name}: ${detail}`;
}

export function buildProjectMemorySummary(entries: TProjectMemoryEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  const grouped = [...entries]
    .toSorted((a, b) => {
      const typeDelta = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
      if (typeDelta !== 0) return typeDelta;
      return b.updatedAt - a.updatedAt;
    })
    .reduce<Map<TProjectMemoryEntry['type'], TProjectMemoryEntry[]>>((acc, entry) => {
      const existing = acc.get(entry.type) ?? [];
      existing.push(entry);
      acc.set(entry.type, existing);
      return acc;
    }, new Map());

  const lines = ['[Shared Project Memory]'];
  let lineCount = 0;

  for (const type of Object.keys(TYPE_ORDER) as TProjectMemoryEntry['type'][]) {
    const typeEntries = grouped.get(type);
    if (!typeEntries || typeEntries.length === 0) {
      continue;
    }

    lines.push(`${TYPE_LABELS[type]}:`);
    for (const entry of typeEntries) {
      if (lineCount >= MAX_ENTRY_LINES) {
        lines.push('- Additional entries omitted for brevity.');
        return lines.join('\n').slice(0, MAX_SUMMARY_LENGTH);
      }
      lines.push(summarizeEntry(entry));
      lineCount += 1;
    }
  }

  return lines.join('\n').slice(0, MAX_SUMMARY_LENGTH);
}
