/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi } from 'vitest';
import type { TProject } from '@/common/adapter/ipcBridge';
import type { TChatConversation } from '@/common/config/storage';
import type { TTeam } from '@/common/types/teamTypes';
import {
  buildGroupedHistory,
  getConversationPinnedAt,
  isCronJobConversation,
  isConversationPinned,
  groupConversationsByWorkspace,
} from '@/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers';

// Mock dependencies
vi.mock('@/renderer/utils/chat/timeline', () => ({
  getActivityTime: (conv: TChatConversation) => conv.updatedAt || conv.createdAt,
}));

vi.mock('@/renderer/utils/workspace/workspace', () => ({
  getWorkspaceDisplayName: (workspace: string) => `Display: ${workspace}`,
}));

vi.mock('@/renderer/utils/workspace/workspaceHistory', () => ({
  getWorkspaceUpdateTime: (_workspace: string) => 0,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/utils/sortOrderHelpers', () => ({
  getConversationSortOrder: (conv: TChatConversation) => {
    const extra = conv.extra as { sortOrder?: number } | undefined;
    return extra?.sortOrder;
  },
}));

// Mock translation function used in tests
const mockT = (key: string) => key;

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

describe('isCronJobConversation', () => {
  it('returns true when extra.cronJobId exists', () => {
    const conversation: TChatConversation = {
      id: 'conv-1',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { cronJobId: 'job-123' },
      userMsgCount: 0,
    };
    expect(isCronJobConversation(conversation)).toBe(true);
  });

  it('returns false when extra.cronJobId is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-2',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: {},
      userMsgCount: 0,
    };
    expect(isCronJobConversation(conversation)).toBe(false);
  });

  it('returns false when extra is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-3',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      userMsgCount: 0,
    };
    expect(isCronJobConversation(conversation)).toBe(false);
  });

  it('returns false when extra.cronJobId is empty string', () => {
    const conversation: TChatConversation = {
      id: 'conv-4',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { cronJobId: '' },
      userMsgCount: 0,
    };
    expect(isCronJobConversation(conversation)).toBe(false);
  });
});

describe('isConversationPinned', () => {
  it('returns true when extra.pinned is true', () => {
    const conversation: TChatConversation = {
      id: 'conv-1',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { pinned: true },
      userMsgCount: 0,
    };
    expect(isConversationPinned(conversation)).toBe(true);
  });

  it('returns false when extra.pinned is false', () => {
    const conversation: TChatConversation = {
      id: 'conv-2',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { pinned: false },
      userMsgCount: 0,
    };
    expect(isConversationPinned(conversation)).toBe(false);
  });

  it('returns false when extra.pinned is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-3',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: {},
      userMsgCount: 0,
    };
    expect(isConversationPinned(conversation)).toBe(false);
  });

  it('returns false when extra is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-4',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      userMsgCount: 0,
    };
    expect(isConversationPinned(conversation)).toBe(false);
  });
});

describe('getConversationPinnedAt', () => {
  it('returns pinnedAt timestamp when available', () => {
    const conversation: TChatConversation = {
      id: 'conv-1',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { pinnedAt: 5000 },
      userMsgCount: 0,
    };
    expect(getConversationPinnedAt(conversation)).toBe(5000);
  });

  it('returns 0 when pinnedAt is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-2',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: {},
      userMsgCount: 0,
    };
    expect(getConversationPinnedAt(conversation)).toBe(0);
  });

  it('returns 0 when extra is undefined', () => {
    const conversation: TChatConversation = {
      id: 'conv-3',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      userMsgCount: 0,
    };
    expect(getConversationPinnedAt(conversation)).toBe(0);
  });

  it('returns 0 when pinnedAt is not a number', () => {
    const conversation: TChatConversation = {
      id: 'conv-4',
      title: 'Test',
      createdAt: 1000,
      updatedAt: 1000,
      extra: { pinnedAt: 'not-a-number' as unknown },
      userMsgCount: 0,
    };
    expect(getConversationPinnedAt(conversation)).toBe(0);
  });
});

