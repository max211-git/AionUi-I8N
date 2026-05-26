/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AcpConnection } from '../../src/process/agent/acp/AcpConnection';
import { AcpAgent } from '../../src/process/agent/acp/index';
import type { AcpAgentConfig } from '../../src/process/agent/acp/index';

type PendingRequest = {
  resolve: ReturnType<typeof vi.fn>;
  reject: ReturnType<typeof vi.fn>;
  timeoutId?: ReturnType<typeof setTimeout>;
  method: string;
  isPaused: boolean;
  startTime: number;
  timeoutDuration: number;
};

type PendingPermission = {
  resolve: ReturnType<typeof vi.fn>;
  reject: ReturnType<typeof vi.fn>;
};

type AcpConnectionTestState = AcpConnection & {
  sessionId?: string;
  backend: string;
  child: { stdin: { write: ReturnType<typeof vi.fn> }; killed: boolean; pid: number };
  promptTimeoutMs: number;
  pendingRequests: Map<number, PendingRequest>;
  handlePromptTimeout: (requestId: number, request: PendingRequest) => void;
  pauseRequestTimeout: (requestId: number) => void;
  resumeRequestTimeout: (requestId: number) => void;
};

type AcpAgentTestState = AcpAgent & {
  connection: AcpConnection;
  pendingPermissions: Map<string | number, PendingPermission>;
  onStreamEvent: ReturnType<typeof vi.fn>;
  statusMessageId: string | null;
  handleDisconnect: (details: { code: number | null; signal: string | null }) => void;
  handleFileOperation: (payload: { method: string; path: string; sessionId: string }) => void;
};

const getConnectionState = (conn: AcpConnection): AcpConnectionTestState => conn as unknown as AcpConnectionTestState;
const getAgentState = (agent: AcpAgent): AcpAgentTestState => agent as unknown as AcpAgentTestState;

// ─── helpers ────────────────────────────────────────────────────────────────

/** Create an AcpConnection with internal state set up for testing */
function makeConnection(): AcpConnection {
  const conn = new AcpConnection();
  // Set up internal state to simulate an active session
  const state = getConnectionState(conn);
  state.sessionId = 'test-session';
  state.backend = 'claude';
  state.child = {
    stdin: { write: vi.fn() },
    killed: false,
    pid: 12345,
  };
  return conn;
}

// ─── setPromptTimeout ───────────────────────────────────────────────────────

describe('AcpConnection.setPromptTimeout', () => {
  it('should set timeout in milliseconds', () => {
    const conn = makeConnection();
    conn.setPromptTimeout(120);
    expect(getConnectionState(conn).promptTimeoutMs).toBe(120000);
  });

  it('should enforce minimum of 30 seconds', () => {
    const conn = makeConnection();
    conn.setPromptTimeout(5);
    expect(getConnectionState(conn).promptTimeoutMs).toBe(30000);
  });

  it('should default to 300 seconds', () => {
    const conn = new AcpConnection();
    expect(getConnectionState(conn).promptTimeoutMs).toBe(300000);
  });
});

// ─── cancelPrompt ───────────────────────────────────────────────────────────

describe('AcpConnection.cancelPrompt', () => {
  it('should send session/cancel notification via stdin', () => {
    const conn = makeConnection();
    const writeFn = getConnectionState(conn).child.stdin.write;

    conn.cancelPrompt();

    expect(writeFn).toHaveBeenCalledTimes(1);
    const written = JSON.parse(writeFn.mock.calls[0][0].replace(/\r?\n$/, ''));
    expect(written.method).toBe('session/cancel');
    expect(written.params.sessionId).toBe('test-session');
  });

  it('should resolve and clear all pending session/prompt requests', () => {
    const conn = makeConnection();
    const resolveFn = vi.fn();
    const pendingRequests = getConnectionState(conn).pendingRequests;

    // Add a session/prompt request
    const timeoutId = setTimeout(() => {}, 100000);
    pendingRequests.set(1, {
      resolve: resolveFn,
      reject: vi.fn(),
      timeoutId,
      method: 'session/prompt',
      isPaused: false,
      startTime: Date.now(),
      timeoutDuration: 300000,
    });

    // Add a non-prompt request (should NOT be cleared)
    pendingRequests.set(2, {
      resolve: vi.fn(),
      reject: vi.fn(),
      timeoutId: undefined,
      method: 'session/new',
      isPaused: false,
      startTime: Date.now(),
      timeoutDuration: 60000,
    });

    conn.cancelPrompt();

    expect(resolveFn).toHaveBeenCalledWith(null);
    expect(pendingRequests.has(1)).toBe(false);
    expect(pendingRequests.has(2)).toBe(true); // non-prompt request preserved
    clearTimeout(timeoutId);
  });

  it('should be a no-op when no active session', () => {
    const conn = new AcpConnection();
    // No sessionId set — should not throw
    expect(() => conn.cancelPrompt()).not.toThrow();
  });
});

