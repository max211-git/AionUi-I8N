/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TProject } from '@/common/adapter/ipcBridge';
import type { TChatConversation } from '@/common/config/storage';
import type { TTeam } from '@/common/types/teamTypes';
import { getActivityTime } from '@/renderer/utils/chat/timeline';
import { getWorkspaceDisplayName } from '@/renderer/utils/workspace/workspace';
import { getWorkspaceUpdateTime } from '@/renderer/utils/workspace/workspaceHistory';

import type { GroupedHistoryResult, ProjectGroup, TimelineItem, TimelineSection, WorkspaceGroup } from '../types';
import { getConversationSortOrder } from './sortOrderHelpers';

export const isConversationPinned = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { pinned?: boolean } | undefined;
  return Boolean(extra?.pinned);
};

export const isCronJobConversation = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { cronJobId?: string } | undefined;
  return Boolean(extra?.cronJobId);
};

export const getConversationPinnedAt = (conversation: TChatConversation): number => {
  const extra = conversation.extra as { pinnedAt?: number } | undefined;
  if (typeof extra?.pinnedAt === 'number') {
    return extra.pinnedAt;
  }
  return 0;
};

const getConversationWorkspace = (conversation: TChatConversation): string | undefined => {
  if (conversation.extra?.customWorkspace !== true) {
    return undefined;
  }
  const workspace = conversation.extra?.workspace;
  return typeof workspace === 'string' && workspace.trim() ? workspace : undefined;
};

const buildProjectGroup = (
  project: TProject,
  conversations: TChatConversation[],
  teams: TTeam[] = []
): ProjectGroup => {
  const sortedConvs = [...conversations].toSorted((a, b) => getActivityTime(b) - getActivityTime(a));
  const workspaceGroupsByPath = new Map<string, TChatConversation[]>();
  const chatConversations: TChatConversation[] = [];

  sortedConvs.forEach((conversation) => {
    const workspace = getConversationWorkspace(conversation);
    if (workspace) {
      if (!workspaceGroupsByPath.has(workspace)) {
        workspaceGroupsByPath.set(workspace, []);
      }
      workspaceGroupsByPath.get(workspace)?.push(conversation);
      return;
    }
    chatConversations.push(conversation);
  });

  const workspaceGroups: WorkspaceGroup[] = [...workspaceGroupsByPath.entries()]
    .map(([workspace, workspaceConversations]) => ({
      workspace,
      displayName: getWorkspaceDisplayName(workspace),
      conversations: workspaceConversations.toSorted((a, b) => getActivityTime(b) - getActivityTime(a)),
    }))
    .toSorted((a, b) => {
      const latestA = Math.max(getWorkspaceUpdateTime(a.workspace), getActivityTime(a.conversations[0]));
      const latestB = Math.max(getWorkspaceUpdateTime(b.workspace), getActivityTime(b.conversations[0]));
      return latestB - latestA;
    });

  return {
    project,
    conversations: sortedConvs,
    chatConversations,
    workspaceGroups,
    teams: [...teams].toSorted((a, b) => b.updatedAt - a.updatedAt),
  };
};

