import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TChatConversation } from '@/common/config/storage';
import type { GroupedHistoryResult } from '@/renderer/pages/conversation/GroupedHistory/types';

const testState = vi.hoisted(() => ({
  groupedHistory: {
    pinnedConversations: [],
    pinnedProjectGroups: [],
    pinnedTeams: [],
    projectGroups: [],
    unassignedTeams: [],
    timelineSections: [],
  } satisfies GroupedHistoryResult,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    project: {
      update: { invoke: vi.fn() },
      create: { invoke: vi.fn() },
      delete: { invoke: vi.fn() },
    },
    team: {
      updateProject: { invoke: vi.fn() },
      updatePinned: { invoke: vi.fn() },
      updateSortOrder: { invoke: vi.fn() },
    },
  },
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useConversations', () => ({
  useConversations: () => ({
    conversations: [],
    projects: [],
    teams: [],
    isConversationGenerating: () => false,
    hasCompletionUnread: () => false,
    expandedWorkspaces: [],
    pinnedConversations: testState.groupedHistory.pinnedConversations,
    pinnedProjectGroups: testState.groupedHistory.pinnedProjectGroups,
    pinnedTeams: testState.groupedHistory.pinnedTeams,
    projectGroups: testState.groupedHistory.projectGroups,
    unassignedTeams: testState.groupedHistory.unassignedTeams,
    timelineSections: testState.groupedHistory.timelineSections,
    handleToggleWorkspace: vi.fn(),
  }),
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useBatchSelection', () => ({
  useBatchSelection: () => ({
    selectedConversationIds: new Set<string>(),
    setSelectedConversationIds: vi.fn(),
    selectedCount: 0,
    allSelected: false,
    toggleSelectedConversation: vi.fn(),
    handleToggleSelectAll: vi.fn(),
  }),
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useConversationActions', () => ({
  useConversationActions: () => ({
    renameModalVisible: false,
    renameModalName: '',
    setRenameModalName: vi.fn(),
    renameLoading: false,
    dropdownVisibleId: null,
    handleConversationClick: vi.fn(),
    handleDeleteClick: vi.fn(),
    handleBatchDelete: vi.fn(),
    handleEditStart: vi.fn(),
    handleRenameConfirm: vi.fn(),
    handleRenameCancel: vi.fn(),
    handleTogglePin: vi.fn(),
    handleAssignProject: vi.fn(),
    handleMenuVisibleChange: vi.fn(),
    handleOpenMenu: vi.fn(),
  }),
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useExport', () => ({
  useExport: () => ({
    exportTask: null,
    exportModalVisible: false,
    exportTargetPath: '',
    exportModalLoading: false,
    showExportDirectorySelector: false,
    setShowExportDirectorySelector: vi.fn(),
    closeExportModal: vi.fn(),
    handleSelectExportDirectoryFromModal: vi.fn(),
    handleSelectExportFolder: vi.fn(),
    handleExportConversation: vi.fn(),
    handleBatchExport: vi.fn(),
    handleConfirmExport: vi.fn(),
  }),
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    sensors: [],
    activeId: null,
    activeConversation: null,
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
    isDragEnabled: false,
  }),
}));

vi.mock('@/renderer/pages/cron', () => ({
  CronJobIndicator: () => <div />,
  useCronJobsMap: () => ({
    getJobStatus: () => 'none',
    markAsRead: vi.fn(),
    setActiveConversation: vi.fn(),
  }),
}));

vi.mock('@/renderer/components/settings/DirectorySelectionModal', () => ({
  default: () => null,
}));

vi.mock('@/renderer/pages/team/components/TeamCreateModal', () => ({
  default: () => null,
}));