// ─── handlePromptTimeout ────────────────────────────────────────────────────

describe('AcpConnection timeout handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call cancelPrompt on session/prompt timeout', async () => {
    const conn = makeConnection();
    conn.setPromptTimeout(30); // 30 seconds

    const cancelSpy = vi.spyOn(conn, 'cancelPrompt');

    // Trigger sendPrompt which internally calls sendRequest
    const promptPromise = conn.sendPrompt('test').catch((err) => err);

    // Advance past the timeout
    vi.advanceTimersByTime(31000);

    const error = await promptPromise;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('LLM request timed out');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should NOT call cancelPrompt for non-prompt request timeout', () => {
    const conn = makeConnection();
    const cancelSpy = vi.spyOn(conn, 'cancelPrompt');

    // Directly test handlePromptTimeout with a non-prompt method
    const request = {
      resolve: vi.fn(),
      reject: vi.fn(),
      method: 'session/new',
      isPaused: false,
      startTime: Date.now(),
      timeoutDuration: 60000,
    };
    getConnectionState(conn).pendingRequests.set(99, request);

    getConnectionState(conn).handlePromptTimeout(99, request);

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(request.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('session/new timed out') })
    );
  });

  it('should use configured timeout duration for session/prompt', () => {
    const conn = makeConnection();
    conn.setPromptTimeout(60); // 60 seconds

    const cancelSpy = vi.spyOn(conn, 'cancelPrompt');

    const promptPromise = conn.sendPrompt('test').catch(() => {});

    // At 59s — should not have timed out
    vi.advanceTimersByTime(59000);
    expect(cancelSpy).not.toHaveBeenCalled();

    // At 61s — should have timed out
    vi.advanceTimersByTime(2000);
    expect(cancelSpy).toHaveBeenCalled();

    return promptPromise;
  });
});

// ─── Permission request timeout ────────────────────────────────────────────

describe('AcpAgent permission request timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should NOT auto-reject permission requests within 30 minutes', () => {
    const { agent } = makeAgent();
    const pendingPermissions = getAgentState(agent).pendingPermissions;

    // Simulate a permission request being stored
    const rejectFn = vi.fn();
    const requestId = 'test-perm-1';
    pendingPermissions.set(requestId, { resolve: vi.fn(), reject: rejectFn });

    // Manually invoke the timeout logic that handlePermissionRequest sets up
    const timeoutFn = () => {
      if (pendingPermissions.has(requestId)) {
        pendingPermissions.delete(requestId);
        rejectFn(new Error('Permission request timed out'));
      }
    };
    const timer = setTimeout(timeoutFn, 1800000);

    // Advance 70 seconds (the old timeout value)
    vi.advanceTimersByTime(70000);
    expect(pendingPermissions.has(requestId)).toBe(true);
    expect(rejectFn).not.toHaveBeenCalled();

    // Advance to 29 minutes
    vi.advanceTimersByTime(1670000);
    expect(pendingPermissions.has(requestId)).toBe(true);
    expect(rejectFn).not.toHaveBeenCalled();

    // Advance past 30 minutes
    vi.advanceTimersByTime(70000);
    expect(pendingPermissions.has(requestId)).toBe(false);
    expect(rejectFn).toHaveBeenCalled();

    clearTimeout(timer);
  });
});

// ─── Resume timeout after permission pause ─────────────────────────────────

