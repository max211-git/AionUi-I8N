import type { TTeam } from '@/common/types/teamTypes';

export type TeamReorderPlan = {
  activePinned: boolean;
  relevantIds: string[];
  nextRelevantIds: string[];
  baseSortOrder: number;
};

const isPinnedTeam = (team: TTeam): boolean => Boolean(team.pinnedAt);

export const sortTeamsByManualOrder = (teams: TTeam[], manualTeamOrder: string[]): TTeam[] => {
  const orderMap = new Map(manualTeamOrder.map((teamId, index) => [teamId, index]));
  return [...teams].toSorted((a, b) => {
    const pinnedDiff = Number(isPinnedTeam(b)) - Number(isPinnedTeam(a));
    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }
    const aIndex = orderMap.get(a.id);
    const bIndex = orderMap.get(b.id);
    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }
    if (aIndex !== undefined) {
      return -1;
    }
    if (bIndex !== undefined) {
      return 1;
    }
    return 0;
  });
};

export const buildTeamReorderPlan = (
  orderedTeams: TTeam[],
  activeTeamId: string,
  overTeamId: string
): TeamReorderPlan | null => {
  const activeTeam = orderedTeams.find((team) => team.id === activeTeamId);
  const overTeam = orderedTeams.find((team) => team.id === overTeamId);
  if (!activeTeam || !overTeam) {
    return null;
  }

  const activePinned = isPinnedTeam(activeTeam);
  if (activePinned !== isPinnedTeam(overTeam)) {
    return null;
  }

  const relevantIds = orderedTeams.filter((team) => isPinnedTeam(team) === activePinned).map((team) => team.id);
  const oldIndex = relevantIds.indexOf(activeTeamId);
  const newIndex = relevantIds.indexOf(overTeamId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null;
  }

  const nextRelevantIds = [...relevantIds];
  const [movedTeamId] = nextRelevantIds.splice(oldIndex, 1);
  nextRelevantIds.splice(newIndex, 0, movedTeamId);

  return {
    activePinned,
    relevantIds,
    nextRelevantIds,
    baseSortOrder: activePinned ? 0 : 1000,
  };
};
