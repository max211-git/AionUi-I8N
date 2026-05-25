import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupedHistoryResult } from '@/renderer/pages/conversation/GroupedHistory/types';

const testState = vi.hoisted(() => ({
  groupedHistory: {
    pinnedConversations: [],
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
    projectGroups: testState.groupedHistory.projectGroups,
    unassignedTeams: testState.groupedHistory.unassignedTeams,
    timelineSections: testState.groupedHistory.timelineSections,
    handleToggleWorkspace: vi.fn(),
  }),
}));

vi.mock('@/renderer/pages/conversation/GroupedHistory/hooks/useBatchSelection', () => ({
  useBatchSelection: () => ({
    selectedConversationIds: [],
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
  KeyboardSensor: class {},
  PointerSensor: class {},
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
  Pin: () => <span />,
  Plus: () => <span />,
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

describe('GroupedHistory sidebar visibility contracts', () => {
  beforeEach(() => {
    testState.groupedHistory = {
      pinnedConversations: [],
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

    expect(screen.getByText('conversation.history.projectMemory')).toBeInTheDocument();
  });
});
