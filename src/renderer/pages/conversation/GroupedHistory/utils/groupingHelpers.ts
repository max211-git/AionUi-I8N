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
import {
  shouldDisplayConversationInSidebar,
  sortProjectGroupsBySidebarPriority,
  sortTeamsBySidebarPriority,
} from './historyPolicy';
import { getConversationSortOrder } from './sortOrderHelpers';

const isProjectPinned = (project: TProject): boolean => Boolean(project.pinnedAt);
const isTeamPinned = (team: TTeam): boolean => Boolean(team.pinnedAt);

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

const getLatestActivityTime = (conversations: TChatConversation[]): number => {
  if (conversations.length === 0) {
    return 0;
  }

  return conversations.reduce((latest, conversation) => Math.max(latest, getActivityTime(conversation)), 0);
};

const buildProjectConversationMaps = (conversations: TChatConversation[], projects: TProject[], teams: TTeam[]) => {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const allProjectIds = new Set<string>(projects.map((project) => project.id));
  const allProjectGroups = new Map<string, TChatConversation[]>();
  const teamsByProject = new Map<string, TTeam[]>();

  teams.forEach((team) => {
    if (!team.projectId) {
      return;
    }
    allProjectIds.add(team.projectId);
    if (!teamsByProject.has(team.projectId)) {
      teamsByProject.set(team.projectId, []);
    }
    teamsByProject.get(team.projectId)?.push(team);
  });

  conversations.forEach((conv) => {
    if (!conv.projectId) {
      return;
    }
    const project = projectMap.get(conv.projectId);
    if (!project) {
      return;
    }
    allProjectIds.add(project.id);
    if (!allProjectGroups.has(project.id)) {
      allProjectGroups.set(project.id, []);
    }
    allProjectGroups.get(project.id)?.push(conv);
  });

  return {
    allProjectIds,
    allProjectGroups,
    teamsByProject,
  };
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
      const latestA = Math.max(getWorkspaceUpdateTime(a.workspace), getLatestActivityTime(a.conversations));
      const latestB = Math.max(getWorkspaceUpdateTime(b.workspace), getLatestActivityTime(b.conversations));
      return latestB - latestA;
    });

  return {
    project,
    conversations: sortedConvs,
    chatConversations,
    workspaceGroups,
    teams: sortTeamsBySidebarPriority(teams),
  };
};

export const groupConversationsByWorkspace = (
  conversations: TChatConversation[],
  projects: TProject[],
  teams: TTeam[],
  t: (key: string) => string
): TimelineSection[] => {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const { allProjectIds, allProjectGroups, teamsByProject } = buildProjectConversationMaps(
    conversations,
    projects,
    teams
  );
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
    const latestConversationTime = getLatestActivityTime(projectGroup.conversations);
    const latestTeamTime = projectGroup.teams[0]?.updatedAt ?? 0;
    items.push({
      type: 'project',
      time: Math.max(latestConversationTime, latestTeamTime, project.updatedAt),
      projectGroup,
    });
  });

  allWorkspaceGroups.forEach((convList, workspace) => {
    const sortedConvs = [...convList].toSorted((a, b) => getActivityTime(b) - getActivityTime(a));
    const latestConversationTime = getLatestActivityTime(sortedConvs);
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

export const buildGroupedHistory = (
  conversations: TChatConversation[],
  projects: TProject[],
  teams: TTeam[],
  t: (key: string) => string
): GroupedHistoryResult => {
  // Filter out team-owned conversations; they are only visible via the Teams panel
  const visibleConversations = conversations.filter(shouldDisplayConversationInSidebar);
  const pinnedProjectIds = new Set(projects.filter(isProjectPinned).map((project) => project.id));
  const pinnedProjectGroups = sortProjectGroupsBySidebarPriority(
    projects.filter(isProjectPinned).map((project) =>
      buildProjectGroup(
        project,
        visibleConversations.filter((conversation) => conversation.projectId === project.id),
        teams.filter((team) => team.projectId === project.id)
      )
    )
  );
  const pinnedTeams = sortTeamsBySidebarPriority(
    teams.filter((team) => isTeamPinned(team) && !pinnedProjectIds.has(team.projectId ?? ''))
  );

  const pinnedConversations = visibleConversations
    .filter((conversation) => isConversationPinned(conversation) && !pinnedProjectIds.has(conversation.projectId ?? ''))
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
  const unpinnedProjects = projects.filter((project) => !isProjectPinned(project));
  const nonPinnedTeams = teams.filter((team) => !isTeamPinned(team));
  const { allProjectGroups, teamsByProject } = buildProjectConversationMaps(
    normalConversations,
    unpinnedProjects,
    nonPinnedTeams
  );

  const projectGroups = sortProjectGroupsBySidebarPriority(
    unpinnedProjects.map((project) =>
      buildProjectGroup(project, allProjectGroups.get(project.id) ?? [], teamsByProject.get(project.id) ?? [])
    )
  );

  const unassignedTeams = sortTeamsBySidebarPriority(nonPinnedTeams.filter((team) => !team.projectId));
  const nonProjectConversations = normalConversations.filter((conversation) => !conversation.projectId);

  return {
    pinnedConversations,
    pinnedProjectGroups,
    pinnedTeams,
    projectGroups,
    unassignedTeams,
    timelineSections: groupConversationsByWorkspace(nonProjectConversations, [], teams, t),
  };
};
