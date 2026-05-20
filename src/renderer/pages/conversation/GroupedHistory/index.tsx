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
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Dropdown, Empty, Input, Menu, Message, Modal } from '@arco-design/web-react';
import { Application, Code, Comment, Down, FolderOpen, FolderPlus, MoreOne, Peoples, Right } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import WorkspaceCollapse from '../components/WorkspaceCollapse';
import ConversationRow from './ConversationRow';
import DragOverlayContent from './DragOverlayContent';
import SortableConversationRow from './SortableConversationRow';
import { useBatchSelection } from './hooks/useBatchSelection';
import { useConversationActions } from './hooks/useConversationActions';
import { useConversations } from './hooks/useConversations';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useExport } from './hooks/useExport';
import type { ConversationRowProps, ProjectGroup, WorkspaceGroupedHistoryProps } from './types';

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
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [projectEditModalVisible, setProjectEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectRootPath, setProjectRootPath] = useState('');
  const [workspacePickerProject, setWorkspacePickerProject] = useState<TProject | null>(null);
  const [teamCreateProject, setTeamCreateProject] = useState<TProject | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sync active conversation ref when route changes (for URL navigation)
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
    unassignedProjects,
    timelineSections,
    handleToggleWorkspace,
  } = useConversations();

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
    (project: TProject, workspace?: string) => {
      window.sessionStorage.setItem('aionui:create-project-id', project.id);
      navigate('/', {
        state: {
          projectId: project.id,
          workspace,
        },
      });
    },
    [navigate]
  );

  const handleSelectProjectWorkspace = useCallback(
    (paths: string[] | undefined) => {
      const workspace = paths?.[0]?.trim();
      const project = workspacePickerProject;
      setWorkspacePickerProject(null);
      if (!project || !workspace) {
        return;
      }
      handleCreateConversationInProject(project, workspace);
    },
    [handleCreateConversationInProject, workspacePickerProject]
  );

  const renderConversation = (conversation: TChatConversation) => {
    const rowProps = getConversationRowProps(conversation);
    return <ConversationRow key={conversation.id} {...rowProps} />;
  };

  const renderTeam = (team: TTeam) => (
    <Button
      key={team.id}
      type='text'
      className='!h-30px !w-full !justify-start !px-2 !text-left hover:!bg-fill-3'
      onClick={() => {
        void Promise.resolve(navigate(`/team/${team.id}`));
        onSessionClick?.();
      }}
    >
      <span className='ml-34px flex min-w-0 w-full items-center gap-8px'>
        <span className='flex-center h-20px w-20px shrink-0 rounded-6px bg-[rgba(var(--success-6),0.12)] text-[rgb(var(--success-6))]'>
          <Peoples theme='outline' size='13' />
        </span>
        <span className='min-w-0 flex-1 truncate text-13px text-t-primary'>{team.name}</span>
      </span>
    </Button>
  );

  const renderProjectGroup = (projectGroup: ProjectGroup) => {
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
        <span className='flex min-w-0 w-full items-center gap-6px pl-18px text-t-secondary'>
          <span className='shrink-0 text-[14px]'>{icon}</span>
          <span className='min-w-0 flex-1 truncate text-12px font-medium'>{label}</span>
          {count !== undefined && (
            <span className='shrink-0 rounded-10px bg-fill-3 px-6px py-1px text-10px leading-14px text-t-secondary'>
              {count}
            </span>
          )}
          {collapsedSections.has(key) ? <Right theme='outline' size={10} /> : <Down theme='outline' size={10} />}
        </span>
      </Button>
    );

    const renderPlaceholder = (label: string) => (
      <div className='ml-34px mr-8px rounded-8px border border-dashed border-[rgba(var(--primary-6),0.16)] px-8px py-6px text-11px leading-16px text-t-tertiary'>
        {label}
      </div>
    );

    return (
      <div key={project.id} className='mb-2 px-8px'>
        <div className='rounded-12px border border-solid border-[rgba(var(--primary-6),0.18)] bg-[rgba(var(--primary-6),0.06)] p-4px'>
          <Button
            type='text'
            className='group !mb-1 !w-full !px-2 !text-left !text-t-primary hover:!bg-[rgba(var(--primary-6),0.10)]'
            onClick={() => toggleSection(sectionKey)}
          >
            <span className='flex min-w-0 w-full items-center gap-8px'>
              <span className='flex-center h-24px w-24px shrink-0 rounded-8px bg-[rgba(var(--primary-6),0.14)] text-[rgb(var(--primary-6))]'>
                <Application theme='outline' size='16' />
              </span>
              <span className='min-w-0 flex-1 truncate font-medium text-t-primary'>{project.name}</span>
              <span className='shrink-0 rounded-10px bg-[rgba(var(--primary-6),0.14)] px-6px py-1px text-11px leading-16px text-[rgb(var(--primary-6))]'>
                {projectConversations.length}
              </span>
              <Dropdown
                droplist={
                  <Menu
                    onClickMenuItem={(key) => {
                      if (key === 'new-chat') {
                        handleCreateConversationInProject(project);
                        return;
                      }
                      if (key === 'new-workspace-chat') {
                        setWorkspacePickerProject(project);
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
                    <Menu.Item key='new-chat'>{t('conversation.history.newChatInProject')}</Menu.Item>
                    <Menu.Item key='new-workspace-chat'>
                      {t('conversation.history.newWorkspaceChatInProject')}
                    </Menu.Item>
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
                    event.stopPropagation();
                  }}
                >
                  <MoreOne theme='outline' size='16' />
                </span>
              </Dropdown>
            </span>
          </Button>

          {!isCollapsed && (
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
                        <WorkspaceCollapse
                          key={group.workspace}
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

  if (timelineSections.length === 0 && pinnedConversations.length === 0 && unassignedProjects.length === 0) {
    return (
      <div className='py-48px flex-center'>
        <Empty description={t('conversation.history.noHistory')} />
      </div>
    );
  }

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

      <DirectorySelectionModal
        visible={workspacePickerProject !== null}
        onConfirm={handleSelectProjectWorkspace}
        onCancel={() => setWorkspacePickerProject(null)}
      />

      <TeamCreateModal
        visible={teamCreateProject !== null}
        projectId={teamCreateProject?.id}
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

        <div className='mb-8px px-12px'>
          <Button
            type='text'
            long
            className='!justify-start !px-10px !text-[rgb(var(--warning-5))] hover:!bg-fill-3'
            onClick={() => setProjectModalVisible(true)}
          >
            <span className='flex min-w-0 items-center gap-8px'>
              <FolderPlus className='text-[16px] shrink-0' />
              <span className='truncate font-medium'>{t('conversation.history.createProject')}</span>
            </span>
          </Button>
        </div>

        {unassignedProjects.length > 0 && !collapsed && (
          <div className='mb-8px min-w-0'>
            {!collapsed && (
              <div
                className='flex items-center px-12px py-8px cursor-pointer select-none sticky top-0 z-10 bg-fill-2'
                onClick={() => toggleSection('projects')}
              >
                <span className='text-13px text-t-secondary font-bold leading-20px'>
                  {t('conversation.history.projectsSection')}
                </span>
                <div className='ml-auto h-20px w-20px rd-4px flex items-center justify-center hover:bg-fill-3 transition-all shrink-0 text-t-secondary'>
                  {collapsedSections.has('projects') ? (
                    <Right theme='outline' size={12} />
                  ) : (
                    <Down theme='outline' size={12} />
                  )}
                </div>
              </div>
            )}
            {!collapsedSections.has('projects') &&
              unassignedProjects.map((project) =>
                renderProjectGroup({
                  project,
                  conversations: [],
                  chatConversations: [],
                  workspaceGroups: [],
                  teams: [],
                })
              )}
          </div>
        )}

        {timelineSections.map((section) => (
          <div key={section.timeline} className='mb-8px min-w-0'>
            {!collapsed && (
              <div
                className='flex items-center px-12px py-8px cursor-pointer select-none sticky top-0 z-10 bg-fill-2'
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