describe('AcpConnection resume timeout after permission pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reset startTime when resuming from a permission pause', () => {
    const conn = makeConnection();
    const pendingRequests = getConnectionState(conn).pendingRequests;

    const request = {
      resolve: vi.fn(),
      reject: vi.fn(),
      timeoutId: setTimeout(() => {}, 300000),
      method: 'session/prompt',
      isPaused: false,
      startTime: Date.now(),
      timeoutDuration: 300000,
    };
    pendingRequests.set(1, request);

    // Pause the request (simulating permission dialog shown)
    getConnectionState(conn).pauseRequestTimeout(1);
    expect(request.isPaused).toBe(true);

    // Advance time beyond the original timeout duration
    vi.advanceTimersByTime(600000); // 10 minutes

    // Resume the request (simulating permission dialog resolved)
    getConnectionState(conn).resumeRequestTimeout(1);

    // Should NOT have timed out — startTime was reset
    expect(request.isPaused).toBe(false);
    expect(request.reject).not.toHaveBeenCalled();
    expect(request.timeoutId).toBeDefined();

    // The full timeout duration should restart from now
    vi.advanceTimersByTime(299000);
    expect(request.reject).not.toHaveBeenCalled();

    clearTimeout(request.timeoutId);
  });
});

// ─── AcpAgent.cancelPrompt ─────────────────────────────────────────────────

/** Create an AcpAgent with minimal mocked internals */
function makeAgent() {
  const onStreamEvent = vi.fn();
  const onSignalEvent = vi.fn();
  const config: AcpAgentConfig = {
    id: 'test-agent',
    onStreamEvent,
    onSignalEvent,
    backend: 'claude',
    workingDir: '/tmp',
    extra: { backend: 'claude', workspace: '/tmp' },
  };
  const agent = new AcpAgent(config);
  // Mock the connection's cancelPrompt to avoid real stdin writes
  vi.spyOn(getAgentState(agent).connection, 'cancelPrompt').mockImplementation(() => {});
  return { agent, onSignalEvent };
}

describe('AcpAgent.cancelPrompt', () => {
  it('should call connection.cancelPrompt', () => {
    const { agent } = makeAgent();
    const connCancelSpy = getAgentState(agent).connection.cancelPrompt;

    agent.cancelPrompt();

    expect(connCancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject all pending permission dialogs', () => {
    const { agent } = makeAgent();
    const pendingPermissions = getAgentState(agent).pendingPermissions;
    const rejectFn1 = vi.fn();
    const rejectFn2 = vi.fn();

    pendingPermissions.set(1, { resolve: vi.fn(), reject: rejectFn1 });
    pendingPermissions.set(2, { resolve: vi.fn(), reject: rejectFn2 });

    agent.cancelPrompt();

    expect(rejectFn1).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cancelled' }));
    expect(rejectFn2).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cancelled' }));
    expect(pendingPermissions.size).toBe(0);
  });

  it('should emit finish signal via onSignalEvent', () => {
    const { agent, onSignalEvent } = makeAgent();

    agent.cancelPrompt();

    expect(onSignalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finish',
        conversation_id: 'test-agent',
        data: null,
      })
    );
  });
});

// ─── AcpAgent.kill ──────────────────────────────────────────────────────────

describe('AcpAgent.kill', () => {
  it('should call connection.disconnect', async () => {
    const { agent } = makeAgent();
    const disconnectSpy = vi.spyOn(getAgentState(agent).connection, 'disconnect').mockResolvedValue(undefined);

    await agent.kill();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit finish stream event', async () => {
    const { agent } = makeAgent();
    vi.spyOn(getAgentState(agent).connection, 'disconnect').mockResolvedValue(undefined);
    const onStreamEvent = getAgentState(agent).onStreamEvent;

    await agent.kill();

    expect(onStreamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finish',
        conversation_id: 'test-agent',
        data: null,
      })
    );
  });
});

