/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import { useProjectAssetInspectorState } from '@/renderer/pages/conversation/hooks/useProjectAssetInspectorSync';
import { Message } from '@arco-design/web-react';
import React from 'react';
import ProjectAssetsPanel from './ProjectAssetsPanel';
import ChatWorkspace from '../Workspace';

const getWorkspaceForInspector = (conversation?: TChatConversation): string => {
  return conversation?.extra?.workspace || '';
};

const ChatSider: React.FC<{
  conversation?: TChatConversation;
  teamId?: string;
}> = ({ conversation, teamId }) => {
  const [messageApi, messageContext] = Message.useMessage({ maxCount: 1 });
  const workspace = getWorkspaceForInspector(conversation);
  const { isActive: isProjectAssetInspectorActive, selection } = useProjectAssetInspectorState(conversation?.projectId);

  let inspectorNode: React.ReactNode = null;
  if (conversation && isProjectAssetInspectorActive && selection) {
    inspectorNode = (
      <ProjectAssetsPanel conversation={conversation} category={selection.category} messageApi={messageApi} />
    );
  }

  let workspaceNode: React.ReactNode = null;
  if (!inspectorNode && conversation?.type === 'gemini' && workspace) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspace}
        messageApi={messageApi}
        teamId={teamId}
      ></ChatWorkspace>
    );
  } else if (!inspectorNode && conversation?.type === 'acp' && workspace) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspace}
        eventPrefix='acp'
        messageApi={messageApi}
        teamId={teamId}
      ></ChatWorkspace>
    );
  } else if (!inspectorNode && conversation?.type === 'codex' && workspace) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspace}
        eventPrefix='codex'
        messageApi={messageApi}
        teamId={teamId}
      ></ChatWorkspace>
    );
  } else if (!inspectorNode && conversation?.type === 'aionrs' && workspace) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspace}
        eventPrefix='aionrs'
        messageApi={messageApi}
        teamId={teamId}
      ></ChatWorkspace>
    );
  }

  if (!inspectorNode && !workspaceNode) {
    return <div></div>;
  }

  return (
    <>
      {messageContext}
      {inspectorNode || workspaceNode}
    </>
  );
};

export default ChatSider;
