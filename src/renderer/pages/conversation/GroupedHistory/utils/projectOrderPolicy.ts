import type { ProjectGroup } from '../types';

export type ProjectReorderPlan = {
  activePinned: boolean;
  relevantIds: string[];
  nextRelevantIds: string[];
  baseSortOrder: number;
};

const isPinnedProjectGroup = (projectGroup: ProjectGroup): boolean => Boolean(projectGroup.project.pinnedAt);

export const sortProjectGroupsByManualOrder = (
  projectGroups: ProjectGroup[],
  manualProjectOrder: string[]
): ProjectGroup[] => {
  const orderMap = new Map(manualProjectOrder.map((projectId, index) => [projectId, index]));
  return [...projectGroups].toSorted((a, b) => {
    const pinnedDiff = Number(isPinnedProjectGroup(b)) - Number(isPinnedProjectGroup(a));
    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }
    const aIndex = orderMap.get(a.project.id);
    const bIndex = orderMap.get(b.project.id);
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

export const buildProjectReorderPlan = (
  orderedProjectGroups: ProjectGroup[],
  activeProjectId: string,
  overProjectId: string
): ProjectReorderPlan | null => {
  const activeGroup = orderedProjectGroups.find((group) => group.project.id === activeProjectId);
  const overGroup = orderedProjectGroups.find((group) => group.project.id === overProjectId);
  if (!activeGroup || !overGroup) {
    return null;
  }

  const activePinned = isPinnedProjectGroup(activeGroup);
  if (activePinned !== isPinnedProjectGroup(overGroup)) {
    return null;
  }

  const relevantIds = orderedProjectGroups
    .filter((group) => isPinnedProjectGroup(group) === activePinned)
    .map((group) => group.project.id);
  const oldIndex = relevantIds.indexOf(activeProjectId);
  const newIndex = relevantIds.indexOf(overProjectId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null;
  }

  const nextRelevantIds = [...relevantIds];
  const [movedProjectId] = nextRelevantIds.splice(oldIndex, 1);
  nextRelevantIds.splice(newIndex, 0, movedProjectId);

  return {
    activePinned,
    relevantIds,
    nextRelevantIds,
    baseSortOrder: activePinned ? 0 : 1000,
  };
};