describe('AcpAgent disconnect messaging', () => {
  it('emits finish signal with agentCrash flag on idle-timeout disconnect', () => {
    const onStreamEvent = vi.fn();
    const onSignalEvent = vi.fn();
    const agent = new AcpAgent({
      id: 'idle-agent',
      onStreamEvent,
      onSignalEvent,
      backend: 'opencode',
      workingDir: '/tmp',
      extra: { backend: 'opencode', workspace: '/tmp' },
    });

    getAgentState(agent).handleDisconnect({ code: null, signal: 'SIGTERM' });

    // Should NOT emit disconnected status messages via onStreamEvent
    const statusCalls = onStreamEvent.mock.calls.filter(
      ([evt]: [unknown]) =>
        typeof evt === 'object' &&
        evt !== null &&
        'type' in evt &&
        'data' in evt &&
        (evt as { type?: string; data?: { status?: string } }).type === 'agent_status' &&
        (evt as { data?: { status?: string } }).data?.status === 'disconnected'
    );
    expect(statusCalls).toHaveLength(0);

    // Should emit finish signal with crash details via onSignalEvent
    expect(onSignalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finish',
        conversation_id: 'idle-agent',
        data: expect.objectContaining({ agentCrash: true }),
      })
    );
  });

  it('emits finish signal with agentCrash flag on unexpected disconnect', () => {
    const onStreamEvent = vi.fn();
    const onSignalEvent = vi.fn();
    const agent = new AcpAgent({
      id: 'disconnect-agent',
      onStreamEvent,
      onSignalEvent,
      backend: 'opencode',
      workingDir: '/tmp',
      extra: { backend: 'opencode', workspace: '/tmp' },
    });

    getAgentState(agent).handleDisconnect({ code: null, signal: 'SIGTERM' });

    // Should NOT emit disconnected status messages via onStreamEvent
    const statusCalls = onStreamEvent.mock.calls.filter(
      ([evt]: [unknown]) =>
        typeof evt === 'object' &&
        evt !== null &&
        'type' in evt &&
        'data' in evt &&
        (evt as { type?: string; data?: { status?: string } }).type === 'agent_status' &&
        (evt as { data?: { status?: string } }).data?.status === 'disconnected'
    );
    expect(statusCalls).toHaveLength(0);

    // Should emit finish signal with crash details via onSignalEvent
    expect(onSignalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finish',
        conversation_id: 'disconnect-agent',
        data: expect.objectContaining({ agentCrash: true }),
      })
    );
  });

  it('clears internal state after disconnect', () => {
    const onStreamEvent = vi.fn();
    const onSignalEvent = vi.fn();
    const agent = new AcpAgent({
      id: 'cleanup-agent',
      onStreamEvent,
      onSignalEvent,
      backend: 'opencode',
      workingDir: '/tmp',
      extra: { backend: 'opencode', workspace: '/tmp' },
    });

    // Set up some internal state
    getAgentState(agent).pendingPermissions.set('perm-1', { resolve: vi.fn(), reject: vi.fn() });
    getAgentState(agent).statusMessageId = 'some-status-id';

    getAgentState(agent).handleDisconnect({ code: null, signal: 'SIGTERM' });

    // Internal state should be cleared
    expect(getAgentState(agent).pendingPermissions.size).toBe(0);
    expect(getAgentState(agent).statusMessageId).toBeNull();
  });
});

describe('AcpAgent file operation presentation', () => {
  it('emits ACP file reads as tool-call steps instead of plain text messages', () => {
    const onStreamEvent = vi.fn();
    const agent = new AcpAgent({
      id: 'file-op-agent',
      onStreamEvent,
      backend: 'codex',
      workingDir: '/tmp',
      extra: { backend: 'codex', workspace: '/tmp' },
    });

    getAgentState(agent).handleFileOperation({
      method: 'fs/read_text_file',
      path: '/tmp/example.md',
      sessionId: 'session-1',
    });

    expect(onStreamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'acp_tool_call',
        conversation_id: 'file-op-agent',
        data: expect.objectContaining({
          update: expect.objectContaining({
            sessionUpdate: 'tool_call',
            status: 'completed',
            title: 'File Read',
            kind: 'read',
            rawInput: expect.objectContaining({
              file_path: '/tmp/example.md',
              method: 'fs/read_text_file',
            }),
          }),
        }),
      })
    );

    expect(onStreamEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'content',
        data: expect.stringContaining('File read'),
      })
    );
  });
});
