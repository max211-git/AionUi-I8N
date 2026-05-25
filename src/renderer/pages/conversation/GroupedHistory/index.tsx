/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TProject } from '@/common/adapter/ipcBridge';
import type { TChatConversation } from '@/common/config/storage';
import type { TTeam } from '@/common/types/teamTypes';
import DirectorySelectionModal from '@/renderer/components/settings/DirectorySelectionModal';
import TeamCreateModal from '@/renderer/pages/team/components/TeamCreateModal';
import { CronJobIndicator, useCronJobsMap } from '@/renderer/pages/cron';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Dropdown, Empty, Input, Menu, Message, Modal, Select } from '@arco-design/web-react';
import {
  Application,
  Code,
  Comment,
  DeleteOne,
  Down,
  EditOne,
  FolderOpen,
  MoreOne,
  Peoples,
  Pin,
  Plus,
  Right,
} from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import WorkspaceCollapse from '../components/WorkspaceCollapse';
import WorkspaceChatCreateModal from './components/WorkspaceChatCreateModal';
import ConversationRow from './ConversationRow';
import DragOverlayContent from './DragOverlayContent';
import SortableConversationRow from './SortableConversationRow';
import { useBatchSelection } from './hooks/useBatchSelection';
import { useConversationActions } from './hooks/useConversationActions';
import { useConversations } from './hooks/useConversations';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useExport } from './hooks/useExport';
import { refreshConversationListSync } from './hooks/useConversationListSync';
import type { ConversationRowProps, ProjectGroup, WorkspaceGroupedHistoryProps } from './types';
import { buildProjectReorderPlan, sortProjectGroupsByManualOrder } from './utils/projectOrderPolicy';
import { getSidebarSectionVisibility } from './utils/sectionVisibility';

const STICKY_SECTION_HEADER_CLASS_NAME =
  'sticky top-0 z-10 mx-8px mb-2px rounded-10px border border-solid border-[rgba(var(--primary-6),0.12)] bg-[rgba(var(--primary-6),0.08)] px-12px py-8px backdrop-blur-8px';

type SortableProjectCardProps = {
  projectGroup: ProjectGroup;
  reorderMode: boolean;
  renderProjectGroup: (
    projectGroup: ProjectGroup,
    reorderMode?: boolean,
    dragListeners?: { attributes: ReturnType<typeof useSortable>['attributes']; listeners: ReturnType<typeof useSortable>['listeners'] }
  ) => React.ReactNode;
};

const SortableProjectCard: React.FC<SortableProjectCardProps> = ({ projectGroup, reorderMode, renderProjectGroup }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: projectGroup.project.id,
    disabled: !reorderMode,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.42 : 1,
      }}
      className={classNames(
        reorderMode && 'transition-shadow transition-transform duration-150',
        reorderMode && !isDragging && 'hover:-translate-y-1px hover:shadow-[0_6px_18px_rgba(var(--primary-6),0.12)]',
        isDragging && 'z-20'
      )}
    >
      {renderProjectGroup(projectGroup, reorderMode, { attributes, listeners })}
    </div>
  );
};

