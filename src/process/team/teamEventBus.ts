import { EventEmitter } from 'events';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';

/**
 * Main-process-local event bus for team agent communication.
 *
 * Problem: ipcBridge.emit() routes through webContents.send(), which only
 * delivers events to the renderer BrowserWindow. Same-process .on() listeners
 * (e.g. TeammateManager) never receive events emitted by AcpAgentManager.
 *
 * Solution: AcpAgentManager emits here in addition to ipcBridge, and
 * TeammateManager listens here instead of ipcBridge for responseStream events.
 */
export const teamEventBus = new EventEmitter();
// This bus is shared across concurrently active team sessions and stress tests
// intentionally create more than 50 transient listeners before disposing them.
// Use an unlimited cap here and rely on explicit dispose() coverage instead of
// EventEmitter's generic threshold warning.
teamEventBus.setMaxListeners(0);

export type TeamResponseStreamEvent = IResponseMessage;
