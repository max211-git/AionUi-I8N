import type { TChatConversation } from '@/common/config/storage';
import type { TTeam } from '@/common/types/teamTypes';
import {
  getProjectGroupLatestActivityTime,
  isTeamOwnedConversation,
  shouldDisplayConversationInSidebar,
  sortProjectGroupsBySidebarPriority,
  sortTeamsBySidebarPriority,
} from '@/renderer/pages/conversation/GroupedHistory/utils/historyPolicy';
import type { ProjectGroup } from '@/renderer/pages/conversation/GroupedHistory/types';
import { describe, expect, it } from 'vitest';

import type { TProject } from '@/common/adapter/ipcBridge';

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

const createProjectGroup = (
  overrides: {
    project?: Partial<TProject>;
    conversations?: TChatConversation[];
    teams?: TTeam[];
  } = {}
): ProjectGroup => ({
  project: createProject(overrides.project),
  conversations: overrides.conversations ?? [],
  chatConversations: [],
  workspaceGroups: [],
  teams: overrides.teams ?? [],
});

describe('history sidebar policy', () => {
  it('hides team-owned conversations from the left sidebar', () => {
    const teamOwnedConversation = createConversation({ extra: { teamId: 'team-1' } });

    expect(isTeamOwnedConversation(teamOwnedConversation)).toBe(true);
    expect(shouldDisplayConversationInSidebar(teamOwnedConversation)).toBe(false);
  });

  it('keeps non-team conversations visible in the left sidebar', () => {
    const regularConversation = createConversation({ extra: { workspace: '/tmp/project', customWorkspace: true } });

    expect(isTeamOwnedConversation(regularConversation)).toBe(false);
    expect(shouldDisplayConversationInSidebar(regularConversation)).toBe(true);
  });

  it('sorts pinned teams ahead of unpinned teams before updatedAt fallback', () => {
    const sortedTeams = sortTeamsBySidebarPriority([
      createTeam({ id: 'unpinned-newer', updatedAt: 5000 }),
      createTeam({ id: 'pinned-older', updatedAt: 1000, pinnedAt: 2000 }),
      createTeam({ id: 'pinned-newer', updatedAt: 3000, pinnedAt: 4000 }),
    ]);

    expect(sortedTeams.map((team) => team.id)).toEqual(['pinned-newer', 'pinned-older', 'unpinned-newer']);
  });

  it('prefers team sortOrder before updatedAt within the same pinning cohort', () => {
    const sortedTeams = sortTeamsBySidebarPriority([
      createTeam({ id: 'team-b', pinnedAt: 4000, updatedAt: 5000, sortOrder: 2000 }),
      createTeam({ id: 'team-a', pinnedAt: 3000, updatedAt: 1000, sortOrder: 1000 }),
      createTeam({ id: 'team-c', pinnedAt: 5000, updatedAt: 9000 }),
    ]);

    expect(sortedTeams.map((team) => team.id)).toEqual(['team-a', 'team-b', 'team-c']);
  });

  it('prefers pinned projects, then latest project activity, when ordering project cards', () => {
    const sortedProjectGroups = sortProjectGroupsBySidebarPriority([
      createProjectGroup({
        project: { id: 'unpinned-older', updatedAt: 1000 },
        conversations: [createConversation({ id: 'unpinned-older-chat', updatedAt: 1200 })],
      }),
      createProjectGroup({
        project: { id: 'pinned', updatedAt: 900, pinnedAt: 5000 },
      }),
      createProjectGroup({
        project: { id: 'unpinned-newer', updatedAt: 1100 },
        teams: [createTeam({ id: 'recent-team', updatedAt: 6000 })],
      }),
    ]);

    expect(sortedProjectGroups.map((group) => group.project.id)).toEqual([
      'pinned',
      'unpinned-newer',
      'unpinned-older',
    ]);
  });

  it('uses project conversations, project teams, and project timestamps as activity sources', () => {
    const projectGroup = createProjectGroup({
      project: { updatedAt: 1500 },
      conversations: [createConversation({ updatedAt: 2200 })],
      teams: [createTeam({ updatedAt: 3100 })],
    });

    expect(getProjectGroupLatestActivityTime(projectGroup)).toBe(3100);
  });
});