describe('groupConversationsByWorkspace', () => {
  it('groups conversations by workspace', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Test 1',
        createdAt: 3000,
        updatedAt: 3000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Test 2',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
      {
        id: 'conv-3',
        title: 'Test 3',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { workspace: '/path/b', customWorkspace: true },
        userMsgCount: 0,
      },
    ];

    const result = groupConversationsByWorkspace(conversations, [], [], mockT);

    expect(result).toHaveLength(1);
    expect(result[0].timeline).toBe('conversation.history.recents');
    expect(result[0].items).toHaveLength(2);

    // First item should be workspace /path/a (most recent activity)
    const firstItem = result[0].items[0];
    expect(firstItem.type).toBe('workspace');
    expect(firstItem.workspaceGroup?.workspace).toBe('/path/a');
    expect(firstItem.workspaceGroup?.conversations).toHaveLength(2);

    // Second item should be workspace /path/b
    const secondItem = result[0].items[1];
    expect(secondItem.type).toBe('workspace');
    expect(secondItem.workspaceGroup?.workspace).toBe('/path/b');
  });

  it('puts conversations without workspace in timeline', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Test 1',
        createdAt: 3000,
        updatedAt: 3000,
        extra: {},
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Test 2',
        createdAt: 2000,
        updatedAt: 2000,
        userMsgCount: 0,
      },
    ];

    const result = groupConversationsByWorkspace(conversations, [], [], mockT);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].type).toBe('conversation');
    expect(result[0].items[0].conversation?.id).toBe('conv-1');
    expect(result[0].items[1].type).toBe('conversation');
    expect(result[0].items[1].conversation?.id).toBe('conv-2');
  });

  it('sorts items by time descending', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Test 1',
        createdAt: 1000,
        updatedAt: 1000,
        extra: {},
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Test 2',
        createdAt: 5000,
        updatedAt: 5000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
      {
        id: 'conv-3',
        title: 'Test 3',
        createdAt: 3000,
        updatedAt: 3000,
        extra: {},
        userMsgCount: 0,
      },
    ];

    const result = groupConversationsByWorkspace(conversations, [], [], mockT);

    expect(result[0].items[0].time).toBe(5000); // workspace /path/a
    expect(result[0].items[1].time).toBe(3000); // conv-3
    expect(result[0].items[2].time).toBe(1000); // conv-1
  });

  it('returns empty array when no conversations', () => {
    const result = groupConversationsByWorkspace([], [], [], mockT);
    expect(result).toEqual([]);
  });

  it('sorts conversations within workspace groups by activity time', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Test 1',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Test 2',
        createdAt: 3000,
        updatedAt: 3000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
      {
        id: 'conv-3',
        title: 'Test 3',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { workspace: '/path/a', customWorkspace: true },
        userMsgCount: 0,
      },
    ];

    const result = groupConversationsByWorkspace(conversations, [], [], mockT);

    const workspaceGroup = result[0].items[0].workspaceGroup;
    expect(workspaceGroup?.conversations[0].id).toBe('conv-2'); // 3000
    expect(workspaceGroup?.conversations[1].id).toBe('conv-3'); // 2000
    expect(workspaceGroup?.conversations[2].id).toBe('conv-1'); // 1000
  });

  it('requires both workspace and customWorkspace to group', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Test 1',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { workspace: '/path/a' }, // missing customWorkspace
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Test 2',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { customWorkspace: true }, // missing workspace
        userMsgCount: 0,
      },
    ];

    const result = groupConversationsByWorkspace(conversations, [], [], mockT);

    // Both should be treated as without workspace
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].type).toBe('conversation');
    expect(result[0].items[1].type).toBe('conversation');
  });
});

