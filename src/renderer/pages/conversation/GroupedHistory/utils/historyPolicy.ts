import type { TChatConversation } from '@/common/config/storage';
import type { TTeam } from '@/common/types/teamTypes';
import { getActivityTime } from '@/renderer/utils/chat/timeline';

import type { ProjectGroup } from '../types';

const isTeamPinned = (team: TTeam): boolean => Boolean(team.pinnedAt);
const getTeamSortOrder = (team: TTeam): number | undefined => team.sortOrder;

export const isTeamOwnedConversation = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { teamId?: string } | undefined;
  return Boolean(extra?.teamId);
};

export const shouldDisplayConversationInSidebar = (conversation: TChatConversation): boolean =>
  !isTeamOwnedConversation(conversation);

export const sortTeamsBySidebarPriority = (teams: TTeam[]): TTeam[] =>
  [...teams].toSorted((a, b) => {
    const pinnedDiff = Number(isTeamPinned(b)) - Number(isTeamPinned(a));
    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }
    const orderA = getTeamSortOrder(a);
    const orderB = getTeamSortOrder(b);
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) {
      return -1;
    }
    if (orderB !== undefined) {
      return 1;
    }
    return b.updatedAt - a.updatedAt;
  });

export const getProjectGroupLatestActivityTime = (projectGroup: ProjectGroup): number =>
  Math.max(
    ...projectGroup.conversations.map((conversation) => getActivityTime(conversation)),
    projectGroup.teams[0]?.updatedAt ?? 0,
    projectGroup.project.updatedAt
  );

export const sortProjectGroupsBySidebarPriority = (projectGroups: ProjectGroup[]): ProjectGroup[] =>
  [...projectGroups].toSorted((a, b) => {
    const pinnedDiff = (b.project.pinnedAt ?? 0) - (a.project.pinnedAt ?? 0);
    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }
    return getProjectGroupLatestActivityTime(b) - getProjectGroupLatestActivityTime(a);
  });
