import { buildProjectReorderPlan, sortProjectGroupsByManualOrder } from '@/renderer/pages/conversation/GroupedHistory/utils/projectOrderPolicy';
import type { ProjectGroup } from '@/renderer/pages/conversation/GroupedHistory/types';
import { describe, expect, it } from 'vitest';

import type { TProject } from '@/common/adapter/ipcBridge';

const createProject = (overrides: Partial<TProject> = {}): TProject => ({
  id: overrides.id ?? 'project-id',
  name: overrides.name ?? 'Project',
  rootPath: overrides.rootPath,
  createdAt: overrides.createdAt ?? 1000,
  updatedAt: overrides.updatedAt ?? 1000,
  pinnedAt: overrides.pinnedAt,
  sortOrder: overrides.sortOrder,
});

const createProjectGroup = (overrides: { project?: Partial<TProject> } = {}): ProjectGroup => ({
  project: createProject(overrides.project),
  conversations: [],
  chatConversations: [],
  workspaceGroups: [],
  teams: [],
});

describe('project ordering policy', () => {
  it('keeps pinned project groups above unpinned groups while honoring manual order inside each bucket', () => {
    const sortedGroups = sortProjectGroupsByManualOrder(
      [
        createProjectGroup({ project: { id: 'unpinned-a' } }),
        createProjectGroup({ project: { id: 'pinned-b', pinnedAt: 2 } }),
        createProjectGroup({ project: { id: 'unpinned-c' } }),
        createProjectGroup({ project: { id: 'pinned-d', pinnedAt: 1 } }),
      ],
      ['unpinned-c', 'unpinned-a', 'pinned-d', 'pinned-b']
    );

    expect(sortedGroups.map((group) => group.project.id)).toEqual(['pinned-d', 'pinned-b', 'unpinned-c', 'unpinned-a']);
  });

  it('rejects reorder attempts that cross pin buckets', () => {
    const reorderPlan = buildProjectReorderPlan(
      [
        createProjectGroup({ project: { id: 'pinned', pinnedAt: 1 } }),
        createProjectGroup({ project: { id: 'unpinned' } }),
      ],
      'pinned',
      'unpinned'
    );

    expect(reorderPlan).toBeNull();
  });

  it('builds a reorder plan within the pinned bucket', () => {
    const reorderPlan = buildProjectReorderPlan(
      [
        createProjectGroup({ project: { id: 'pinned-a', pinnedAt: 2 } }),
        createProjectGroup({ project: { id: 'pinned-b', pinnedAt: 1 } }),
        createProjectGroup({ project: { id: 'unpinned-c' } }),
      ],
      'pinned-a',
      'pinned-b'
    );

    expect(reorderPlan).toEqual({
      activePinned: true,
      relevantIds: ['pinned-a', 'pinned-b'],
      nextRelevantIds: ['pinned-b', 'pinned-a'],
      baseSortOrder: 0,
    });
  });

  it('builds a reorder plan within the unpinned bucket', () => {
    const reorderPlan = buildProjectReorderPlan(
      [
        createProjectGroup({ project: { id: 'pinned-a', pinnedAt: 2 } }),
        createProjectGroup({ project: { id: 'unpinned-b' } }),
        createProjectGroup({ project: { id: 'unpinned-c' } }),
      ],
      'unpinned-c',
      'unpinned-b'
    );

    expect(reorderPlan).toEqual({
      activePinned: false,
      relevantIds: ['unpinned-b', 'unpinned-c'],
      nextRelevantIds: ['unpinned-c', 'unpinned-b'],
      baseSortOrder: 1000,
    });
  });
});
