/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { applyProjectMemoryToConversationParams } from '@process/services/projectMemory/applyProjectMemoryToConversationParams';

describe('applyProjectMemoryToConversationParams', () => {
  it('injects project memory into gemini preset rules', () => {
    const result = applyProjectMemoryToConversationParams(
      {
        type: 'gemini',
        model: {} as any,
        extra: { presetRules: 'existing rules' },
      },
      '[Shared Project Memory]\n- project rule'
    );

    expect(result.extra.presetRules).toBe('[Shared Project Memory]\n- project rule\n\nexisting rules');
  });

  it('injects project memory into acp preset context', () => {
    const result = applyProjectMemoryToConversationParams(
      {
        type: 'acp',
        model: {} as any,
        extra: { presetContext: 'existing context' },
      },
      '[Shared Project Memory]\n- project rule'
    );

    expect(result.extra.presetContext).toBe('[Shared Project Memory]\n- project rule\n\nexisting context');
  });

  it('leaves unsupported types unchanged', () => {
    const input = {
      type: 'remote' as const,
      model: {} as any,
      extra: { remoteAgentId: 'remote-1' },
    };

    expect(applyProjectMemoryToConversationParams(input, '[Shared Project Memory]\n- rule')).toEqual(input);
  });
});
