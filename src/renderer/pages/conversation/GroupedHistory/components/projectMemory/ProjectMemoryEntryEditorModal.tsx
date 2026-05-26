/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ProjectMemoryEntryType, TProjectMemoryEntry } from '@/common/projectMemory';
import { PROJECT_MEMORY_ENTRY_TYPES } from '@/common/projectMemory';
import { Input, Message, Modal, Select } from '@arco-design/web-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createProjectMemoryEntryDraft,
  createProjectMemoryInputFromDraft,
  draftFromProjectMemoryEntry,
  type ProjectMemoryEntryDraft,
} from './editorUtils';

type ProjectMemoryEntryEditorModalProps = {
  visible: boolean;
  projectId: string;
  editingEntry?: TProjectMemoryEntry | null;
  initialDraft?: Partial<ProjectMemoryEntryDraft>;
  title?: string;
  okText?: string;
  onCancel: () => void;
  onSaved?: () => void | Promise<void>;
};

const ProjectMemoryEntryEditorModal: React.FC<ProjectMemoryEntryEditorModalProps> = ({
  visible,
  projectId,
  editingEntry,
  initialDraft,
  title,
  okText,
  onCancel,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [messageApi, messageContext] = Message.useMessage();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProjectMemoryEntryDraft>(createProjectMemoryEntryDraft(initialDraft));

  useEffect(() => {
    if (!visible) {
      setSaving(false);
      setDraft(createProjectMemoryEntryDraft());
      return;
    }

    setDraft(editingEntry ? draftFromProjectMemoryEntry(editingEntry) : createProjectMemoryEntryDraft(initialDraft));
  }, [editingEntry, initialDraft, visible]);

  const entryTypeOptions = useMemo(
    () =>
      PROJECT_MEMORY_ENTRY_TYPES.map((type) => ({
        label: t(`conversation.history.projectMemoryType${type[0].toUpperCase()}${type.slice(1)}` as const),
        value: type,
      })),
    [t]
  );

  const handleSave = async () => {
    if (!projectId) {
      return;
    }

    const input = createProjectMemoryInputFromDraft(draft);
    if (!input.name || !input.content) {
      await messageApi.error(t('conversation.history.projectMemoryEntryValidation'));
      return;
    }

    setSaving(true);
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

      await onSaved?.();
      onCancel();
    } catch (error) {
      console.error('[ProjectMemoryEntryEditorModal] Failed to save entry:', error);
      await messageApi.error(editingEntry ? t('common.saveFailed') : t('common.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {messageContext}
      <Modal
        title={
          title ||
          (editingEntry
            ? t('conversation.history.projectMemoryEditEntry')
            : t('conversation.history.projectMemoryAddEntry'))
        }
        visible={visible}
        onCancel={onCancel}
        onOk={() => void handleSave()}
        okText={okText || (editingEntry ? t('common.save') : t('common.create'))}
        cancelText={t('common.cancel')}
        confirmLoading={saving}
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

export default ProjectMemoryEntryEditorModal;
