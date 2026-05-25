/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import {
  PROJECT_MEMORY_ENTRY_TYPES,
  type CreateProjectMemoryEntryInput,
  type ProjectMemoryEntryType,
  type TProjectMemoryEntry,
  type TProjectMemorySettings,
} from '@/common/projectMemory';
import type { TProject } from '@/common/adapter/ipcBridge';
import { Button, Empty, Input, Message, Modal, Select, Switch, Tag } from '@arco-design/web-react';
import { DeleteOne, EditOne, Plus } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

type EntryDraft = {
  name: string;
  description: string;
  type: ProjectMemoryEntryType;
  content: string;
  tags: string;
};

const EMPTY_DRAFT: EntryDraft = {
  name: '',
  description: '',
  type: 'project',
  content: '',
  tags: '',
};

const parseTags = (value: string): string[] =>
  value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const toDraft = (entry: TProjectMemoryEntry): EntryDraft => ({
  name: entry.name,
  description: entry.description ?? '',
  type: entry.type,
  content: entry.content,
  tags: entry.tags.join(', '),
});

const ProjectMemoryModal: React.FC<ProjectMemoryModalProps> = ({ visible, project, onCancel }) => {
  const { t } = useTranslation();
  const [messageApi, messageContext] = Message.useMessage();
  const [loading, setLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [entries, setEntries] = useState<TProjectMemoryEntry[]>([]);
  const [settings, setSettings] = useState<TProjectMemorySettings | null>(null);
  const [summary, setSummary] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TProjectMemoryEntry | null>(null);
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);

  const projectId = project?.id ?? '';

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
      await messageApi.error(t('conversation.history.projectMemoryLoadFailed'));
      setEntries([]);
      setSettings(DEFAULT_SETTINGS(projectId));
      setSummary('');
    } finally {
      setLoading(false);
    }
  }, [messageApi, projectId, t]);

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
      setEditorSaving(false);
      setEditingEntry(null);
      setDraft(EMPTY_DRAFT);
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
    setDraft(EMPTY_DRAFT);
    setEditorVisible(true);
  }, []);

  const openEditEditor = useCallback((entry: TProjectMemoryEntry) => {
    setEditingEntry(entry);
    setDraft(toDraft(entry));
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

  const handleSaveEntry = useCallback(async () => {
    if (!projectId) {
      return;
    }
    const input: CreateProjectMemoryEntryInput = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      type: draft.type,
      content: draft.content.trim(),
      tags: parseTags(draft.tags),
    };

    if (!input.name || !input.content) {
      await messageApi.error(t('conversation.history.projectMemoryEntryValidation'));
      return;
    }

    setEditorSaving(true);
    try {
      if (editingEntry) {
        const success = await ipcBridge.projectMemory.update.invoke({
          projectId,
          entryId: editingEntry.id,
          updates: input,
        });
        if (!success) {
          throw new Error('Failed to update project memory entry');
        }
        await messageApi.success(t('common.saveSuccess'));
      } else {
        await ipcBridge.projectMemory.create.invoke({ projectId, input });
        await messageApi.success(t('common.createSuccess'));
      }

      setEditorVisible(false);
      setEditingEntry(null);
      setDraft(EMPTY_DRAFT);
      await loadData();
    } catch (error) {
      console.error('[ProjectMemoryModal] Failed to save entry:', error);
      await messageApi.error(editingEntry ? t('common.saveFailed') : t('common.failed'));
    } finally {
      setEditorSaving(false);
    }
  }, [draft, editingEntry, loadData, messageApi, projectId, t]);

  return (
    <>
      {messageContext}
      <Modal
        title={t('conversation.history.projectMemory')}
        visible={visible}
        onCancel={onCancel}
        footer={null}
        style={{ width: 760, borderRadius: '16px' }}
        alignCenter
        unmountOnExit
        getPopupContainer={() => document.body}
      >
        <div className='flex flex-col gap-16px'>
          <div className='rounded-12px bg-fill-1 px-16px py-12px'>
            <div className='text-14px font-medium text-t-primary'>
              {t('conversation.history.projectMemoryForProject', { name: project?.name ?? '' })}
            </div>
            <div className='mt-4px text-12px leading-18px text-t-secondary'>
              {t('conversation.history.projectMemoryDescription')}
            </div>
          </div>

          <div className='flex items-center justify-between gap-12px rounded-12px border border-solid border-line-2 px-16px py-12px'>
            <div className='min-w-0'>
              <div className='text-14px font-medium text-t-primary'>
                {t('conversation.history.projectMemoryEnableLabel')}
              </div>
              <div className='mt-4px text-12px leading-18px text-t-secondary'>
                {t('conversation.history.projectMemoryEnableHint')}
              </div>
            </div>
            <Switch
              checked={settings?.enabled ?? false}
              loading={settingsSaving}
              disabled={!projectId || loading}
              onChange={(checked) => void handleToggleEnabled(checked)}
            />
          </div>

          <div className='rounded-12px border border-solid border-line-2 px-16px py-14px'>
            <div className='mb-10px flex items-center justify-between gap-12px'>
              <div className='text-14px font-medium text-t-primary'>
                {t('conversation.history.projectMemorySummaryTitle')}
              </div>
              <Button size='mini' type='text' loading={loading} onClick={() => void loadData()}>
                {t('common.refresh')}
              </Button>
            </div>
            <Input.TextArea
              value={summaryPlaceholder}
              readOnly
              autoSize={{ minRows: 4, maxRows: 10 }}
              className='project-memory-summary'
            />
          </div>

          <div className='rounded-12px border border-solid border-line-2 px-16px py-14px'>
            <div className='mb-12px flex items-center justify-between gap-12px'>
              <div className='text-14px font-medium text-t-primary'>
                {t('conversation.history.projectMemoryEntriesTitle')}
              </div>
              <Button type='primary' icon={<Plus theme='outline' size='14' />} onClick={openCreateEditor}>
                {t('conversation.history.projectMemoryAddEntry')}
              </Button>
            </div>

            {entries.length === 0 ? (
              <Empty description={t('conversation.history.projectMemoryEmpty')} />
            ) : (
              <div className='flex max-h-420px flex-col gap-10px overflow-y-auto pr-2px'>
                {entries.map((entry) => (
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
            )}
          </div>
        </div>
      </Modal>

      <Modal
        title={
          editingEntry
            ? t('conversation.history.projectMemoryEditEntry')
            : t('conversation.history.projectMemoryAddEntry')
        }
        visible={editorVisible}
        onCancel={() => {
          setEditorVisible(false);
          setEditingEntry(null);
          setDraft(EMPTY_DRAFT);
        }}
        onOk={() => void handleSaveEntry()}
        okText={editingEntry ? t('common.save') : t('common.create')}
        cancelText={t('common.cancel')}
        confirmLoading={editorSaving}
        okButtonProps={{ disabled: !draft.name.trim() || !draft.content.trim() }}
        style={{ borderRadius: '16px' }}
        alignCenter
        unmountOnExit
        getPopupContainer={() => document.body}
      >
        <div className='flex flex-col gap-12px'>
          <Input
            value={draft.name}
            onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            placeholder={t('conversation.history.projectMemoryEntryNamePlaceholder')}
          />
          <Select
            value={draft.type}
            options={entryTypeOptions}
            onChange={(value) => setDraft((current) => ({ ...current, type: value as ProjectMemoryEntryType }))}
          />
          <Input
            value={draft.description}
            onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
            placeholder={t('conversation.history.projectMemoryEntryDescriptionPlaceholder')}
          />
          <Input.TextArea
            value={draft.content}
            onChange={(value) => setDraft((current) => ({ ...current, content: value }))}
            placeholder={t('conversation.history.projectMemoryEntryContentPlaceholder')}
            autoSize={{ minRows: 5, maxRows: 12 }}
          />
          <Input
            value={draft.tags}
            onChange={(value) => setDraft((current) => ({ ...current, tags: value }))}
            placeholder={t('conversation.history.projectMemoryEntryTagsPlaceholder')}
          />
        </div>
      </Modal>
    </>
  );
};

export default ProjectMemoryModal;
