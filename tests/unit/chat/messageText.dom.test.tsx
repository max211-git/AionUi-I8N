import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMessageText } from '@/common/chat/chatLib';
import { ConversationProvider } from '@/renderer/hooks/context/ConversationContext';
import MessageText from '@/renderer/pages/conversation/Messages/components/MessageText';

const mockFilePreview = vi.fn(({ path }: { path: string }) => <div data-testid='file-preview'>{path}</div>);
const mockProjectGet = vi.fn();
const mockEditorModal = vi.fn(
  ({
    visible,
    projectId,
    title,
    initialDraft,
  }: {
    visible?: boolean;
    projectId: string;
    title?: string;
    initialDraft?: { name?: string; content?: string; type?: string };
  }) =>
    visible ? (
      <div data-testid='remember-modal'>
        <div>{projectId}</div>
        <div>{title}</div>
        <div>{initialDraft?.name}</div>
        <div>{initialDraft?.content}</div>
        <div>{initialDraft?.type}</div>
      </div>
    ) : null
);

vi.mock('@/common', () => ({
  ipcBridge: {
    project: {
      get: { invoke: (...args: unknown[]) => mockProjectGet(...args) },
    },
  },
}));

vi.mock('@/renderer/components/chat/CollapsibleContent', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/renderer/components/media/FilePreview', () => ({
  __esModule: true,
  default: (props: { path: string }) => mockFilePreview(props),
}));

vi.mock('@/renderer/components/media/HorizontalFileList', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/renderer/components/Markdown', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/renderer/utils/chat/skillSuggestParser', () => ({
  hasSkillSuggest: () => false,
  stripSkillSuggest: (content: string) => content,
}));

vi.mock('@/renderer/utils/chat/thinkTagFilter', () => ({
  hasThinkTags: () => false,
  stripThinkTags: (content: string) => content,
}));

vi.mock('@/renderer/utils/model/agentLogo', () => ({
  getAgentLogo: () => null,
}));

vi.mock('@/renderer/utils/ui/clipboard', () => ({
  copyText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@arco-design/web-react', () => ({
  Alert: () => null,
  Dropdown: ({ children, droplist }: { children?: React.ReactNode; droplist?: React.ReactNode }) => (
    <div>
      {children}
      {droplist}
    </div>
  ),
  Menu: Object.assign(
    ({
      children,
      onClickMenuItem,
    }: {
      children?: React.ReactNode;
      onClickMenuItem?: (key: string) => void;
    }) => <div onClick={() => onClickMenuItem?.('remember-project')}>{children}</div>,
    {
      Item: ({ children }: { children?: React.ReactNode }) => <button type='button'>{children}</button>,
    }
  ),
  Message: {
    error: vi.fn(),
  },
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@icon-park/react', () => ({
  Copy: () => <span data-testid='copy-icon' />,
  MoreOne: () => <span data-testid='remember-icon' />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock(
  '@/renderer/pages/conversation/GroupedHistory/components/projectMemory/ProjectMemoryEntryEditorModal',
  () => ({
    __esModule: true,
    default: (props: {
      visible?: boolean;
      projectId: string;
      title?: string;
      initialDraft?: { name?: string; content?: string; type?: string };
    }) => mockEditorModal(props),
  })
);

describe('MessageText attachment paths', () => {
  beforeEach(() => {
    mockFilePreview.mockClear();
    mockProjectGet.mockReset();
    mockEditorModal.mockClear();
  });

  it('resolves relative attachment paths against the current workspace before previewing', () => {
    const message: IMessageText = {
      id: 'msg-1',
      msg_id: 'msg-1',
      conversation_id: 'conv-1',
      type: 'text',
      position: 'right',
      createdAt: Date.now(),
      content: {
        content: 'look at this\n\n[[AION_FILES]]\nuploads/photo.png',
      },
    };

    render(
      <ConversationProvider value={{ conversationId: 'conv-1', workspace: '/workspace/demo', type: 'acp' }}>
        <MessageText message={message} />
      </ConversationProvider>
    );

    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/demo/uploads/photo.png');
  });

  it('keeps absolute attachment paths unchanged before previewing', () => {
    const message: IMessageText = {
      id: 'msg-2',
      msg_id: 'msg-2',
      conversation_id: 'conv-1',
      type: 'text',
      position: 'right',
      createdAt: Date.now(),
      content: {
        content: 'look at this\n\n[[AION_FILES]]\n/Users/demo/Desktop/photo.png',
      },
    };

    render(
      <ConversationProvider value={{ conversationId: 'conv-1', workspace: '/workspace/demo', type: 'acp' }}>
        <MessageText message={message} />
      </ConversationProvider>
    );

    expect(screen.getByTestId('file-preview')).toHaveTextContent('/Users/demo/Desktop/photo.png');
  });

  it('shows remember-for-project action only for project-backed conversations', () => {
    const message: IMessageText = {
      id: 'msg-3',
      msg_id: 'msg-3',
      conversation_id: 'conv-1',
      type: 'text',
      position: 'right',
      createdAt: Date.now(),
      content: {
        content: 'Call me Max.',
      },
    };

    const { rerender } = render(
      <ConversationProvider value={{ conversationId: 'conv-1', workspace: '/workspace/demo', projectId: 'project-1', type: 'acp' }}>
        <MessageText message={message} />
      </ConversationProvider>
    );

    expect(screen.getByText('messages.rememberForProject')).toBeInTheDocument();

    rerender(
      <ConversationProvider value={{ conversationId: 'conv-1', workspace: '/workspace/demo', type: 'acp' }}>
        <MessageText message={message} />
      </ConversationProvider>
    );

    expect(screen.queryByText('messages.rememberForProject')).not.toBeInTheDocument();
  });

  it('opens a prefilled remember-for-project editor from the message action', async () => {
    mockProjectGet.mockResolvedValue({
      id: 'project-1',
      name: 'Atlas',
      createdAt: 1,
      updatedAt: 1,
    });

    const message: IMessageText = {
      id: 'msg-4',
      msg_id: 'msg-4',
      conversation_id: 'conv-1',
      type: 'text',
      position: 'right',
      createdAt: Date.now(),
      content: {
        content: 'My preferred nickname is Max.',
      },
    };

    render(
      <ConversationProvider value={{ conversationId: 'conv-1', workspace: '/workspace/demo', projectId: 'project-1', type: 'acp' }}>
        <MessageText message={message} />
      </ConversationProvider>
    );

    fireEvent.click(screen.getByText('messages.rememberForProject'));

    await waitFor(() => {
      expect(mockProjectGet).toHaveBeenCalledWith({ id: 'project-1' });
    });

    expect(screen.getByTestId('remember-modal')).toBeInTheDocument();
    expect(screen.getByText('project-1')).toBeInTheDocument();
    const latestModalProps = mockEditorModal.mock.calls.at(-1)?.[0];
    expect(latestModalProps.initialDraft).toMatchObject({
      name: 'My preferred nickname is Max.',
      content: 'My preferred nickname is Max.',
      type: 'user',
    });
  });
});
