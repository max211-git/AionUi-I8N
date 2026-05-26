/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TTeam } from '@/common/types/teamTypes';
import type { TProject } from '@/common/adapter/ipcBridge';
import type { TChatConversation } from '@/common/config/storage';

export type WorkspaceGroup = {
  workspace: string;
  displayName: string;
  conversations: TChatConversation[];
};

export type ProjectGroup = {
  project: TProject;
  conversations: TChatConversation[];
  chatConversations: TChatConversation[];
  workspaceGroups: WorkspaceGroup[];
  teams: TTeam[];
};

export type TimelineItem = {
  type: 'workspace' | 'project' | 'conversation';
  time: number;
  workspaceGroup?: WorkspaceGroup;
  projectGroup?: ProjectGroup;
  conversation?: TChatConversation;
};

export type TimelineSection = {
  timeline: string;
  items: TimelineItem[];
};

export type GroupedHistoryResult = {
  pinnedConversations: TChatConversation[];
  pinnedProjectGroups: ProjectGroup[];
  pinnedTeams: TTeam[];
  projectGroups: ProjectGroup[];
  unassignedTeams: TTeam[];
  timelineSections: TimelineSection[];
};

export type ExportZipFile = {
  name: string;
  content?: string;
  sourcePath?: string;
};

export type ExportTask =
  | { mode: 'single'; conversation: TChatConversation }
  | { mode: 'batch'; conversationIds: string[] }
  | null;

export type ConversationRowProps = {
  conversation: TChatConversation;
  isGenerating: boolean;
  hasCompletionUnread: boolean;
  collapsed: boolean;
  tooltipEnabled: boolean;
  batchMode: boolean;
  checked: boolean;
  selected: boolean;
  menuVisible: boolean;
  suppressPinnedIndicator?: boolean;
  onToggleChecked: (conversation: TChatConversation) => void;
  onConversationClick: (conversation: TChatConversation) => void;
  onOpenMenu: (conversation: TChatConversation) => void;
  onMenuVisibleChange: (conversationId: string, visible: boolean) => void;
  onEditStart: (conversation: TChatConversation) => void;
  onDelete: (conversationId: string) => void;
  onExport?: (conversation: TChatConversation) => void;
  onTogglePin: (conversation: TChatConversation) => void;
  onAssignProject?: (conversation: TChatConversation, projectId?: string) => void;
  projects?: TProject[];
  currentProjectId?: string;
  getJobStatus: (conversationId: string) => 'none' | 'active' | 'paused' | 'error' | 'unread';
};

export type WorkspaceGroupedHistoryProps = {
  onSessionClick?: () => void;
  collapsed?: boolean;
  tooltipEnabled?: boolean;
  batchMode?: boolean;
  onBatchModeChange?: (value: boolean) => void;
  historyExpansionRequest?: { mode: 'expand' | 'collapse'; seq: number } | null;
  onHistoryExpansionStateChange?: (state: { hasExpandableItems: boolean; fullyExpanded: boolean }) => void;
};

export type DragItemType = 'conversation' | 'workspace';

export type DragItem = {
  type: DragItemType;
  id: string;
  conversation?: TChatConversation;
  workspaceGroup?: WorkspaceGroup;
  sourceSection: 'pinned' | string;
  sourceWorkspace?: string;
};
