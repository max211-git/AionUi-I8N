import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TProject } from '@/common/adapter/ipcBridge';

const bridgeState = vi.hoisted(() => ({
  list: vi.fn(),
  getSettings: vi.fn(),
  getSummary: vi.fn(),
  updateSettings: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: Record<string, string>) => values?.name ?? key }),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    projectMemory: {
      list: { invoke: (...args: unknown[]) => bridgeState.list(...args) },
      getSettings: { invoke: (...args: unknown[]) => bridgeState.getSettings(...args) },
      getSummary: { invoke: (...args: unknown[]) => bridgeState.getSummary(...args) },
      updateSettings: { invoke: (...args: unknown[]) => bridgeState.updateSettings(...args) },
      create: { invoke: (...args: unknown[]) => bridgeState.create(...args) },
      update: { invoke: (...args: unknown[]) => bridgeState.update(...args) },
      remove: { invoke: (...args: unknown[]) => bridgeState.remove(...args) },
    },
  },
}));

vi.mock('@icon-park/react', () => ({
  DeleteOne: () => <span>delete-icon</span>,
  EditOne: () => <span>edit-icon</span>,
  Plus: () => <span>plus-icon</span>,
}));

vi.mock('@arco-design/web-react', () => {
  const ModalComponent = ({
    children,
    visible,
    title,
    footer,
    onOk,
    onCancel,
    okText,
    cancelText,
  }: {
    children?: React.ReactNode;
    visible?: boolean;
    title?: React.ReactNode;
    footer?: React.ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
    okText?: React.ReactNode;
    cancelText?: React.ReactNode;
  }) => {
    if (!visible) {
      return null;
    }
    return (
      <div>
        {title ? <div>{title}</div> : null}
        <div>{children}</div>
        {footer === null ? null : (
          <div>
            {cancelText ? <button onClick={onCancel}>{cancelText}</button> : null}
            {okText ? <button onClick={onOk}>{okText}</button> : null}
          </div>
        )}
      </div>
    );
  };

  return {
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    Empty: ({ description }: { description?: React.ReactNode }) => <div>{description}</div>,
    Input: Object.assign(
      ({
        value,
        onChange,
        placeholder,
        readOnly,
      }: {
        value?: string;
        onChange?: (value: string) => void;
        placeholder?: string;
        readOnly?: boolean;
      }) => (
        <input
          readOnly={readOnly}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
        />
      ),
      {
        TextArea: ({
          value,
          onChange,
          placeholder,
          readOnly,
        }: {
          value?: string;
          onChange?: (value: string) => void;
          placeholder?: string;
          readOnly?: boolean;
        }) => (
          <textarea
            readOnly={readOnly}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
          />
        ),
      }
    ),
    Message: {
      useMessage: () => [
        {
          success: bridgeState.success,
          error: bridgeState.error,
        },
        null,
      ],
    },
    Modal: Object.assign(ModalComponent, {
      confirm: vi.fn(({ onOk }: { onOk?: () => Promise<void> | void }) => {
        void onOk?.();
      }),
    }),
    Select: ({
      value,
      onChange,
      options,
    }: {
      value?: string;
      onChange?: (value: string) => void;
      options?: Array<{ label: React.ReactNode; value: string }>;
    }) => (
      <select value={value} onChange={(event) => onChange?.(event.target.value)}>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {typeof option.label === 'string' ? option.label : option.value}
          </option>
        ))}
      </select>
    ),
    Switch: ({
      checked,
      onChange,
      disabled,
    }: {
      checked?: boolean;
      onChange?: (checked: boolean) => void;
      disabled?: boolean;
    }) => (
      <input
        type='checkbox'
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    ),
    Tag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  };
});

import ProjectMemoryModal from '@/renderer/pages/conversation/GroupedHistory/components/ProjectMemoryModal';

