/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockAgentSend } = vi.hoisted(() => ({
  mockDb: {
    getConversationMessages: vi.fn(() => ({ data: [] })),
    getConversation: vi.fn(() => ({ success: false })),
    updateConversation: vi.fn(),
    createConversation: vi.fn(() => ({ success: true })),
    insertMessage: vi.fn(),
    updateMessage: vi.fn(),
  },
  mockAgentSend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      responseStream: { emit: vi.fn() },
      confirmation: {
        add: { emit: vi.fn() },
        update: { emit: vi.fn() },
        remove: { emit: vi.fn() },
      },
    },
    cron: {
      onJobCreated: { emit: vi.fn() },
      onJobRemoved: { emit: vi.fn() },
    },
  },
}));

vi.mock('@/common/platform', () => ({
  getPlatformServices: () => ({
    paths: { isPackaged: () => false, getAppPath: () => null },
    worker: {
      fork: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        postMessage: vi.fn(),
        kill: vi.fn(),
      })),
    },
  }),
}));

vi.mock('@process/utils/shellEnv', () => ({
  getEnhancedEnv: vi.fn(() => ({})),
}));

vi.mock('@process/services/database', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('@process/services/database/export', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('@process/utils/initStorage', () => ({
  ProcessChat: { get: vi.fn(() => Promise.resolve([])) },
}));

vi.mock('@process/utils/message', () => ({
  addMessage: vi.fn(),
  addOrUpdateMessage: vi.fn(),
}));

vi.mock('@/common/utils', () => {
  let counter = 0;
  return { uuid: vi.fn(() => `uuid-${++counter}`) };
});

vi.mock('@/renderer/utils/common', () => {
  let counter = 0;
  return { uuid: vi.fn(() => `pipe-${++counter}`) };
});

vi.mock('@process/utils/mainLogger', () => ({
  mainError: vi.fn(),
  mainLog: vi.fn(),
  mainWarn: vi.fn(),
}));

vi.mock('@process/services/cron/cronServiceSingleton', () => ({
  cronService: {
    addJob: vi.fn(async () => ({ id: 'cron-1', name: 'test', enabled: true })),
    removeJob: vi.fn(async () => {}),
    listJobsByConversation: vi.fn(async () => []),
  },
}));

vi.mock('@process/services/cron/CronBusyGuard', () => ({
  cronBusyGuard: {
    setProcessing: vi.fn(),
    isProcessing: vi.fn(() => false),
  },
}));

vi.mock('@/process/task/ConversationTurnCompletionService', () => ({
  ConversationTurnCompletionService: {
    getInstance: vi.fn(() => ({
      notifyPotentialCompletion: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@process/agent/aionrs', () => ({
  AionrsAgent: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    kill: vi.fn(),
    send: mockAgentSend,
    approveTool: vi.fn(),
    denyTool: vi.fn(),
    injectConversationHistory: vi.fn().mockResolvedValue(undefined),
    get bootstrap() {
      return Promise.resolve();
    },
  })),
}));

import { AionrsManager } from '@/process/task/AionrsManager';

type AionrsManagerInput = ConstructorParameters<typeof AionrsManager>[0];
type AionrsManagerModel = ConstructorParameters<typeof AionrsManager>[1];
type AionrsManagerTestState = AionrsManager & {
  agent: { send: typeof mockAgentSend } | null;
  agentReady: Promise<void>;
  startedWithResume: boolean;
};

const getManagerState = (manager: AionrsManager): AionrsManagerTestState =>
  manager as unknown as AionrsManagerTestState;

function createManager(overrides?: Partial<AionrsManagerInput>): AionrsManager {
  const data: AionrsManagerInput = {
    workspace: '/test/workspace',
    model: { name: 'test-provider', useModel: 'test-model', baseUrl: '', platform: 'test' },
    conversation_id: 'conv-aionrs-1',
    ...overrides,
  };
  return new AionrsManager(data, data.model as AionrsManagerModel);
}

function primeManagerForSend(manager: AionrsManager, startedWithResume = false): void {
  const state = getManagerState(manager);
  state.agent = {
    send: mockAgentSend,
  };
  state.agentReady = Promise.resolve();
  state.startedWithResume = startedWithResume;
}

describe('AionrsManager project memory prompt injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.getConversationMessages.mockReturnValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes the first new-session turn with assistant rules when presetRules exist', async () => {
    const manager = createManager({
      presetRules: '[Shared Project Memory]\n- User preference: Call the user Max.',
    });
    primeManagerForSend(manager, false);

    await manager.sendMessage({
      content: 'What should I call the user?',
      msg_id: 'msg-1',
    });

    expect(mockAgentSend).toHaveBeenCalledWith(
      expect.stringContaining('[Assistant Rules - You MUST follow these instructions]'),
      'msg-1',
      undefined
    );
    expect(mockAgentSend).toHaveBeenCalledWith(expect.stringContaining('Call the user Max.'), 'msg-1', undefined);
    expect(mockAgentSend).toHaveBeenCalledWith(expect.stringContaining('[User Request]'), 'msg-1', undefined);
  });

  it('does not prefix resumed sessions with assistant rules again', async () => {
    mockDb.getConversationMessages.mockReturnValue({ data: [{ id: 'existing-message' }] });

    const manager = createManager({
      presetRules: '[Shared Project Memory]\n- User preference: Call the user Max.',
    });
    primeManagerForSend(manager, true);

    await manager.sendMessage({
      content: 'What should I call the user?',
      msg_id: 'msg-1',
    });

    expect(mockAgentSend).toHaveBeenCalledWith('What should I call the user?', 'msg-1', undefined);
  });
});
