import { ipcBridge } from '@/common';
import type { TProject } from '@/common/adapter/ipcBridge';
import type { TProviderWithModel } from '@/common/config/storage';
import type { AgentBackend } from '@/common/types/acpTypes';
import { ConfigStorage } from '@/common/config/storage';
import { Modal, Input, Select, Message } from '@arco-design/web-react';
import WorkspaceFolderSelect from '@renderer/components/workspace/WorkspaceFolderSelect';
import { useConversationAgents } from '@renderer/pages/conversation/hooks/useConversationAgents';
import type { AvailableAgent } from '@renderer/utils/model/agentTypes';
import {
  AgentOptionLabel,
  agentFromKey,
  agentKey,
  resolveConversationType,
} from '@renderer/pages/team/components/agentSelectUtils';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const getFolderName = (workspace: string): string => {
  const trimmed = workspace.trim();
  if (!trimmed) {
    return '';
  }
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
};

const resolveAgentModel = async (agent: AvailableAgent): Promise<TProviderWithModel> => {
  if (agent.isPreset && agent.customAgentId) {
    const assistants = (await ConfigStorage.get('assistants')) || [];
    const preset = assistants.find((item) => item.id === agent.customAgentId);
    return {
      id: agent.customAgentId,
      platform: agent.presetAgentType || agent.backend,
      name: agent.name,
      baseUrl: '',
      apiKey: '',
      useModel: preset?.models?.[0] || '',
    };
  }

  return {
    id: agent.backend,
    platform: agent.backend,
    name: agent.name,
    baseUrl: '',
    apiKey: '',
    useModel: '',
  };
};

type WorkspaceChatCreateModalProps = {
  visible: boolean;
  project?: TProject | null;
  onCancel: () => void;
  onCreated?: () => void;
};

const WorkspaceChatCreateModal: React.FC<WorkspaceChatCreateModalProps> = ({
  visible,
  project,
  onCancel,
  onCreated,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [messageApi, messageContext] = Message.useMessage();
  const { cliAgents, presetAssistants, isLoading } = useConversationAgents();
  const [selectedAgentKey, setSelectedAgentKey] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const availableAgents = useMemo(() => [...presetAssistants, ...cliAgents], [cliAgents, presetAssistants]);
  const selectedAgent = useMemo(
    () => agentFromKey(selectedAgentKey, availableAgents),
    [availableAgents, selectedAgentKey]
  );

  const resetState = () => {
    setSelectedAgentKey('');
    setWorkspace('');
    setName('');
    setNameTouched(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onCancel();
  };

  const handleWorkspaceChange = (value: string) => {
    const previousAutoName = getFolderName(workspace);
    const nextAutoName = getFolderName(value);
    setWorkspace(value);
    if (!nameTouched || !name.trim() || name === previousAutoName) {
      setName(nextAutoName);
      setNameTouched(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameTouched(true);
  };

  const handleCreate = async () => {
    if (!selectedAgent) {
      await messageApi.error(t('conversation.history.workspaceCreateAgentRequired'));
      return;
    }
    const finalWorkspace = workspace.trim();
    if (!finalWorkspace) {
      await messageApi.error(t('conversation.history.workspaceCreateFolderRequired'));
      return;
    }

    const finalName =
      name.trim() || getFolderName(finalWorkspace) || t('conversation.history.newWorkspaceChatInProject');
    const backend = selectedAgent.presetAgentType || selectedAgent.backend;
    const type = resolveConversationType(backend);
    const model = await resolveAgentModel(selectedAgent);

    setSubmitting(true);
    try {
      const conversation = await ipcBridge.conversation.create.invoke({
        type,
        name: finalName,
        model,
        projectId: project?.id,
        extra: {
          workspace: finalWorkspace,
          customWorkspace: true,
          presetAssistantId: selectedAgent.customAgentId,
          backend: selectedAgent.backend as AgentBackend,
          agentName: selectedAgent.name,
        },
      });

      resetState();
      onCreated?.();
      navigate(`/conversation/${conversation.id}`);
    } catch (error) {
      console.error('Failed to create workspace chat', error);
      await messageApi.error(t('conversation.history.workspaceCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {messageContext}
      <Modal
        title={t('conversation.history.workspaceCreateTitle')}
        visible={visible}
        onCancel={handleClose}
        onOk={() => void handleCreate()}
        okText={t('conversation.history.workspaceCreateConfirm')}
        confirmLoading={submitting}
        autoFocus={false}
      >
        <div className='flex flex-col gap-12px'>
          <Select
            loading={isLoading}
            value={selectedAgentKey || undefined}
            placeholder={t('conversation.history.workspaceCreateAgentPlaceholder')}
            onChange={(value) => setSelectedAgentKey(value)}
            options={availableAgents.map((agent) => ({
              label: <AgentOptionLabel agent={agent} />,
              value: agentKey(agent),
            }))}
          />

          <WorkspaceFolderSelect
            value={workspace}
            onChange={handleWorkspaceChange}
            onClear={() => handleWorkspaceChange('')}
            placeholder={t('conversation.history.workspaceCreateFolderPlaceholder')}
            recentLabel={t('conversation.history.workspaceCreateRecentFolders')}
            chooseDifferentLabel={t('conversation.history.workspaceCreateChooseFolder')}
          />

          <Input
            value={name}
            onChange={handleNameChange}
            placeholder={t('conversation.history.workspaceCreateNamePlaceholder')}
          />
        </div>
      </Modal>
    </>
  );
};

export default WorkspaceChatCreateModal;