vi.mock('@/renderer/pages/conversation/components/WorkspaceCollapse', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/components/WorkspaceChatCreateModal', () => ({
  default: () => null,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/components/ProjectMemoryModal', () => ({
  default: () => null,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/ConversationRow', () => ({
  default: () => <div data-testid='conversation-row' />,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/SortableConversationRow', () => ({
  default: () => <div data-testid='sortable-conversation-row' />,
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/DragOverlayContent', () => ({
  default: () => <div data-testid='drag-overlay-content' />,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  arrayMove: <T,>(items: T[]) => items,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock('@icon-park/react', () => ({
  Application: () => <span />,
  Code: () => <span />,
  Comment: () => <span />,
  DeleteOne: () => <span />,
  Down: () => <span />,
  EditOne: () => <span />,
  FolderOpen: () => <span />,
  MoreOne: () => <span />,
  Peoples: () => <span />,
  Plus: () => <span />,
  Pushpin: () => <span />,
  Right: () => <span />,
}));

vi.mock('@arco-design/web-react', () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Dropdown: ({ children, droplist }: { children?: React.ReactNode; droplist?: React.ReactNode }) => (
    <div>
      {children}
      {droplist}
    </div>
  ),
  Empty: ({ description }: { description?: React.ReactNode }) => <div>{description}</div>,
  Input: ({
    value,
    onChange,
    placeholder,
    autoFocus,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
  }) => (
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  ),
  Menu: Object.assign(({ children }: { children?: React.ReactNode }) => <div>{children}</div>, {
    Item: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SubMenu: ({ children, title }: { children?: React.ReactNode; title?: React.ReactNode }) => (
      <div>
        {title}
        {children}
      </div>
    ),
  }),
  Message: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import WorkspaceGroupedHistory from '@/renderer/pages/conversation/GroupedHistory';

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

describe('GroupedHistory sidebar visibility contracts', () => {
  beforeEach(() => {
    window.localStorage.clear();
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [],
      timelineSections: [],
    };
  });

  it('shows Projects and top-level Teams sections on first run even when empty', () => {
    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('conversation.history.projectsSection')).toBeInTheDocument();
    expect(screen.getByText('team.sider.title')).toBeInTheDocument();
    expect(screen.getByText('conversation.history.noHistory')).toBeInTheDocument();
  });

  it('keeps team rename and delete actions available in the top-level team menu', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [
        {
          id: 'team-1',
          name: 'Hermes Team',
          createdAt: 1,
          updatedAt: 1,
          agents: [],
        },
      ],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('team.sider.rename')).toBeInTheDocument();
    expect(screen.getByText('team.sider.delete')).toBeInTheDocument();
  });

  it('keeps the project memory action available in project menus', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            rootPath: '/tmp/project-atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('conversation.history.projectMemory')).toBeInTheDocument();
  });

  it('keeps projects collapsed by default until the user expands them', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            rootPath: '/tmp/project-atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.queryByText('conversation.history.projectChatsSection')).not.toBeInTheDocument();
  });

  it('restores stored project expansion state on launch', () => {
    window.localStorage.setItem('aionui:grouped-history:expanded-projects', JSON.stringify(['project-1']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            rootPath: '/tmp/project-atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByLabelText('conversation.history.newChatInProject')).toBeInTheDocument();
    expect(screen.getByLabelText('conversation.history.newWorkspaceChatInProject')).toBeInTheDocument();
    expect(screen.getByLabelText('conversation.history.newTeamInProject')).toBeInTheDocument();
  });

  it('keeps project subsections collapsed by default and renders them in the new order', () => {
    window.localStorage.setItem('aionui:grouped-history:expanded-projects', JSON.stringify(['project-1']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            rootPath: '/tmp/project-atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [createConversation({ id: 'project-chat-1' })],
          workspaceGroups: [
            {
              workspace: 'workspace-1',
              displayName: 'Workspace One',
              conversations: [createConversation({ id: 'workspace-chat-1' })],
            },
          ],
          teams: [
            {
              id: 'team-1',
              name: 'Hermes Team',
              createdAt: 1,
              updatedAt: 1,
              agents: [],
            },
          ],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    const { container } = render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('conversation.history.projectTeamsSection')).toBeInTheDocument();
    expect(screen.getByText('conversation.history.projectWorkspaceChatsSection')).toBeInTheDocument();
    expect(screen.getByText('conversation.history.projectChatsSection')).toBeInTheDocument();
    expect(screen.getByText('conversation.history.projectAssetsSection')).toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryImages')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryDocuments')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryPdfs')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryCodeText')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryOther')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectTeamsPlaceholder')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsPlaceholder')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('conversation-row')).toHaveLength(0);

    const labelOrder = [
      'conversation.history.projectTeamsSection',
      'conversation.history.projectWorkspaceChatsSection',
      'conversation.history.projectChatsSection',
      'conversation.history.projectAssetsSection',
    ].map((text) => container.textContent?.indexOf(text) ?? -1);

    expect(labelOrder[0]).toBeGreaterThan(-1);
    expect(labelOrder[0]).toBeLessThan(labelOrder[1]);
    expect(labelOrder[1]).toBeLessThan(labelOrder[2]);
    expect(labelOrder[2]).toBeLessThan(labelOrder[3]);
  });

  it('restores stored project subsection expansion state on launch', () => {
    window.localStorage.setItem('aionui:grouped-history:expanded-projects', JSON.stringify(['project-1']));
    window.localStorage.setItem(
      'aionui:grouped-history:expanded-project-subsections',
      JSON.stringify(['project:project-1:teams', 'project:project-1:chats'])
    );

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            rootPath: '/tmp/project-atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [createConversation({ id: 'project-chat-1' })],
          workspaceGroups: [],
          teams: [
            {
              id: 'team-1',
              name: 'Hermes Team',
              createdAt: 1,
              updatedAt: 1,
              agents: [],
            },
          ],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('Hermes Team')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-row')).toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsPlaceholder')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryImages')).not.toBeInTheDocument();
  });

  it('hides the project assets subsection when no project folder is assigned', () => {
    window.localStorage.setItem('aionui:grouped-history:expanded-projects', JSON.stringify(['project-1']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.queryByText('conversation.history.projectAssetsSection')).not.toBeInTheDocument();
    expect(screen.queryByText('conversation.history.projectAssetsCategoryImages')).not.toBeInTheDocument();
  });

  it('persists the project subsection expansion choices the user makes', () => {
    window.localStorage.setItem('aionui:grouped-history:expanded-projects', JSON.stringify(['project-1']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    fireEvent.click(screen.getByText('conversation.history.projectTeamsSection'));
    fireEvent.click(screen.getByText('conversation.history.projectChatsSection'));

    expect(
      JSON.parse(window.localStorage.getItem('aionui:grouped-history:expanded-project-subsections') ?? '[]')
    ).toEqual(['project:project-1:teams', 'project:project-1:chats']);
  });

  it('persists the project expansion choices the user makes', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [
        {
          project: {
            id: 'project-1',
            name: 'Project Atlas',
            createdAt: 1,
            updatedAt: 1,
          },
          conversations: [],
          chatConversations: [],
          workspaceGroups: [],
          teams: [],
        },
      ],
      unassignedTeams: [],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    fireEvent.click(screen.getByText('Project Atlas'));

    expect(JSON.parse(window.localStorage.getItem('aionui:grouped-history:expanded-projects') ?? '[]')).toEqual([
      'project-1',
    ]);
  });

  it('restores the collapsed top-level teams section from user preferences', () => {
    window.localStorage.setItem('aionui:grouped-history:collapsed-sections', JSON.stringify(['teams']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [
        {
          id: 'team-1',
          name: 'Hermes Team',
          createdAt: 1,
          updatedAt: 1,
          agents: [],
        },
      ],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.queryByText('team.sider.rename')).not.toBeInTheDocument();
  });

  it('persists the collapsed recent-chat timeline sections from user preferences', () => {
    window.localStorage.setItem('aionui:grouped-history:collapsed-sections', JSON.stringify(['Today']));

    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [],
      timelineSections: [
        {
          timeline: 'Today',
          items: [
            {
              type: 'conversation',
              time: 1000,
              conversation: createConversation({ id: 'recent-chat' }),
            },
          ],
        },
      ],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.queryByTestId('conversation-row')).not.toBeInTheDocument();
  });

  it('stores explicit collapse choices for teams and recent chats sections', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [
        {
          id: 'team-1',
          name: 'Hermes Team',
          createdAt: 1,
          updatedAt: 1,
          agents: [],
        },
      ],
      timelineSections: [
        {
          timeline: 'Today',
          items: [
            {
              type: 'conversation',
              time: 1000,
              conversation: createConversation({ id: 'recent-chat' }),
            },
          ],
        },
      ],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    fireEvent.click(screen.getByText('team.sider.title'));
    fireEvent.click(screen.getByText('Today'));

    expect(JSON.parse(window.localStorage.getItem('aionui:grouped-history:collapsed-sections') ?? '[]')).toEqual([
      'teams',
      'Today',
    ]);
  });

  it('shows a top-level teams reorder control when the teams section is expanded', () => {
    testState.groupedHistory = {
      pinnedConversations: [],
      pinnedProjectGroups: [],
      pinnedTeams: [],
      projectGroups: [],
      unassignedTeams: [
        {
          id: 'team-1',
          name: 'Hermes Team',
          createdAt: 1,
          updatedAt: 1,
          agents: [],
        },
        {
          id: 'team-2',
          name: 'Claude Team',
          createdAt: 2,
          updatedAt: 2,
          agents: [],
        },
      ],
      timelineSections: [],
    };

    render(<WorkspaceGroupedHistory collapsed={false} />);

    expect(screen.getByText('team.sider.reorderModeEnter')).toBeInTheDocument();
  });
});