const WorkspaceGroupedHistory: React.FC<WorkspaceGroupedHistoryProps> = ({
  onSessionClick,
  collapsed = false,
  tooltipEnabled = false,
  batchMode = false,
  onBatchModeChange,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getJobStatus, markAsRead, setActiveConversation } = useCronJobsMap();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [projectEditModalVisible, setProjectEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectRootPath, setProjectRootPath] = useState('');
  const [teamAssignProjectVisible, setTeamAssignProjectVisible] = useState(false);
  const [teamAssignProjectLoading, setTeamAssignProjectLoading] = useState(false);
  const [teamAssignProjectTeam, setTeamAssignProjectTeam] = useState<TTeam | null>(null);
  const [teamAssignProjectId, setTeamAssignProjectId] = useState<string | undefined>(undefined);
  const [teamRenameVisible, setTeamRenameVisible] = useState(false);
  const [teamRenameLoading, setTeamRenameLoading] = useState(false);
  const [teamRenameTarget, setTeamRenameTarget] = useState<TTeam | null>(null);
  const [teamRenameName, setTeamRenameName] = useState('');
  const [workspaceChatCreateProject, setWorkspaceChatCreateProject] = useState<TProject | null>(null);
  const [teamCreateProject, setTeamCreateProject] = useState<TProject | null>(null);
  const topLevelTeamDraftProject = useMemo<TProject>(() => ({ id: '', name: '', createdAt: 0, updatedAt: 0 }), []);
  const [projectSaving, setProjectSaving] = useState(false);
  const [isProjectReorderMode, setIsProjectReorderMode] = useState(false);
  const [manualProjectOrder, setManualProjectOrder] = useState<string[]>([]);
  const [activeProjectGroup, setActiveProjectGroup] = useState<ProjectGroup | null>(null);
  const projectReorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // This doesn't trigger state update, avoiding double render
  useEffect(() => {
    if (id) {
      setActiveConversation(id);
    }
  }, [id, setActiveConversation]);

  const {
    conversations,
    projects,
    isConversationGenerating,
    hasCompletionUnread,
    expandedWorkspaces,
    pinnedConversations,
    projectGroups,
    unassignedTeams,
    timelineSections,
    handleToggleWorkspace,
  } = useConversations();

  const orderedProjectGroups = useMemo(() => {
    return sortProjectGroupsByManualOrder(projectGroups, manualProjectOrder);
  }, [manualProjectOrder, projectGroups]);

  const handleProjectDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      const projectGroup = orderedProjectGroups.find((group) => group.project.id === String(event.active.id));
      setActiveProjectGroup(projectGroup ?? null);
    },
    [orderedProjectGroups]
  );

  const handleProjectDragCancel = useCallback(() => {
    setActiveProjectGroup(null);
  }, []);

  const handleProjectDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveProjectGroup(null);
      if (!over || active.id === over.id) {
        return;
      }

      const reorderPlan = buildProjectReorderPlan(orderedProjectGroups, String(active.id), String(over.id));
      if (!reorderPlan) {
        return;
      }

      setManualProjectOrder((prev) => {
        const otherIds = prev.filter((projectId) => !reorderPlan.relevantIds.includes(projectId));
        return [...otherIds, ...reorderPlan.nextRelevantIds];
      });

      await Promise.all(
        reorderPlan.nextRelevantIds.map((projectId, index) =>
          ipcBridge.project.update.invoke({
            id: projectId,
            updates: {
              sortOrder: reorderPlan.baseSortOrder + index,
            },
          })
        )
      );

      refreshConversationListSync();
    },
    [orderedProjectGroups]
  );

  useEffect(() => {
    setManualProjectOrder((prev) => {
      const currentIds = projectGroups.map((group) => group.project.id);
      const retained = prev.filter((projectId) => currentIds.includes(projectId));
      const missing = currentIds.filter((projectId) => !retained.includes(projectId));
      return [...retained, ...missing];
    });
  }, [projectGroups]);

  const {
    selectedConversationIds,
    setSelectedConversationIds,
    selectedCount,
    allSelected,
    toggleSelectedConversation,
    handleToggleSelectAll,
  } = useBatchSelection(batchMode, conversations);

  const {
    renameModalVisible,
    renameModalName,
    setRenameModalName,
    renameLoading,
    dropdownVisibleId,
    handleConversationClick,
    handleDeleteClick,
    handleBatchDelete,
    handleEditStart,
    handleRenameConfirm,
    handleRenameCancel,
    handleTogglePin,
    handleAssignProject,
    handleMenuVisibleChange,
    handleOpenMenu,
  } = useConversationActions({
    batchMode,
    onSessionClick,
    onBatchModeChange,
    selectedConversationIds,
    setSelectedConversationIds,
    toggleSelectedConversation,
    markAsRead,
  });

  const {
    exportTask,
    exportModalVisible,
    exportTargetPath,
    exportModalLoading,
    showExportDirectorySelector,
    setShowExportDirectorySelector,
    closeExportModal,
    handleSelectExportDirectoryFromModal,
    handleSelectExportFolder,
    handleExportConversation,
    handleBatchExport,
    handleConfirmExport,
  } = useExport({
    conversations,
    selectedConversationIds,
    setSelectedConversationIds,
    onBatchModeChange,
  });

  const { sensors, activeId, activeConversation, handleDragStart, handleDragEnd, handleDragCancel, isDragEnabled } =
    useDragAndDrop({
      pinnedConversations,
      batchMode,
      collapsed,
    });

  const getConversationRowProps = useCallback(
    (conversation: TChatConversation): ConversationRowProps => ({
      conversation,
      isGenerating: isConversationGenerating(conversation.id),
      hasCompletionUnread: hasCompletionUnread(conversation.id),
      collapsed,
      tooltipEnabled,
      batchMode,
      checked: selectedConversationIds.has(conversation.id),
      selected: id === conversation.id,
      menuVisible: dropdownVisibleId !== null && dropdownVisibleId === conversation.id,
      onToggleChecked: toggleSelectedConversation,
      onConversationClick: handleConversationClick,
      onOpenMenu: handleOpenMenu,
      onMenuVisibleChange: handleMenuVisibleChange,
      onEditStart: handleEditStart,
      onDelete: handleDeleteClick,
      onExport: handleExportConversation,
      onTogglePin: handleTogglePin,
      onAssignProject: handleAssignProject,
      projects,
      currentProjectId: conversation.projectId,
      getJobStatus,
    }),
    [
      collapsed,
      tooltipEnabled,
      batchMode,
      isConversationGenerating,
      hasCompletionUnread,
      selectedConversationIds,
      id,
      dropdownVisibleId,
      toggleSelectedConversation,
      handleConversationClick,
      handleOpenMenu,
      handleMenuVisibleChange,
      handleEditStart,
      handleDeleteClick,
      handleExportConversation,
      handleTogglePin,
      handleAssignProject,
      projects,
      getJobStatus,
    ]
  );

  const assignableProjects = useMemo(
    () => projects.filter((project) => project.id !== teamAssignProjectTeam?.projectId),
    [projects, teamAssignProjectTeam]
  );

  const handleCreateProject = useCallback(async () => {
    const trimmedName = projectName.trim();
    const trimmedRootPath = projectRootPath.trim();
    if (!trimmedName) {
      return;
    }

    try {
      setProjectSaving(true);
      await ipcBridge.project.create.invoke({
        name: trimmedName,
        rootPath: trimmedRootPath || undefined,
      });
      Message.success(t('conversation.history.projectCreated'));
      setProjectModalVisible(false);
      setProjectName('');
      setProjectRootPath('');
    } catch (error) {
      console.error('[WorkspaceGroupedHistory] Failed to create project:', error);
      Message.error(t('conversation.history.projectCreateFailed'));
    } finally {
      setProjectSaving(false);
    }
  }, [projectName, projectRootPath, t]);

  const handleStartEditProject = useCallback((project: TProject) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectRootPath(project.rootPath ?? '');
    setProjectEditModalVisible(true);
  }, []);

  const handleOpenTeamAssignProject = useCallback(
    async (team: TTeam) => {
      setTeamAssignProjectTeam(team);
      setTeamAssignProjectId(team.projectId);
      setTeamAssignProjectVisible(true);
      try {
        await ipcBridge.project.list.invoke();
      } catch (error) {
        console.error('[GroupedHistory] Failed to load projects for team assignment:', error);
        Message.error(t('team.sider.assignProjectLoadFailed'));
      }
    },
    [t]
  );

  const handleConfirmTeamAssignProject = useCallback(async () => {
    if (!teamAssignProjectTeam) {
      return;
    }
    setTeamAssignProjectLoading(true);
    try {
      const result = await ipcBridge.team.updateProject.invoke({
        teamId: teamAssignProjectTeam.id,
        projectId: teamAssignProjectId,
      });
      const maybeError = result as unknown;
      if (maybeError && typeof maybeError === 'object' && '__bridgeError' in maybeError && maybeError.__bridgeError) {
        throw new Error(
          'message' in maybeError && typeof maybeError.message === 'string'
            ? maybeError.message
            : 'Failed to update team project'
        );
      }
      Message.success(
        teamAssignProjectId ? t('team.sider.assignProjectSuccess') : t('team.sider.removeFromProjectSuccess')
      );
      refreshConversationListSync();
      setTeamAssignProjectVisible(false);
      setTeamAssignProjectLoading(false);
      setTeamAssignProjectTeam(null);
      setTeamAssignProjectId(undefined);
    } catch (error) {
      console.error('[GroupedHistory] Failed to update team project:', error);
      const message = error instanceof Error ? error.message : String(error);
      Message.error(
        message || (teamAssignProjectId ? t('team.sider.assignProjectFailed') : t('team.sider.removeFromProjectFailed'))
      );
      setTeamAssignProjectLoading(false);
    }
  }, [t, teamAssignProjectId, teamAssignProjectTeam]);

  const handleTeamRenameConfirm = useCallback(async () => {
    if (!teamRenameTarget || !teamRenameName.trim()) {
      return;
    }
    setTeamRenameLoading(true);
    try {
      await ipcBridge.team.renameTeam.invoke({
        id: teamRenameTarget.id,
        name: teamRenameName.trim(),
      });
      Message.success(t('team.sider.renameSuccess'));
      setTeamRenameVisible(false);
      setTeamRenameTarget(null);
      setTeamRenameName('');
      refreshConversationListSync();
    } catch (error) {
      console.error('[GroupedHistory] Failed to rename team:', error);
      Message.error(t('team.sider.rename'));
    } finally {
      setTeamRenameLoading(false);
    }
  }, [t, teamRenameName, teamRenameTarget]);

  const handleDeleteTeam = useCallback(
    (team: TTeam) => {
      Modal.confirm({
        title: t('team.sider.deleteConfirm'),
        content: t('team.sider.deleteConfirmContent'),
        okText: t('team.sider.deleteOk'),
        cancelText: t('team.sider.deleteCancel'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          await ipcBridge.team.remove.invoke({ id: team.id });
          Message.success(t('team.sider.deleteSuccess'));
          if (id === team.id) {
            Promise.resolve(navigate('/')).catch(() => {});
          }
          refreshConversationListSync();
        },
        style: { borderRadius: '12px' },
        alignCenter: true,
        getPopupContainer: () => document.body,
      });
    },
    [id, navigate, t]
  );

  const handleSaveProject = useCallback(async () => {
    if (!editingProject) {
      return;
    }

    const trimmedName = projectName.trim();
    const trimmedRootPath = projectRootPath.trim();
    if (!trimmedName) {
      return;
    }

    try {
      setProjectSaving(true);
      const success = await ipcBridge.project.update.invoke({
        id: editingProject.id,
        updates: {
          name: trimmedName,
          rootPath: trimmedRootPath || undefined,
        },
      });
      if (success) {
        Message.success(t('conversation.history.projectUpdated'));
        setProjectEditModalVisible(false);
        setEditingProject(null);
        setProjectName('');
        setProjectRootPath('');
      } else {
        Message.error(t('conversation.history.projectUpdateFailed'));
      }
    } catch (error) {
      console.error('[WorkspaceGroupedHistory] Failed to update project:', error);
      Message.error(t('conversation.history.projectUpdateFailed'));
    } finally {
      setProjectSaving(false);
    }
  }, [editingProject, projectName, projectRootPath, t]);

  const handleDeleteProject = useCallback(
    (project: TProject) => {
      Modal.confirm({
        title: t('conversation.history.deleteProjectTitle'),
        content: t('conversation.history.deleteProjectConfirm', { name: project.name }),
        okText: t('conversation.history.confirmDelete'),
        cancelText: t('conversation.history.cancelDelete'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          try {
            const success = await ipcBridge.project.remove.invoke({ id: project.id });
            if (success) {
              Message.success(t('conversation.history.projectDeleted'));
            } else {
              Message.error(t('conversation.history.projectDeleteFailed'));
            }
          } catch (error) {
            console.error('[WorkspaceGroupedHistory] Failed to delete project:', error);
            Message.error(t('conversation.history.projectDeleteFailed'));
          }
        },
      });
    },
    [t]
  );

  const handleCreateConversationInProject = useCallback(
    (project: TProject, options?: { workspace?: string; customWorkspace?: boolean }) => {
      window.sessionStorage.setItem('aionui:create-project-id', project.id);
      if (options?.workspace) {
        window.sessionStorage.setItem('aionui:create-workspace', options.workspace);
      } else {
        window.sessionStorage.removeItem('aionui:create-workspace');
      }
      if (options?.customWorkspace) {
        window.sessionStorage.setItem('aionui:create-custom-workspace', 'true');
      } else {
        window.sessionStorage.removeItem('aionui:create-custom-workspace');
      }
      navigate('/', {
        state: {
          projectId: project.id,
          workspace: options?.workspace,
          customWorkspace: options?.customWorkspace,
        },
      });
    },
    [navigate]
  );

  const handleToggleProjectPinned = useCallback(
    async (project: TProject) => {
      try {
        const nextPinnedAt = project.pinnedAt ? null : Date.now();
        const projectsBefore = await ipcBridge.project.list.invoke();
        console.log(
          '[WorkspaceGroupedHistory] projects before pin',
          projectsBefore.map((item) => ({ id: item.id, name: item.name, pinnedAt: item.pinnedAt }))
        );
        console.log('[WorkspaceGroupedHistory] toggle project pin', {
          projectId: project.id,
          previousPinnedAt: project.pinnedAt,
          nextPinnedAt,
        });
        const success = await ipcBridge.project.update.invoke({
          id: project.id,
          updates: {
            pinnedAt: nextPinnedAt,
          },
        });
        console.log('[WorkspaceGroupedHistory] project pin result', {
          projectId: project.id,
          success,
        });
        const refreshedProjects = await ipcBridge.project.list.invoke();
        const refreshedProject = refreshedProjects.find((item) => item.id === project.id);
        console.log(
          '[WorkspaceGroupedHistory] projects after pin',
          refreshedProjects.map((item) => ({ id: item.id, name: item.name, pinnedAt: item.pinnedAt }))
        );
        console.log('[WorkspaceGroupedHistory] refreshed project after pin', {
          projectId: project.id,
          refreshedPinnedAt: refreshedProject?.pinnedAt,
          refreshedUpdatedAt: refreshedProject?.updatedAt,
        });
        if (!success) {
          throw new Error(t('conversation.history.projectUpdateFailed'));
        }
        setCollapsedSections((prev) => new Set(prev));
        refreshConversationListSync();
        Message.success(
          project.pinnedAt ? t('conversation.history.projectUnpinned') : t('conversation.history.projectPinned')
        );
        refreshConversationListSync();
      } catch (error) {
        console.error('[WorkspaceGroupedHistory] Failed to toggle project pin:', error);
        Message.error(t('conversation.history.projectUpdateFailed'));
      }
    },
    [t]
  );

  const handleToggleTeamPinned = useCallback(
    async (team: TTeam) => {
      try {
        await ipcBridge.team.updatePinned.invoke({
          teamId: team.id,
          pinnedAt: team.pinnedAt ? null : Date.now(),
        });
        Message.success(team.pinnedAt ? t('team.sider.unpinSuccess') : t('team.sider.pinSuccess'));
        refreshConversationListSync();
      } catch (error) {
        console.error('[GroupedHistory] Failed to toggle team pin:', error);
        Message.error(team.pinnedAt ? t('team.sider.unpinFailed') : t('team.sider.pinFailed'));
      }
    },
    [t]
  );

  const renderConversation = (conversation: TChatConversation) => {
    const rowProps = getConversationRowProps(conversation);
    if (!collapsed) {
      return <ConversationRow key={conversation.id} {...rowProps} />;
    }
    return <ConversationRow key={conversation.id} {...rowProps} />;
  };

  const renderTeam = (team: TTeam) => {
    if (collapsed) {
      return (
        <div key={team.id} className='conversation-item [&.conversation-item+&.conversation-item]:mt-2px'>
          <button
            type='button'
            className='chat-history__item h-40px rd-8px flex items-center justify-center cursor-pointer relative overflow-hidden min-w-0 w-full bg-transparent px-0 transition-colors hover:bg-[rgba(var(--success-6),0.12)]'
            onClick={() => {
              void Promise.resolve(navigate(`/team/${team.id}`));
              onSessionClick?.();
            }}
          >
            <span className='w-28px h-28px flex items-center justify-center shrink-0 mx-auto'>
              <span className='flex-center h-24px w-24px shrink-0 rounded-8px bg-[rgba(var(--success-6),0.12)] text-[rgb(var(--success-6))]'>
                <Peoples theme='outline' size='16' />
              </span>
            </span>
          </button>
        </div>
      );
    }

    return (
      <div key={team.id} className='group relative'>
        <Button
          type='text'
          className='!h-30px !w-full !justify-start !pl-2 !pr-74px !text-left hover:!bg-fill-3'
          onClick={() => {
            void Promise.resolve(navigate(`/team/${team.id}`));
            onSessionClick?.();
          }}
        >
          <div className='ml-34px flex min-w-0 items-center gap-8px'>
            <span className='flex-center h-20px w-20px shrink-0 rounded-6px bg-[rgba(var(--success-6),0.12)] text-[rgb(var(--success-6))]'>
              <Peoples theme='outline' size='13' />
            </span>
            <span className='min-w-0 flex-1 truncate text-13px text-t-primary'>{team.name}</span>
          </div>
        </Button>
        {team.pinnedAt && (
          <span className='pointer-events-none absolute right-34px top-1/2 flex h-20px w-20px -translate-y-1/2 items-center justify-center text-[rgb(var(--warning-6))] group-hover:hidden'>
            <Pin theme='filled' size='12' />
          </span>
        )}
        <div
          className='absolute right-8px top-0 flex h-30px items-center justify-end'
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Dropdown
            droplist={
              <Menu
                onClickMenuItem={(key) => {
                  console.log('[WorkspaceGroupedHistory] team menu key', { teamId: team.id, key });
                  if (key === 'pin') {
                    void handleToggleTeamPinned(team);
                    return;
                  }
                  if (key === 'rename') {
                    setTeamRenameTarget(team);
                    setTeamRenameName(team.name);
                    setTeamRenameVisible(true);
                    return;
                  }
                  if (key === 'move-project') {
                    void handleOpenTeamAssignProject(team);
                    return;
                  }
                  if (key === 'remove-project') {
                    setTeamAssignProjectTeam(team);
                    setTeamAssignProjectId(undefined);
                    setTeamAssignProjectVisible(true);
                    return;
                  }
                  if (key === 'delete') {
                    handleDeleteTeam(team);
                  }
                }}
              >
                <Menu.Item key='pin'>{team.pinnedAt ? t('team.sider.unpin') : t('team.sider.pin')}</Menu.Item>
                <Menu.Item key='rename'>
                  <div className='flex items-center gap-8px'>
                    <EditOne theme='outline' size='14' />
                    <span>{t('team.sider.rename')}</span>
                  </div>
                </Menu.Item>
                <Menu.Item key='move-project'>
                  <div className='flex items-center gap-8px'>
                    <Peoples theme='outline' size='14' />
                    <span>{t('team.sider.moveToProject')}</span>
                  </div>
                </Menu.Item>
                {team.projectId && <Menu.Item key='remove-project'>{t('team.sider.removeFromProject')}</Menu.Item>}
                <Menu.Item key='delete'>
                  <div className='flex items-center gap-8px text-[rgb(var(--warning-6))]'>
                    <DeleteOne theme='outline' size='14' />
                    <span>{t('team.sider.delete')}</span>
                  </div>
                </Menu.Item>
              </Menu>
            }
            trigger='click'
            position='br'
            getPopupContainer={() => document.body}
          >
            <span className='flex-center h-24px w-24px shrink-0 rd-6px text-t-secondary hover:bg-fill-2 hover:text-t-primary'>
              <MoreOne theme='outline' size='16' />
            </span>
          </Dropdown>
        </div>
      </div>
    );
  };

  const renderProjectGroup = (
    projectGroup: ProjectGroup,
    reorderMode = false,
    dragListeners?: {
      attributes: ReturnType<typeof useSortable>['attributes'];
      listeners: ReturnType<typeof useSortable>['listeners'];
    }
  ) => {
    const { project, conversations: projectConversations, chatConversations, workspaceGroups, teams } = projectGroup;
    const sectionKey = `project:${project.id}`;
    const isCollapsed = collapsedSections.has(sectionKey);
    const chatSectionKey = `${sectionKey}:chats`;
    const workspaceSectionKey = `${sectionKey}:workspaces`;
    const teamsSectionKey = `${sectionKey}:teams`;
    const assetsSectionKey = `${sectionKey}:assets`;

    const renderProjectSubheader = (key: string, icon: React.ReactNode, label: string, count?: number) => (
      <Button
        type='text'
        className='!h-28px !w-full !justify-start !px-2 !text-left hover:!bg-fill-3'
        onClick={() => toggleSection(key)}
      >
        <span className='flex min-w-0 w-full items-center gap-6px pl-18px pr-18px text-t-secondary'>
          <span className='shrink-0 text-[14px]'>{icon}</span>
          <span className='min-w-0 flex-1 truncate text-12px font-medium'>{label}</span>
          {count !== undefined && (
            <span className='shrink-0 rounded-10px bg-fill-3 px-6px py-1px text-10px leading-14px text-t-secondary'>
              {count}
            </span>
          )}
          <span className='ml-auto mr-6px flex h-16px w-16px items-center justify-center shrink-0'>
            {collapsedSections.has(key) ? <Right theme='outline' size={10} /> : <Down theme='outline' size={10} />}
          </span>
        </span>
      </Button>
    );

    const renderPlaceholder = (label: string) => (
      <div className='ml-34px mr-8px rounded-8px border border-dashed border-[rgba(var(--primary-6),0.16)] px-8px py-6px text-11px leading-16px text-t-tertiary'>
        {label}
      </div>
    );

    if (collapsed) {
      return (
        <React.Fragment key={project.id}>
          <div className='conversation-item [&.conversation-item+&.conversation-item]:mt-2px'>
            <button
              type='button'
              className='chat-history__item h-40px rd-8px flex items-center justify-center cursor-pointer relative overflow-hidden min-w-0 w-full bg-transparent px-0 transition-colors hover:bg-[rgba(var(--primary-6),0.14)]'
              onClick={() => toggleSection(sectionKey)}
            >
              <span className='w-28px h-28px flex items-center justify-center shrink-0'>
                <span className='flex-center h-24px w-24px shrink-0 rounded-8px bg-[rgba(var(--primary-6),0.14)] text-[rgb(var(--primary-6))]'>
                  <Application theme='outline' size='16' />
                </span>
              </span>
            </button>
          </div>
          {!isCollapsed && (
            <>
              {chatConversations.map((conversation) => renderConversation(conversation))}
              {workspaceGroups.map((group) =>
                group.conversations.map((conversation) => renderConversation(conversation))
              )}
              {teams.map((team) => renderTeam(team))}
            </>
          )}
        </React.Fragment>
      );
    }

    return (
      <div key={project.id} className='mb-2 px-8px'>
        <div className='rounded-12px border border-solid border-[rgba(var(--primary-6),0.18)] bg-[rgba(var(--primary-6),0.06)] p-4px'>
          <div
            className={classNames(
              'group mb-1 flex w-full items-center gap-8px rounded-8px px-2 py-1 text-left text-t-primary hover:bg-[rgba(var(--primary-6),0.10)]',
              reorderMode && 'cursor-grab active:cursor-grabbing'
            )}
            {...(reorderMode
              ? {
                  ...dragListeners?.attributes,
                  ...dragListeners?.listeners,
                  onClick: (event: React.MouseEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                  },
                  role: undefined,
                  tabIndex: undefined,
                }
              : {})}
          >
            <Button
              type='text'
              className='!h-auto !flex-1 !justify-start !bg-transparent !p-0 !text-left hover:!bg-transparent'
              onClick={() => {
                if (!reorderMode) {
                  toggleSection(sectionKey);
                }
              }}
            >
              <span className='flex min-w-0 w-full items-center gap-8px'>
                <span className='flex-center h-24px w-24px shrink-0 rounded-8px bg-[rgba(var(--primary-6),0.14)] text-[rgb(var(--primary-6))]'>
                  <Application theme='outline' size='16' />
                </span>
                <span className='min-w-0 flex-1 truncate font-medium text-t-primary'>{project.name}</span>
                {project.pinnedAt && (
                  <span className='flex-center h-20px w-20px shrink-0 text-[rgb(var(--warning-6))]'>
                    <Pin theme='filled' size='12' />
                  </span>
                )}
                <span className='shrink-0 rounded-10px bg-[rgba(var(--primary-6),0.14)] px-6px py-1px text-11px leading-16px text-[rgb(var(--primary-6))]'>
                  {projectConversations.length}
                </span>
                {!collapsed && !reorderMode && (
                  <span className='flex-center h-20px w-20px shrink-0 text-t-secondary'>
                    {collapsedSections.has(sectionKey) ? (
                      <Right theme='outline' size='12' />
                    ) : (
                      <Down theme='outline' size='12' />
                    )}
                  </span>
                )}
              </span>
            </Button>
            {!reorderMode && (
              <Dropdown
                droplist={
                  <Menu
                    onClickMenuItem={(key) => {
                      console.log('[WorkspaceGroupedHistory] project menu key', { projectId: project.id, key });
                      if (key === 'pin') {
                        void handleToggleProjectPinned(project);
                        return;
                      }
                      if (key === 'new-chat') {
                        handleCreateConversationInProject(project);
                        return;
                      }
                      if (key === 'new-workspace-chat') {
                        setWorkspaceChatCreateProject(project);
                        return;
                      }
                      if (key === 'new-team') {
                        setTeamCreateProject(project);
                        return;
                      }
                      if (key === 'edit') {
                        handleStartEditProject(project);
                        return;
                      }
                      if (key === 'delete') {
                        handleDeleteProject(project);
                      }
                    }}
                  >
                    <Menu.Item key='pin'>
                      {project.pinnedAt ? t('conversation.history.unpinProject') : t('conversation.history.pinProject')}
                    </Menu.Item>
                    <Menu.Item key='new-chat'>{t('conversation.history.newChatInProject')}</Menu.Item>
                    <Menu.Item key='new-workspace-chat'>{t('conversation.history.newWorkspaceChatInProject')}</Menu.Item>
                    <Menu.Item key='new-team'>{t('conversation.history.newTeamInProject')}</Menu.Item>
                    <Menu.Item key='edit'>{t('conversation.history.editProject')}</Menu.Item>
                    <Menu.Item key='delete'>
                      <span className='text-[rgb(var(--warning-6))]'>{t('conversation.history.deleteProject')}</span>
                    </Menu.Item>
                  </Menu>
                }
                trigger='click'
                position='br'
                getPopupContainer={() => document.body}
              >
                <span
                  className='flex-center h-24px w-24px shrink-0 rd-6px text-t-secondary hover:bg-fill-2 hover:text-t-primary'
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <MoreOne theme='outline' size='16' />
                </span>
              </Dropdown>
            )}
          </div>

          {!isCollapsed && !reorderMode && (
            <div className='flex flex-col gap-2px'>
              {renderProjectSubheader(
                chatSectionKey,
                <Comment theme='outline' size='14' />,
                t('conversation.history.projectChatsSection'),
                chatConversations.length
              )}
              {!collapsedSections.has(chatSectionKey) && (
                <div className='flex flex-col gap-1px'>
                  {chatConversations.map((conversation) => renderConversation(conversation))}
                </div>
              )}

              {renderProjectSubheader(
                workspaceSectionKey,
                <Code theme='outline' size='14' />,
                t('conversation.history.projectWorkspaceChatsSection'),
                workspaceGroups.reduce((count, group) => count + group.conversations.length, 0)
              )}
              {!collapsedSections.has(workspaceSectionKey) && (
                <div className='flex flex-col gap-1px'>
                  {workspaceGroups.length > 0
                    ? workspaceGroups.map((group) => (
                        <div key={group.workspace} className={classNames({ 'pl-18px': !collapsed })}>
                          <WorkspaceCollapse
                            expanded={expandedWorkspaces.includes(group.workspace)}
                            onToggle={() => handleToggleWorkspace(group.workspace)}
                            siderCollapsed={collapsed}
                            header={
                              <div className='flex items-center gap-8px text-13px min-w-0'>
                                <span className='font-medium truncate flex-1 text-t-primary min-w-0'>
                                  {group.displayName}
                                </span>
                              </div>
                            }
                          >
                            <div className={classNames('flex flex-col gap-2px min-w-0', { 'mt-2px': !collapsed })}>
                              {group.conversations.map((conversation) => renderConversation(conversation))}
                            </div>
                          </WorkspaceCollapse>
                        </div>
                      ))
                    : renderPlaceholder(t('conversation.history.projectNoWorkspaceChats'))}
                </div>
              )}

              {renderProjectSubheader(
                teamsSectionKey,
                <Peoples theme='outline' size='14' />,
                t('conversation.history.projectTeamsSection'),
                teams.length
              )}
              {!collapsedSections.has(teamsSectionKey) && (
                <div className='flex flex-col gap-1px'>
                  {teams.length > 0
                    ? teams.map((team) => renderTeam(team))
                    : renderPlaceholder(t('conversation.history.projectTeamsPlaceholder'))}
                </div>
              )}

              {renderProjectSubheader(
                assetsSectionKey,
                <FolderOpen theme='outline' size='14' />,
                t('conversation.history.projectAssetsSection')
              )}
              {!collapsedSections.has(assetsSectionKey) &&
                renderPlaceholder(t('conversation.history.projectAssetsPlaceholder'))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Collect all sortable IDs for the pinned section
  const pinnedIds = useMemo(() => pinnedConversations.map((c) => c.id), [pinnedConversations]);
  const sectionVisibility = getSidebarSectionVisibility({
    pinnedConversationCount: pinnedConversations.length,
    projectGroupCount: projectGroups.length,
    unassignedTeamCount: unassignedTeams.length,
    timelineSectionCount: timelineSections.length,
  });

  return (
    <>
      <Modal
        title={t('conversation.history.renameTitle')}
        visible={renameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText={t('conversation.history.saveName')}
        cancelText={t('conversation.history.cancelEdit')}
        confirmLoading={renameLoading}
        okButtonProps={{ disabled: !renameModalName.trim() }}
        style={{ borderRadius: '12px' }}
        alignCenter
        getPopupContainer={() => document.body}
      >
        <Input
          autoFocus
          value={renameModalName}
          onChange={setRenameModalName}
          onPressEnter={handleRenameConfirm}
          placeholder={t('conversation.history.renamePlaceholder')}
          allowClear
        />
      </Modal>

      <Modal
        title={t('team.sider.renameTitle')}
        visible={teamRenameVisible}
        onOk={() => void handleTeamRenameConfirm()}
        onCancel={() => {
          setTeamRenameVisible(false);
          setTeamRenameLoading(false);
          setTeamRenameTarget(null);
          setTeamRenameName('');
        }}
        okText={t('team.sider.renameOk')}
        cancelText={t('team.sider.renameCancel')}
        confirmLoading={teamRenameLoading}
        okButtonProps={{ disabled: !teamRenameName.trim() }}
        style={{ borderRadius: '12px' }}
        alignCenter
        getPopupContainer={() => document.body}
      >
        <Input
          autoFocus
          value={teamRenameName}
          onChange={setTeamRenameName}
          onPressEnter={() => void handleTeamRenameConfirm()}
          placeholder={t('team.sider.renamePlaceholder')}
          allowClear
        />
      </Modal>

      <Modal
        visible={exportModalVisible}
        title={t('conversation.history.exportDialogTitle')}
        onCancel={closeExportModal}
        footer={null}
        style={{ borderRadius: '12px' }}
        className='conversation-export-modal'
        alignCenter
        getPopupContainer={() => document.body}
      >
        <div className='py-8px'>
          <div className='text-14px mb-16px text-t-secondary'>
            {exportTask?.mode === 'batch'
              ? t('conversation.history.exportDialogBatchDescription', { count: exportTask.conversationIds.length })
              : t('conversation.history.exportDialogSingleDescription')}
          </div>

          <div className='mb-16px p-16px rounded-12px bg-fill-1'>
            <div className='text-14px mb-8px text-t-primary'>{t('conversation.history.exportTargetFolder')}</div>
            <div
              className='flex items-center justify-between px-12px py-10px rounded-8px transition-colors'
              style={{
                backgroundColor: 'var(--color-bg-1)',
                border: '1px solid var(--color-border-2)',
                cursor: exportModalLoading ? 'not-allowed' : 'pointer',
                opacity: exportModalLoading ? 0.55 : 1,
              }}
              onClick={() => {
                void handleSelectExportFolder();
              }}
            >
              <span
                className='text-14px overflow-hidden text-ellipsis whitespace-nowrap'
                style={{ color: exportTargetPath ? 'var(--color-text-1)' : 'var(--color-text-3)' }}
              >
                {exportTargetPath || t('conversation.history.exportSelectFolder')}
              </span>
              <FolderOpen theme='outline' size='18' fill='var(--color-text-3)' />
            </div>
          </div>

          <div className='flex items-center gap-8px mb-20px text-14px text-t-secondary'>
            <span>💡</span>
            <span>{t('conversation.history.exportDialogHint')}</span>
          </div>

          <div className='flex gap-12px justify-end'>
            <button
              className='px-24px py-8px rounded-20px text-14px font-medium transition-all'
              style={{
                border: '1px solid var(--color-border-2)',
                backgroundColor: 'var(--color-fill-2)',
                color: 'var(--color-text-1)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-fill-3)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-fill-2)';
              }}
              onClick={closeExportModal}
            >
              {t('common.cancel')}
            </button>
            <button
              className='px-24px py-8px rounded-20px text-14px font-medium transition-all'
              style={{
                border: 'none',
                backgroundColor: exportModalLoading ? 'var(--color-fill-3)' : 'var(--color-text-1)',
                color: 'var(--color-bg-1)',
                cursor: exportModalLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(event) => {
                if (!exportModalLoading) {
                  event.currentTarget.style.opacity = '0.85';
                }
              }}
              onMouseLeave={(event) => {
                if (!exportModalLoading) {
                  event.currentTarget.style.opacity = '1';
                }
              }}
              onClick={() => {
                void handleConfirmExport();
              }}
              disabled={exportModalLoading}
            >
              {exportModalLoading ? t('conversation.history.exporting') : t('common.confirm')}
            </button>
          </div>
        </div>
      </Modal>

      <DirectorySelectionModal
        visible={showExportDirectorySelector}
        onConfirm={handleSelectExportDirectoryFromModal}
        onCancel={() => setShowExportDirectorySelector(false)}
      />

      <WorkspaceChatCreateModal
        visible={workspaceChatCreateProject !== null}
        project={workspaceChatCreateProject}
        onCancel={() => setWorkspaceChatCreateProject(null)}
        onCreated={() => setWorkspaceChatCreateProject(null)}
      />

      <Modal
        title={t('team.sider.assignProjectTitle')}
        visible={teamAssignProjectVisible}
        onCancel={() => {
          setTeamAssignProjectVisible(false);
          setTeamAssignProjectTeam(null);
          setTeamAssignProjectId(undefined);
          setTeamAssignProjectLoading(false);
        }}
        onOk={() => void handleConfirmTeamAssignProject()}
        confirmLoading={teamAssignProjectLoading}
      >
        <div className='flex flex-col gap-12px'>
          <div className='text-13px text-t-secondary'>
            {teamAssignProjectTeam
              ? t('team.sider.assignProjectDescription', { name: teamAssignProjectTeam.name })
              : ''}
          </div>
          <Select
            value={teamAssignProjectId ?? '__none__'}
            onChange={(value) => setTeamAssignProjectId(value === '__none__' ? undefined : value)}
            renderFormat={(option) => {
              const optionValue = (option as { value?: string })?.value;
              if (!optionValue) {
                return '';
              }
              if (optionValue === '__none__') {
                return t('team.sider.removeFromProject');
              }
              return assignableProjects.find((project) => project.id === optionValue)?.name ?? optionValue;
            }}
            placeholder={t('team.sider.assignProjectPlaceholder')}
          >
            <Select.Option value='__none__'>{t('team.sider.removeFromProject')}</Select.Option>
            {assignableProjects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>

      <TeamCreateModal
        visible={teamCreateProject !== null}
        projectId={teamCreateProject?.id || undefined}
        onClose={() => setTeamCreateProject(null)}
        onCreated={(team) => {
          setTeamCreateProject(null);
          void Promise.resolve(navigate(`/team/${team.id}`));
          onSessionClick?.();
        }}
      />

      {batchMode && !collapsed && (
        <div className='px-12px pb-8px'>
          <div className='rd-8px bg-fill-1 p-10px flex flex-col gap-8px border border-solid border-[rgba(var(--primary-6),0.08)]'>
            <div className='text-12px leading-18px text-t-secondary'>
              {t('conversation.history.selectedCount', { count: selectedCount })}
            </div>
            <div className='grid grid-cols-2 gap-6px'>
              <Button
                className='!col-span-2 !w-full !justify-center !min-w-0 !h-30px !px-8px !text-12px whitespace-nowrap'
                size='mini'
                type='secondary'
                onClick={handleToggleSelectAll}
              >
                {allSelected ? t('common.cancel') : t('conversation.history.selectAll')}
              </Button>
              <Button
                className='!w-full !justify-center !min-w-0 !h-30px !px-8px !text-12px whitespace-nowrap'
                size='mini'
                type='secondary'
                onClick={handleBatchExport}
              >
                {t('conversation.history.batchExport')}
              </Button>
              <Button
                className='!w-full !justify-center !min-w-0 !h-30px !px-8px !text-12px whitespace-nowrap'
                size='mini'
                status='warning'
                onClick={handleBatchDelete}
              >
                {t('conversation.history.batchDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {pinnedConversations.length > 0 && (
            <div className='mb-8px min-w-0'>
              {!collapsed && (
                <div
                  className='flex items-center px-12px py-8px cursor-pointer select-none sticky top-0 z-10 bg-fill-2'
                  onClick={() => toggleSection('pinned')}
                >
                  <span className='text-13px text-t-secondary font-bold leading-20px'>
                    {t('conversation.history.pinnedSection')}
                  </span>
                  <div className='ml-auto h-20px w-20px rd-4px flex items-center justify-center hover:bg-fill-3 transition-all shrink-0 text-t-secondary'>
                    {collapsedSections.has('pinned') ? (
                      <Right theme='outline' size={12} />
                    ) : (
                      <Down theme='outline' size={12} />
                    )}
                  </div>
                </div>
              )}
              {!collapsedSections.has('pinned') && (
                <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy}>
                  <div className='min-w-0'>
                    {pinnedConversations.map((conversation) => {
                      const props = getConversationRowProps(conversation);
                      return isDragEnabled ? (
                        <SortableConversationRow key={conversation.id} {...props} />
                      ) : (
                        <ConversationRow key={conversation.id} {...props} />
                      );
                    })}
                  </div>
                </SortableContext>
              )}
            </div>
          )}

          <DragOverlay dropAnimation={null}>
            {activeId && activeConversation ? <DragOverlayContent conversation={activeConversation} /> : null}
          </DragOverlay>
        </DndContext>

        {sectionVisibility.showProjectsSection && (
          <div className='mb-8px min-w-0'>
            {!collapsed && (
              <div className={classNames('flex items-center gap-4px', STICKY_SECTION_HEADER_CLASS_NAME)}>
                <Button
                  type='text'
                  className='!h-auto !flex-1 !justify-start !bg-transparent !p-0 !text-left hover:!bg-transparent'
                  onClick={() => toggleSection('projects')}
                >
                  <span className='text-13px text-t-secondary font-bold leading-20px'>
                    {t('conversation.history.projectsSection')}
                  </span>
                </Button>
                {sectionVisibility.showProjectReorderControl && !collapsedSections.has('projects') && (
                  <Button
                    type='text'
                    size='mini'
                    className={classNames(
                      '!h-26px !rounded-6px !px-8px !text-12px font-medium',
                      isProjectReorderMode
                        ? '!bg-[rgba(var(--primary-6),0.14)] !text-[rgb(var(--primary-6))] hover:!bg-[rgba(var(--primary-6),0.2)]'
                        : '!text-t-secondary hover:!bg-fill-3 hover:!text-t-primary'
                    )}
                    onClick={() => setIsProjectReorderMode((value) => !value)}
                  >
                    {isProjectReorderMode
                      ? t('conversation.history.projectReorderModeExit')
                      : t('conversation.history.projectReorderModeEnter')}
                  </Button>
                )}
                {!isProjectReorderMode && (
                  <Button
                    type='text'
                    size='mini'
                    className='!h-26px !w-26px !min-w-26px !rounded-6px !p-0 !text-[rgb(var(--warning-6))] hover:!bg-[rgba(var(--warning-6),0.14)] hover:!text-[rgb(var(--warning-7))]'
                    onClick={() => setProjectModalVisible(true)}
                  >
                    <Plus theme='outline' size='16' />
                  </Button>
                )}
                <Button
                  type='text'
                  size='mini'
                  className='!h-24px !w-24px !min-w-24px !p-0 text-t-secondary hover:!bg-fill-3 hover:!text-t-primary'
                  onClick={() => toggleSection('projects')}
                >
                  {collapsedSections.has('projects') ? (
                    <Right theme='outline' size={12} />
                  ) : (
                    <Down theme='outline' size={12} />
                  )}
                </Button>
              </div>
            )}
            {!collapsedSections.has('projects') && (
              <>
                {isProjectReorderMode && !collapsed && (
                  <div className='mx-8px mb-6px rounded-10px border border-dashed border-[rgba(var(--primary-6),0.18)] bg-[rgba(var(--primary-6),0.06)] px-10px py-8px text-12px leading-18px text-t-secondary'>
                    {t('conversation.history.projectReorderModeHint')}
                  </div>
                )}
                <DndContext
                  sensors={projectReorderSensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleProjectDragStart}
                  onDragCancel={handleProjectDragCancel}
                  onDragEnd={(event) => void handleProjectDragEnd(event)}
                >
                  <SortableContext items={orderedProjectGroups.map((group) => group.project.id)} strategy={verticalListSortingStrategy}>
                    {orderedProjectGroups.map((projectGroup) => (
                      <SortableProjectCard
                        key={projectGroup.project.id}
                        projectGroup={projectGroup}
                        reorderMode={isProjectReorderMode}
                        renderProjectGroup={renderProjectGroup}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeProjectGroup ? (
                      <div className='pointer-events-none px-8px'>
                        <div className='rounded-12px border border-solid border-[rgba(var(--primary-6),0.22)] bg-[rgba(var(--primary-6),0.14)] p-4px shadow-[0_12px_32px_rgba(var(--primary-6),0.18)]'>
                          <div className='flex items-center gap-8px rounded-8px px-2 py-1 text-t-primary'>
                            <span className='flex-center h-24px w-24px shrink-0 rounded-8px bg-[rgba(var(--primary-6),0.18)] text-[rgb(var(--primary-6))]'>
                              <Application theme='outline' size='16' />
                            </span>
                            <span className='min-w-0 flex-1 truncate font-medium text-t-primary'>
                              {activeProjectGroup.project.name}
                            </span>
                            {activeProjectGroup.project.pinnedAt && (
                              <span className='flex-center h-20px w-20px shrink-0 text-[rgb(var(--warning-6))]'>
                                <Pin theme='filled' size='12' />
                              </span>
                            )}
                            <span className='shrink-0 rounded-10px bg-[rgba(var(--primary-6),0.18)] px-6px py-1px text-11px leading-16px text-[rgb(var(--primary-6))]'>
                              {activeProjectGroup.chatConversations.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            )}
          </div>
        )}

        {sectionVisibility.showTeamsSection && (
          <div className='mb-8px min-w-0'>
            {!collapsed && (
              <div className={classNames('flex items-center', STICKY_SECTION_HEADER_CLASS_NAME)}>
                <Button
                  type='text'
                  className='!h-auto !flex-1 !justify-start !bg-transparent !p-0 !text-left hover:!bg-transparent'
                  onClick={() => toggleSection('teams')}
                >
                  <span className='text-13px text-t-secondary font-bold leading-20px'>{t('team.sider.title')}</span>
                </Button>
                {!isProjectReorderMode && (
                  <Button
                    type='text'
                    size='mini'
                    className='!ml-auto !mr-4px !h-26px !w-26px !min-w-26px !rounded-6px !p-0 !text-[rgb(var(--warning-6))] hover:!bg-[rgba(var(--warning-6),0.14)] hover:!text-[rgb(var(--warning-7))]'
                    onClick={() => setTeamCreateProject(topLevelTeamDraftProject)}
                  >
                    <Plus theme='outline' size='16' />
                  </Button>
                )}
                <Button
                  type='text'
                  size='mini'
                  className='!h-24px !w-24px !min-w-24px !p-0 text-t-secondary hover:!bg-fill-3 hover:!text-t-primary'
                  onClick={() => toggleSection('teams')}
                >
                  {collapsedSections.has('teams') ? (
                    <Right theme='outline' size={12} />
                  ) : (
                    <Down theme='outline' size={12} />
                  )}
                </Button>
              </div>
            )}
            {!collapsedSections.has('teams') &&
              sectionVisibility.showUnassignedTeamsList &&
              unassignedTeams.map((team) => renderTeam(team))}
          </div>
        )}

        {sectionVisibility.showEmptyHistoryState && (
          <div className='py-48px flex-center'>
            <Empty description={t('conversation.history.noHistory')} />
          </div>
        )}

        {timelineSections.map((section) => (
          <div key={section.timeline} className='mb-8px min-w-0'>
            {!collapsed && (
              <div
                className={classNames(
                  'flex items-center px-12px py-8px cursor-pointer select-none',
                  STICKY_SECTION_HEADER_CLASS_NAME
                )}
                onClick={() => toggleSection(section.timeline)}
              >
                <span className='text-13px text-t-secondary font-bold leading-20px'>{section.timeline}</span>
                <div className='ml-auto h-20px w-20px rd-4px flex items-center justify-center hover:bg-fill-3 transition-all shrink-0 text-t-secondary'>
                  {collapsedSections.has(section.timeline) ? (
                    <Right theme='outline' size={12} />
                  ) : (
                    <Down theme='outline' size={12} />
                  )}
                </div>
              </div>
            )}

            {!collapsedSections.has(section.timeline) &&
              section.items.map((item) => {
                if (item.type === 'workspace' && item.workspaceGroup) {
                  const group = item.workspaceGroup;
                  return (
                    <div key={group.workspace} className='min-w-0'>
                      <WorkspaceCollapse
                        expanded={expandedWorkspaces.includes(group.workspace)}
                        onToggle={() => handleToggleWorkspace(group.workspace)}
                        siderCollapsed={collapsed}
                        header={
                          <div className='flex items-center gap-8px text-14px min-w-0'>
                            <span className='font-medium truncate flex-1 text-t-primary min-w-0'>
                              {group.displayName}
                            </span>
                          </div>
                        }
                      >
                        <div className={classNames('flex flex-col gap-2px min-w-0', { 'mt-2px': !collapsed })}>
                          {group.conversations.map((conversation) => renderConversation(conversation))}
                        </div>
                      </WorkspaceCollapse>
                    </div>
                  );
                }

                if (item.type === 'project' && item.projectGroup) {
                  return renderProjectGroup(item.projectGroup);
                }

                if (item.type === 'conversation' && item.conversation) {
                  return renderConversation(item.conversation);
                }

                return null;
              })}
          </div>
        ))}
      </div>
      <Modal
        title={t('conversation.history.editProject')}
        visible={projectEditModalVisible}
        onOk={() => void handleSaveProject()}
        onCancel={() => {
          setProjectEditModalVisible(false);
          setEditingProject(null);
          setProjectName('');
          setProjectRootPath('');
        }}
        confirmLoading={projectSaving}
      >
        <div className='flex flex-col gap-12px'>
          <Input
            value={projectName}
            onChange={setProjectName}
            placeholder={t('conversation.history.projectNamePlaceholder')}
          />
          <Input
            value={projectRootPath}
            onChange={setProjectRootPath}
            placeholder={t('conversation.history.projectFolderPlaceholder')}
          />
        </div>
      </Modal>
      <Modal
        title={t('conversation.history.createProject')}
        visible={projectModalVisible}
        onOk={() => void handleCreateProject()}
        onCancel={() => {
          setProjectModalVisible(false);
          setProjectName('');
          setProjectRootPath('');
        }}
        confirmLoading={projectSaving}
      >
        <div className='flex flex-col gap-12px'>
          <Input
            value={projectName}
            onChange={setProjectName}
            placeholder={t('conversation.history.projectNamePlaceholder')}
          />
          <Input
            value={projectRootPath}
            onChange={setProjectRootPath}
            placeholder={t('conversation.history.projectFolderPlaceholder')}
          />
        </div>
      </Modal>
    </>
  );
};

export default WorkspaceGroupedHistory;
