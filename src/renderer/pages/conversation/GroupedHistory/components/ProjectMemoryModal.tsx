/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import {
  PROJECT_MEMORY_ENTRY_TYPES,
  type TProjectMemoryEntry,
  type TProjectMemorySettings,
} from '@/common/projectMemory';
import type { TProject } from '@/common/adapter/ipcBridge';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { Button, Empty, Input, Message, Modal, Switch, Tag } from '@arco-design/web-react';
import { DeleteOne, EditOne, Plus } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectMemoryEntryEditorModal from './projectMemory/ProjectMemoryEntryEditorModal';
import {
  createProjectMemoryEntryDraft,
  draftFromProjectMemoryEntry,
  type ProjectMemoryEntryDraft,
} from './projectMemory/editorUtils';
import styles from './ProjectMemoryModal.module.css';

const DEFAULT_SETTINGS = (projectId: string): TProjectMemorySettings => ({
  projectId,
  enabled: false,
  createdAt: 0,
  updatedAt: 0,
});

type ProjectMemoryModalProps = {
  visible: boolean;
  project: TProject | null;
  onCancel: () => void;
};

const ProjectMemoryModal: React.FC<ProjectMemoryModalProps> = ({ visible, project, onCancel }) => {
  const { t } = useTranslation();
  const [messageApi, messageContext] = Message.useMessage();
  const [loading, setLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [entries, setEntries] = useState<TProjectMemoryEntry[]>([]);
  const [settings, setSettings] = useState<TProjectMemorySettings | null>(null);
  const [summary, setSummary] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TProjectMemoryEntry | null>(null);
  const [editorInitialDraft, setEditorInitialDraft] = useState<ProjectMemoryEntryDraft>(createProjectMemoryEntryDraft());
  const [searchQuery, setSearchQuery] = useState('');
  const latestMessageApiRef = useRef(messageApi);
  const latestTRef = useRef(t);

  const projectId = project?.id ?? '';

  useEffect(() => {
    latestMessageApiRef.current = messageApi;
    latestTRef.current = t;
  }, [messageApi, t]);

  const summaryPlaceholder = useMemo(() => {
    if (!settings?.enabled) {
      return t('conversation.history.projectMemorySummaryDisabled');
    }
    if (summary.trim()) {
      return summary;
    }
    return t('conversation.history.projectMemorySummaryEmpty');
  }, [settings?.enabled, summary, t]);

  const loadData = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    try {
      const [nextEntries, nextSettings, nextSummary] = await Promise.all([
        ipcBridge.projectMemory.list.invoke({ projectId }),
        ipcBridge.projectMemory.getSettings.invoke({ projectId }),
        ipcBridge.projectMemory.getSummary.invoke({ projectId }),
      ]);
      setEntries(nextEntries);
      setSettings(nextSettings);
      setSummary(nextSummary);
    } catch (error) {
      console.error('[ProjectMemoryModal] Failed to load project memory:', error);
      await latestMessageApiRef.current.error(latestTRef.current('conversation.history.projectMemoryLoadFailed'));
      setEntries([]);
      setSettings(DEFAULT_SETTINGS(projectId));
      setSummary('');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!visible || !projectId) {
      return;
    }
    void loadData();
  }, [loadData, projectId, visible]);

  useEffect(() => {
    if (!visible) {
      setEntries([]);
      setSettings(null);
      setSummary('');
      setEditorVisible(false);
      setEditingEntry(null);
      setEditorInitialDraft(createProjectMemoryEntryDraft());
      setSearchQuery('');
    }
  }, [visible]);

  const entryTypeOptions = useMemo(
    () =>
      PROJECT_MEMORY_ENTRY_TYPES.map((type) => ({
        label: t(`conversation.history.projectMemoryType${type[0].toUpperCase()}${type.slice(1)}` as const),
        value: type,
      })),
    [t]
  );

  const handleToggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (!projectId) {
        return;
      }
      setSettingsSaving(true);
      try {
        const nextSettings = await ipcBridge.projectMemory.updateSettings.invoke({ projectId, enabled });
        setSettings(nextSettings);
        const nextSummary = await ipcBridge.projectMemory.getSummary.invoke({ projectId });
        setSummary(nextSummary);
        await messageApi.success(t('common.saveSuccess'));
      } catch (error) {
        console.error('[ProjectMemoryModal] Failed to update settings:', error);
        await messageApi.error(t('common.saveFailed'));
      } finally {
        setSettingsSaving(false);
      }
    },
    [messageApi, projectId, t]
  );

  const openCreateEditor = useCallback(() => {
    setEditingEntry(null);
    setEditorInitialDraft(createProjectMemoryEntryDraft());
    setEditorVisible(true);
  }, []);

  const openEditEditor = useCallback((entry: TProjectMemoryEntry) => {
    setEditingEntry(entry);
    setEditorInitialDraft(draftFromProjectMemoryEntry(entry));
    setEditorVisible(true);
  }, []);

  const handleDeleteEntry = useCallback(
    (entry: TProjectMemoryEntry) => {
      if (!projectId) {
        return;
      }
      Modal.confirm({
        title: t('conversation.history.projectMemoryDeleteEntryTitle'),
        content: t('conversation.history.projectMemoryDeleteEntryConfirm', { name: entry.name }),
        okText: t('common.delete'),
        cancelText: t('common.cancel'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          try {
            const success = await ipcBridge.projectMemory.remove.invoke({ projectId, entryId: entry.id });
            if (!success) {
              throw new Error('Failed to remove project memory entry');
            }
            await loadData();
            await messageApi.success(t('common.deleteSuccess'));
          } catch (error) {
            console.error('[ProjectMemoryModal] Failed to delete entry:', error);
            await messageApi.error(t('common.deleteFailed'));
          }
        },
        style: { borderRadius: '12px' },
        alignCenter: true,
        getPopupContainer: () => document.body,
      });
    },
    [loadData, messageApi, projectId, t]
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystacks = [entry.name, entry.content, entry.tags.join(' '), entry.description ?? ''];
      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [entries, searchQuery]);

  return (
    <>
      {messageContext}
      <Modal
        title={t('conversation.history.projectMemory')}
        visible={visible}
        onCancel={onCancel}
        footer={null}
        className={styles.projectMemoryModal}
        style={{ width: 980, borderRadius: '16px' }}
        alignCenter
        unmountOnExit
        getPopupContainer={() => document.body}
      >
        <div className={styles.modalContent}>
          <div className='flex items-start justify-between gap-16px rounded-12px bg-fill-1 px-16px py-12px'>
            <div className='min-w-0 flex-1'>
              <div className='text-14px font-medium text-t-primary'>
                {t('conversation.history.projectMemoryForProject', { name: project?.name ?? '' })}
              </div>
              <div className='mt-4px text-12px leading-18px text-t-secondary'>
                {t('conversation.history.projectMemoryDescription')}
              </div>
            </div>
            <div className='min-w-240px rounded-12px border border-solid border-line-2 bg-bg-1 px-16px py-12px'>
              <div className='text-14px font-medium text-t-primary'>
                {t('conversation.history.projectMemoryEnableLabel')}
              </div>
              <div className='mt-4px text-12px leading-18px text-t-secondary'>
                {t('conversation.history.projectMemoryEnableHint')}
              </div>
              <div className='mt-12px flex justify-end'>
                <Switch
                  checked={settings?.enabled ?? false}
                  loading={settingsSaving}
                  disabled={!projectId || settingsSaving}
                  onChange={(checked) => void handleToggleEnabled(checked)}
                />
              </div>
            </div>
          </div>

          <div className={styles.bodyLayout}>
            <section className={styles.columnPanel}>
              <div className={styles.panelHeader}>
                <div className='text-14px font-medium text-t-primary'>
                  {t('conversation.history.projectMemoryEntriesTitle')}
                </div>
                <Button type='primary' icon={<Plus theme='outline' size='14' />} onClick={openCreateEditor}>
                  {t('conversation.history.projectMemoryAddEntry')}
                </Button>
              </div>

              {entries.length > 0 ? (
                <Input
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('conversation.history.projectMemorySearchPlaceholder')}
                />
              ) : null}

              {entries.length === 0 ? (
                <div className='flex flex-1 items-center justify-center'>
                  <Empty description={t('conversation.history.projectMemoryEmpty')} />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className='mt-12px flex flex-1 items-center justify-center'>
                  <Empty description={t('conversation.history.projectMemorySearchEmpty')} />
                </div>
              ) : (
                <AionScrollArea className={styles.entriesScrollArea}>
                  <div className='flex flex-col gap-10px pr-6px'>
                    {filteredEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className='rounded-12px border border-solid border-line-2 bg-fill-1 px-14px py-12px'
                      >
                        <div className='flex items-start justify-between gap-12px'>
                          <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-8px'>
                              <span className='min-w-0 truncate text-14px font-medium text-t-primary'>{entry.name}</span>
                              <Tag>
                                {t(
                                  `conversation.history.projectMemoryType${entry.type[0].toUpperCase()}${entry.type.slice(1)}` as const
                                )}
                              </Tag>
                            </div>
                            {entry.description ? (
                              <div className='mt-4px text-12px leading-18px text-t-secondary'>{entry.description}</div>
                            ) : null}
                          </div>
                          <div className='flex items-center gap-4px'>
                            <Button
                              size='mini'
                              type='text'
                              icon={<EditOne theme='outline' size='14' />}
                              onClick={() => openEditEditor(entry)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              size='mini'
                              type='text'
                              status='danger'
                              icon={<DeleteOne theme='outline' size='14' />}
                              onClick={() => handleDeleteEntry(entry)}
                            >
                              {t('common.delete')}
                            </Button>
                          </div>
                        </div>
                        <div className='mt-8px whitespace-pre-wrap text-12px leading-18px text-t-primary'>
                          {entry.content}
                        </div>
                        {entry.tags.length > 0 ? (
                          <div className='mt-8px flex flex-wrap gap-6px'>
                            {entry.tags.map((tag) => (
                              <Tag key={`${entry.id}-${tag}`}>{tag}</Tag>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </AionScrollArea>
              )}
            </section>

            <section className={styles.columnPanel}>
              <div className={styles.panelHeader}>
                <div className='text-14px font-medium text-t-primary'>
                  {t('conversation.history.projectMemorySummaryTitle')}
                </div>
                <Button size='mini' type='text' loading={loading} onClick={() => void loadData()}>
                  {t('common.refresh')}
                </Button>
              </div>

              <div className={styles.summaryPanel}>
                <AionScrollArea className='min-h-0 flex-1 whitespace-pre-wrap text-12px leading-20px text-t-primary'>
                  {summaryPlaceholder}
                </AionScrollArea>
              </div>
            </section>
          </div>
        </div>
      </Modal>

      <ProjectMemoryEntryEditorModal
        visible={editorVisible}
        projectId={projectId}
        editingEntry={editingEntry}
        initialDraft={editorInitialDraft}
        onCancel={() => {
          setEditorVisible(false);
          setEditingEntry(null);
          setEditorInitialDraft(createProjectMemoryEntryDraft());
        }}
        onSaved={loadData}
      />
    </>
  );
};

export default ProjectMemoryModal;
