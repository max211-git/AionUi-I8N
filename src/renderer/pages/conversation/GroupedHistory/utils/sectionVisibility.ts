type SidebarSectionVisibilityParams = {
  pinnedConversationCount: number;
  projectGroupCount: number;
  unassignedTeamCount: number;
  timelineSectionCount: number;
};

export type SidebarSectionVisibility = {
  showProjectsSection: boolean;
  showTeamsSection: boolean;
  showProjectReorderControl: boolean;
  showUnassignedTeamsList: boolean;
  showEmptyHistoryState: boolean;
};

export const getSidebarSectionVisibility = ({
  pinnedConversationCount,
  projectGroupCount,
  unassignedTeamCount,
  timelineSectionCount,
}: SidebarSectionVisibilityParams): SidebarSectionVisibility => {
  const hasSidebarContent =
    pinnedConversationCount > 0 || projectGroupCount > 0 || unassignedTeamCount > 0 || timelineSectionCount > 0;

  return {
    showProjectsSection: true,
    showTeamsSection: true,
    showProjectReorderControl: projectGroupCount > 0,
    showUnassignedTeamsList: unassignedTeamCount > 0,
    showEmptyHistoryState: !hasSidebarContent,
  };
};
