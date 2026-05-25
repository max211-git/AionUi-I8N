import { getSidebarSectionVisibility } from '@/renderer/pages/conversation/GroupedHistory/utils/sectionVisibility';
import { describe, expect, it } from 'vitest';

describe('GroupedHistory sidebar section visibility contracts', () => {
  it('keeps Projects and top-level Teams sections visible on first run', () => {
    const result = getSidebarSectionVisibility({
      pinnedConversationCount: 0,
      projectGroupCount: 0,
      unassignedTeamCount: 0,
      timelineSectionCount: 0,
    });

    expect(result.showProjectsSection).toBe(true);
    expect(result.showTeamsSection).toBe(true);
    expect(result.showProjectReorderControl).toBe(false);
    expect(result.showUnassignedTeamsList).toBe(false);
    expect(result.showEmptyHistoryState).toBe(true);
  });

  it('shows content-specific affordances only when matching data exists', () => {
    const result = getSidebarSectionVisibility({
      pinnedConversationCount: 1,
      projectGroupCount: 2,
      unassignedTeamCount: 1,
      timelineSectionCount: 1,
    });

    expect(result.showProjectsSection).toBe(true);
    expect(result.showTeamsSection).toBe(true);
    expect(result.showProjectReorderControl).toBe(true);
    expect(result.showUnassignedTeamsList).toBe(true);
    expect(result.showEmptyHistoryState).toBe(false);
  });
});
