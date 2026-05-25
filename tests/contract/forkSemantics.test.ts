import type { TProject } from '@/common/adapter/ipcBridge';
import type { TChatConversation } from '@/common/config/storage';
import { PRODUCT_BRAND, UPSTREAM_RELEASE_SOURCE } from '@/common/config/product';
import type { TTeam } from '@/common/types/teamTypes';
import { buildGroupedHistory } from '@/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/renderer/utils/chat/timeline', () => ({
  getActivityTime: (conversation: TChatConversation) => conversation.updatedAt || conversation.createdAt,
}));

vi.mock('@/renderer/utils/workspace/workspace', () => ({
  getWorkspaceDisplayName: (workspace: string) => workspace.split('/').pop() || workspace,
}));

vi.mock('@/renderer/utils/workspace/workspaceHistory', () => ({
  getWorkspaceUpdateTime: () => 0,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/utils/sortOrderHelpers', () => ({
  getConversationSortOrder: (conversation: TChatConversation) => {
    const extra = conversation.extra as { sortOrder?: number } | undefined;
    return extra?.sortOrder;
  },
}));

const t = (key: string) => key;

const createConversation = (overrides: Partial<TChatConversation> = {}): TChatConversation => ({
  id: overrides.id ?? 'conversation-id',
  title: overrides.title ?? 'Conversation',
  createTime: overrides.createTime ?? 1000,
  modifyTime: overrides.modifyTime ?? overrides.updatedAt ?? 1000,
  createdAt: overrides.createdAt ?? 1000,
  updatedAt: overrides.updatedAt ?? overrides.modifyTime ?? 1000,
  extra: overrides.extra ?? {},
  userMsgCount: overrides.userMsgCount ?? 0,
  projectId: overrides.projectId,
});

const createProject = (overrides: Partial<TProject> = {}): TProject => ({
  id: overrides.id ?? 'project-id',
  name: overrides.name ?? 'Project',
  rootPath: overrides.rootPath,
  createdAt: overrides.createdAt ?? 1000,
  updatedAt: overrides.updatedAt ?? 1000,
  pinnedAt: overrides.pinnedAt,
  sortOrder: overrides.sortOrder,
});

const createTeam = (overrides: Partial<TTeam> = {}): TTeam => ({
  id: overrides.id ?? 'team-id',
  userId: overrides.userId ?? 'user-id',
  projectId: overrides.projectId,
  name: overrides.name ?? 'Team',
  workspace: overrides.workspace ?? '/tmp/team-workspace',
  workspaceMode: overrides.workspaceMode ?? 'custom',
  leaderAgentId: overrides.leaderAgentId ?? 'leader-id',
  agents: overrides.agents ?? [],
  sessionMode: overrides.sessionMode,
  createdAt: overrides.createdAt ?? 1000,
  updatedAt: overrides.updatedAt ?? 1000,
  pinnedAt: overrides.pinnedAt,
  sortOrder: overrides.sortOrder,
});

describe('AionUI+ fork contracts', () => {
  it('keeps empty projects visible even with no conversations', () => {
    const result = buildGroupedHistory([], [createProject({ id: 'empty-project' })], [], t);

    expect(result.projectGroups).toHaveLength(1);
    expect(result.projectGroups[0].project.id).toBe('empty-project');
    expect(result.projectGroups[0].conversations).toHaveLength(0);
    expect(result.timelineSections).toHaveLength(0);
  });

  it('keeps project-owned items out of recents while preserving top-level unassigned teams', () => {
    const project = createProject({ id: 'project-1', updatedAt: 5000 });
    const conversations = [
      createConversation({ id: 'project-chat', projectId: 'project-1', updatedAt: 4000 }),
      createConversation({
        id: 'project-workspace-chat',
        projectId: 'project-1',
        updatedAt: 3500,
        extra: { workspace: '/work/project', customWorkspace: true },
      }),
      createConversation({ id: 'recent-chat', updatedAt: 3000 }),
      createConversation({
        id: 'team-owned-chat',
        updatedAt: 2500,
        extra: { teamId: 'team-1' },
      }),
    ];
    const teams = [
      createTeam({ id: 'team-in-project', projectId: 'project-1', updatedAt: 3200 }),
      createTeam({ id: 'team-top-level', updatedAt: 3300 }),
    ];

    const result = buildGroupedHistory(conversations, [project], teams, t);

    expect(result.projectGroups).toHaveLength(1);
    expect(result.projectGroups[0].project.id).toBe('project-1');
    expect(result.projectGroups[0].conversations.map((conversation) => conversation.id)).toEqual([
      'project-chat',
      'project-workspace-chat',
    ]);
    expect(result.projectGroups[0].teams.map((team) => team.id)).toEqual(['team-in-project']);
    expect(result.unassignedTeams.map((team) => team.id)).toEqual(['team-top-level']);
    expect(result.timelineSections).toHaveLength(1);
    expect(result.timelineSections[0].timeline).toBe('conversation.history.recents');
    expect(result.timelineSections[0].items).toHaveLength(1);
    expect(result.timelineSections[0].items[0].type).toBe('conversation');
    expect(result.timelineSections[0].items[0].conversation?.id).toBe('recent-chat');
  });

  it('promotes pinned projects and pinned teams into the global pinned section', () => {
    const projects = [
      createProject({ id: 'project-unpinned', updatedAt: 1000 }),
      createProject({ id: 'project-pinned', updatedAt: 900, pinnedAt: 2000 }),
    ];
    const teams = [
      createTeam({ id: 'team-unpinned', projectId: 'project-pinned', updatedAt: 1000 }),
      createTeam({ id: 'team-pinned', projectId: 'project-pinned', updatedAt: 900, pinnedAt: 3000 }),
      createTeam({ id: 'top-unpinned', updatedAt: 1000 }),
      createTeam({ id: 'top-pinned', updatedAt: 900, pinnedAt: 4000 }),
    ];

    const result = buildGroupedHistory([], projects, teams, t);

    expect(result.pinnedProjectGroups.map((group) => group.project.id)).toEqual(['project-pinned']);
    expect(result.projectGroups.map((group) => group.project.id)).toEqual(['project-unpinned']);
    expect(result.pinnedProjectGroups[0].teams.map((team) => team.id)).toEqual(['team-pinned', 'team-unpinned']);
    expect(result.pinnedTeams.map((team) => team.id)).toEqual(['top-pinned']);
    expect(result.unassignedTeams.map((team) => team.id)).toEqual(['top-unpinned']);
  });

  it('preserves fork identity and upstream source defaults', () => {
    expect(PRODUCT_BRAND.productName).toBe('AionUI+');
    expect(PRODUCT_BRAND.appId).toBe('com.aionui.plus');
    expect(UPSTREAM_RELEASE_SOURCE.repo).toBe('iOfficeAI/AionUi');
    expect(UPSTREAM_RELEASE_SOURCE.upstreamRepoUrl).toContain('github.com/iOfficeAI/AionUi');
  });
});