const project: TProject = {
  id: 'project-1',
  name: 'Atlas',
  createdAt: 1,
  updatedAt: 1,
};

describe('ProjectMemoryModal', () => {
  beforeEach(() => {
    bridgeState.list.mockReset();
    bridgeState.getSettings.mockReset();
    bridgeState.getSummary.mockReset();
    bridgeState.updateSettings.mockReset();
    bridgeState.create.mockReset();
    bridgeState.update.mockReset();
    bridgeState.remove.mockReset();
    bridgeState.success.mockReset();
    bridgeState.error.mockReset();

    bridgeState.list.mockResolvedValue([]);
    bridgeState.getSettings.mockResolvedValue({
      projectId: project.id,
      enabled: false,
      createdAt: 1,
      updatedAt: 1,
    });
    bridgeState.getSummary.mockResolvedValue('');
    bridgeState.updateSettings.mockResolvedValue({
      projectId: project.id,
      enabled: true,
      createdAt: 1,
      updatedAt: 2,
    });
    bridgeState.create.mockResolvedValue({
      id: 'entry-1',
      projectId: project.id,
      name: 'Architecture',
      type: 'project',
      content: 'Keep service ownership stable.',
      source: 'user-explicit',
      status: 'approved',
      tags: ['arch'],
      createdAt: 1,
      updatedAt: 1,
    });
    bridgeState.update.mockResolvedValue(true);
    bridgeState.remove.mockResolvedValue(true);
  });

  it('loads and shows project memory entries and summary when opened', async () => {
    bridgeState.list.mockResolvedValue([
      {
        id: 'entry-1',
        projectId: project.id,
        name: 'Architecture',
        description: 'Core rule',
        type: 'project',
        content: 'Keep service ownership stable.',
        source: 'user-explicit',
        status: 'approved',
        tags: ['arch'],
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    bridgeState.getSettings.mockResolvedValue({
      projectId: project.id,
      enabled: true,
      createdAt: 1,
      updatedAt: 2,
    });
    bridgeState.getSummary.mockResolvedValue(
      '[Shared Project Memory]\n- Project convention: Keep service ownership stable.'
    );

    render(<ProjectMemoryModal visible={true} project={project} onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(bridgeState.list).toHaveBeenCalledWith({ projectId: project.id });
    });

    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toContain(
      'Project convention: Keep service ownership stable.'
    );
  });

  it('creates a new project memory entry from the modal flow', async () => {
    bridgeState.getSettings.mockResolvedValue({
      projectId: project.id,
      enabled: true,
      createdAt: 1,
      updatedAt: 2,
    });

    render(<ProjectMemoryModal visible={true} project={project} onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(bridgeState.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('conversation.history.projectMemoryAddEntry'));
    fireEvent.change(screen.getByPlaceholderText('conversation.history.projectMemoryEntryNamePlaceholder'), {
      target: { value: 'Architecture' },
    });
    fireEvent.change(screen.getByPlaceholderText('conversation.history.projectMemoryEntryContentPlaceholder'), {
      target: { value: 'Keep service ownership stable.' },
    });
    fireEvent.change(screen.getByPlaceholderText('conversation.history.projectMemoryEntryTagsPlaceholder'), {
      target: { value: 'arch, rules' },
    });
    fireEvent.click(screen.getByText('common.create'));

    await waitFor(() => {
      expect(bridgeState.create).toHaveBeenCalledWith({
        projectId: project.id,
        input: {
          name: 'Architecture',
          description: undefined,
          type: 'project',
          content: 'Keep service ownership stable.',
          tags: ['arch', 'rules'],
        },
      });
    });
  });

  it('shows an error when loading project memory fails', async () => {
    bridgeState.list.mockRejectedValue(new Error('boom'));

    render(<ProjectMemoryModal visible={true} project={project} onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(bridgeState.error).toHaveBeenCalledWith('conversation.history.projectMemoryLoadFailed');
    });
  });
});