describe('buildGroupedHistory', () => {
  it('separates pinned conversations from normal conversations', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Pinned',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { pinned: true, pinnedAt: 2000 },
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Normal',
        createdAt: 3000,
        updatedAt: 3000,
        extra: {},
        userMsgCount: 0,
      },
    ];

    const result = buildGroupedHistory(conversations, [], [], mockT);

    expect(result.pinnedConversations).toHaveLength(1);
    expect(result.pinnedConversations[0].id).toBe('conv-1');
    expect(result.timelineSections[0].items).toHaveLength(1);
    expect(result.timelineSections[0].items[0].conversation?.id).toBe('conv-2');
  });

  it('excludes cron job conversations from normal conversations', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Normal',
        createdAt: 1000,
        updatedAt: 1000,
        extra: {},
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Cron Job',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { cronJobId: 'job-123' },
        userMsgCount: 0,
      },
    ];

    const result = buildGroupedHistory(conversations, [], [], mockT);

    expect(result.pinnedConversations).toHaveLength(0);
    expect(result.timelineSections[0].items).toHaveLength(1);
    expect(result.timelineSections[0].items[0].conversation?.id).toBe('conv-1');
  });

  it('sorts pinned conversations by sortOrder first', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Pinned 1',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { pinned: true, pinnedAt: 3000, sortOrder: 2000 },
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Pinned 2',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { pinned: true, pinnedAt: 4000, sortOrder: 1000 },
        userMsgCount: 0,
      },
      {
        id: 'conv-3',
        title: 'Pinned 3',
        createdAt: 3000,
        updatedAt: 3000,
        extra: { pinned: true, pinnedAt: 5000 }, // no sortOrder
        userMsgCount: 0,
      },
    ];

    const result = buildGroupedHistory(conversations, [], [], mockT);

    // conv-2 (sortOrder 1000) < conv-1 (sortOrder 2000) < conv-3 (no sortOrder, sorted by pinnedAt)
    expect(result.pinnedConversations[0].id).toBe('conv-2');
    expect(result.pinnedConversations[1].id).toBe('conv-1');
    expect(result.pinnedConversations[2].id).toBe('conv-3');
  });

  it('falls back to pinnedAt when sortOrder is not present', () => {
    const conversations: TChatConversation[] = [
      {
        id: 'conv-1',
        title: 'Pinned 1',
        createdAt: 1000,
        updatedAt: 1000,
        extra: { pinned: true, pinnedAt: 2000 },
        userMsgCount: 0,
      },
      {
        id: 'conv-2',
        title: 'Pinned 2',
        createdAt: 2000,
        updatedAt: 2000,
        extra: { pinned: true, pinnedAt: 3000 },
        userMsgCount: 0,
      },
    ];

    const result = buildGroupedHistory(conversations, [], [], mockT);

    // Descending by pinnedAt: conv-2 (3000) before conv-1 (2000)
    expect(result.pinnedConversations[0].id).toBe('conv-2');
    expect(result.pinnedConversations[1].id).toBe('conv-1');
  });

  it('keeps project conversations out of recents while retaining projects in project groups', () => {
    const project = createProject({ id: 'project-1', name: 'Project One' });
    const projectConversation = createConversation({
      id: 'conversation-project',
      title: 'Project Chat',
      modifyTime: 200,
      projectId: project.id,
      extra: { customWorkspace: false },
    });
    const nonProjectConversation = createConversation({
      id: 'conversation-global',
      title: 'Chat with no project',
      modifyTime: 100,
      extra: { customWorkspace: false },
    });

    const result = buildGroupedHistory([projectConversation, nonProjectConversation], [project], [], mockT);

    expect(result.projectGroups).toHaveLength(1);
    expect(result.projectGroups[0]?.project.id).toBe(project.id);
    expect(result.projectGroups[0]?.chatConversations.map((conversation) => conversation.id)).toEqual([
      projectConversation.id,
    ]);
    expect(result.timelineSections).toHaveLength(1);
    expect(result.timelineSections[0]?.items[0]).toMatchObject({
      type: 'conversation',
      conversation: { id: nonProjectConversation.id },
    });
  });

  it('keeps empty projects visible in project groups', () => {
    const emptyProject = createProject({ id: 'project-empty', name: 'Empty Project' });

    const result = buildGroupedHistory([], [emptyProject], [], mockT);

    expect(result.projectGroups).toHaveLength(1);
    expect(result.projectGroups[0]?.project.id).toBe(emptyProject.id);
    expect(result.projectGroups[0]?.conversations).toEqual([]);
    expect(result.timelineSections).toEqual([]);
  });

  it('keeps the Projects section renderable when there are no conversations yet', () => {
    const emptyProject = createProject({ id: 'project-empty', name: 'Empty Project' });

    const result = buildGroupedHistory([], [emptyProject], [], mockT);

    expect(result.projectGroups.length).toBeGreaterThan(0);
  });

  it('supports projects that contain only teams without crashing', () => {
    const project = createProject({ id: 'project-team-only', name: 'Team Project' });
    const team = createTeam({ id: 'team-1', name: 'Team One', projectId: project.id, updatedAt: 123 });

    const result = buildGroupedHistory([], [project], [team], mockT);

    expect(result.projectGroups).toHaveLength(1);
    expect(result.projectGroups[0]?.project.id).toBe(project.id);
    expect(result.projectGroups[0]?.teams.map((item) => item.id)).toEqual([team.id]);
    expect(result.timelineSections).toEqual([]);
  });

  it('promotes pinned projects into the global pinned section', () => {
    const pinnedProject = createProject({ id: 'project-pinned', name: 'Pinned Project', pinnedAt: 5000 });
    const regularProject = createProject({ id: 'project-regular', name: 'Regular Project' });

    const result = buildGroupedHistory([], [pinnedProject, regularProject], [], mockT);

    expect(result.pinnedProjectGroups.map((group) => group.project.id)).toEqual(['project-pinned']);
    expect(result.projectGroups.map((group) => group.project.id)).toEqual(['project-regular']);
  });

  it('promotes pinned teams into the global pinned section and removes them from project and top-level team lists', () => {
    const project = createProject({ id: 'project-1', name: 'Project One' });
    const pinnedProjectTeam = createTeam({ id: 'team-pinned-project', projectId: project.id, pinnedAt: 4000 });
    const regularProjectTeam = createTeam({ id: 'team-regular-project', projectId: project.id });
    const pinnedUnassignedTeam = createTeam({ id: 'team-pinned-top', pinnedAt: 3000 });
    const regularUnassignedTeam = createTeam({ id: 'team-regular-top' });

    const result = buildGroupedHistory(
      [],
      [project],
      [pinnedProjectTeam, regularProjectTeam, pinnedUnassignedTeam, regularUnassignedTeam],
      mockT
    );

    expect(result.pinnedTeams.map((team) => team.id)).toEqual(['team-pinned-project', 'team-pinned-top']);
    expect(result.projectGroups[0]?.teams.map((team) => team.id)).toEqual(['team-regular-project']);
    expect(result.unassignedTeams.map((team) => team.id)).toEqual(['team-regular-top']);
  });

  it('does not duplicate pinned teams or pinned conversations when their project is already pinned globally', () => {
    const pinnedProject = createProject({ id: 'project-pinned', name: 'Pinned Project', pinnedAt: 5000 });
    const pinnedTeam = createTeam({ id: 'team-pinned', projectId: pinnedProject.id, pinnedAt: 2000 });
    const pinnedConversation = createConversation({
      id: 'conversation-pinned',
      projectId: pinnedProject.id,
      extra: { pinned: true, pinnedAt: 3000 },
    });

    const result = buildGroupedHistory([pinnedConversation], [pinnedProject], [pinnedTeam], mockT);

    expect(result.pinnedProjectGroups.map((group) => group.project.id)).toEqual(['project-pinned']);
    expect(result.pinnedTeams).toEqual([]);
    expect(result.pinnedConversations).toEqual([]);
    expect(result.pinnedProjectGroups[0]?.teams.map((team) => team.id)).toEqual(['team-pinned']);
    expect(result.pinnedProjectGroups[0]?.conversations.map((conversation) => conversation.id)).toEqual([
      'conversation-pinned',
    ]);
  });

  it('groups workspace chats only when customWorkspace is true', () => {
    const workspaceConversation = createConversation({
      id: 'conversation-workspace',
      title: 'Workspace Conversation',
      modifyTime: 200,
      extra: {
        workspace: '/tmp/workspace-a',
        customWorkspace: true,
      },
    });
    const normalConversation = createConversation({
      id: 'conversation-normal',
      title: 'Normal Conversation',
      modifyTime: 100,
      extra: {
        workspace: '/tmp/workspace-a',
        customWorkspace: false,
      },
    });

    const sections = groupConversationsByWorkspace([workspaceConversation, normalConversation], [], [], mockT);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.items).toHaveLength(2);
    expect(
      sections[0]?.items.some((item) => item.type === 'conversation' && item.conversation?.id === normalConversation.id)
    ).toBe(true);
    expect(
      sections[0]?.items.some(
        (item) =>
          item.type === 'workspace' &&
          item.workspaceGroup?.conversations.some((conversation) => conversation.id === workspaceConversation.id)
      )
    ).toBe(true);
  });
});