export const groupConversationsByWorkspace = (
  conversations: TChatConversation[],
  projects: TProject[],
  teamsOrT: TTeam[] | ((key: string) => string),
  maybeT?: (key: string) => string
): TimelineSection[] => {
  const teams = Array.isArray(teamsOrT) ? teamsOrT : [];
  const t = Array.isArray(teamsOrT) ? maybeT : teamsOrT;
  if (!t) {
    return [];
  }
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const teamsByProject = new Map<string, TTeam[]>();
  teams.forEach((team) => {
    if (!team.projectId || !projectMap.has(team.projectId)) {
      return;
    }
    const current = teamsByProject.get(team.projectId) ?? [];
    current.push(team);
    teamsByProject.set(team.projectId, current);
  });
  const allProjectIds = new Set<string>(teamsByProject.keys());
  const allProjectGroups = new Map<string, TChatConversation[]>();
  const allWorkspaceGroups = new Map<string, TChatConversation[]>();
  const withoutWorkspaceConvs: TChatConversation[] = [];

  conversations.forEach((conv) => {
    if (conv.projectId) {
      const project = projectMap.get(conv.projectId);
      if (project) {
        allProjectIds.add(project.id);
        if (!allProjectGroups.has(project.id)) {
          allProjectGroups.set(project.id, []);
        }
        allProjectGroups.get(project.id)?.push(conv);
        return;
      }
    }

    const workspace = getConversationWorkspace(conv);

    if (workspace) {
      if (!allWorkspaceGroups.has(workspace)) {
        allWorkspaceGroups.set(workspace, []);
      }
      allWorkspaceGroups.get(workspace)?.push(conv);
    } else {
      withoutWorkspaceConvs.push(conv);
    }
  });

  const items: TimelineItem[] = [];

  allProjectIds.forEach((projectId) => {
    const project = projectMap.get(projectId);
    if (!project) {
      return;
    }
    const projectGroup = buildProjectGroup(
      project,
      allProjectGroups.get(projectId) ?? [],
      teamsByProject.get(projectId) ?? []
    );
    const latestConversationTime = getActivityTime(projectGroup.conversations[0]);
    const latestTeamTime = projectGroup.teams[0]?.updatedAt ?? 0;
    items.push({
      type: 'project',
      time: Math.max(latestConversationTime, latestTeamTime, project.updatedAt),
      projectGroup,
    });
  });

  allWorkspaceGroups.forEach((convList, workspace) => {
    const sortedConvs = [...convList].toSorted((a, b) => getActivityTime(b) - getActivityTime(a));
    const latestConversationTime = getActivityTime(sortedConvs[0]);
    const updateTime = getWorkspaceUpdateTime(workspace);
    const time = Math.max(updateTime, latestConversationTime);
    items.push({
      type: 'workspace',
      time,
      workspaceGroup: {
        workspace,
        displayName: getWorkspaceDisplayName(workspace),
        conversations: sortedConvs,
      },
    });
  });

  withoutWorkspaceConvs.forEach((conv) => {
    items.push({
      type: 'conversation',
      time: getActivityTime(conv),
      conversation: conv,
    });
  });

  items.sort((a, b) => b.time - a.time);

  if (items.length === 0) return [];

  return [
    {
      timeline: t('conversation.history.recents'),
      items,
    },
  ];
};

/** Check whether a conversation belongs to a team (should be hidden from sidebar). */
const isTeamConversation = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { teamId?: string } | undefined;
  return Boolean(extra?.teamId);
};

export const buildGroupedHistory = (
  conversations: TChatConversation[],
  projects: TProject[],
  teamsOrT: TTeam[] | ((key: string) => string),
  maybeT?: (key: string) => string
): GroupedHistoryResult => {
  const teams = Array.isArray(teamsOrT) ? teamsOrT : [];
  const t = Array.isArray(teamsOrT) ? maybeT : teamsOrT;
  if (!t) {
    return {
      pinnedConversations: [],
      unassignedProjects: projects,
      unassignedTeams: teams,
      timelineSections: [],
    };
  }
  // Filter out team-owned conversations; they are only visible via the Teams panel
  const visibleConversations = conversations.filter((conv) => !isTeamConversation(conv));

  const pinnedConversations = visibleConversations
    .filter((conversation) => isConversationPinned(conversation))
    .toSorted((a, b) => {
      const orderA = getConversationSortOrder(a);
      const orderB = getConversationSortOrder(b);
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;
      return getConversationPinnedAt(b) - getConversationPinnedAt(a);
    });

  const normalConversations = visibleConversations.filter(
    (conversation) => !isConversationPinned(conversation) && !isCronJobConversation(conversation)
  );

  const projectIdsWithConversations = new Set<string>();
  normalConversations.forEach((conversation) => {
    if (conversation.projectId) {
      projectIdsWithConversations.add(conversation.projectId);
    }
  });
  const projectIdsWithTeams = new Set(
    teams.map((team) => team.projectId).filter((projectId): projectId is string => Boolean(projectId))
  );
  const unassignedProjects = projects.filter(
    (project) => !projectIdsWithConversations.has(project.id) && !projectIdsWithTeams.has(project.id)
  );
  const unassignedTeams = teams.filter((team) => !team.projectId);

  return {
    pinnedConversations,
    unassignedProjects,
    unassignedTeams,
    timelineSections: groupConversationsByWorkspace(normalConversations, projects, teams, t),
  };
};
