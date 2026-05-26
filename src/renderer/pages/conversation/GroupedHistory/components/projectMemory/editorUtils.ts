/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CreateProjectMemoryEntryInput,
  ProjectMemoryEntryType,
  TProjectMemoryEntry,
} from '@/common/projectMemory';

export type ProjectMemoryEntryDraft = {
  name: string;
  description: string;
  type: ProjectMemoryEntryType;
  content: string;
  tags: string;
};

export const EMPTY_PROJECT_MEMORY_ENTRY_DRAFT: ProjectMemoryEntryDraft = {
  name: '',
  description: '',
  type: 'project',
  content: '',
  tags: '',
};

export const createProjectMemoryEntryDraft = (
  overrides?: Partial<ProjectMemoryEntryDraft>
): ProjectMemoryEntryDraft => ({
  ...EMPTY_PROJECT_MEMORY_ENTRY_DRAFT,
  ...overrides,
});

export const parseProjectMemoryTags = (value: string): string[] =>
  value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const draftFromProjectMemoryEntry = (entry: TProjectMemoryEntry): ProjectMemoryEntryDraft => ({
  name: entry.name,
  description: entry.description ?? '',
  type: entry.type,
  content: entry.content,
  tags: entry.tags.join(', '),
});

export const createProjectMemoryInputFromDraft = (draft: ProjectMemoryEntryDraft): CreateProjectMemoryEntryInput => ({
  name: draft.name.trim(),
  description: draft.description.trim() || undefined,
  type: draft.type,
  content: draft.content.trim(),
  tags: parseProjectMemoryTags(draft.tags),
});

const normalizeRememberTitle = (content: string): string => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return 'Project memory';
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69).trimEnd()}...` : firstLine;
};

export const buildRememberProjectMemoryDraft = (
  content: string,
  position: 'left' | 'right' | 'center' | 'pop' | undefined
): ProjectMemoryEntryDraft => {
  const trimmedContent = content.trim();

  return createProjectMemoryEntryDraft({
    name: normalizeRememberTitle(trimmedContent),
    type: position === 'right' ? 'user' : 'project',
    content: trimmedContent,
  });
};
