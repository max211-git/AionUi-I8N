/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CreateConversationParams } from '@process/services/IConversationService';

function mergeContext(existing: string | undefined, summary: string): string {
  return existing ? `${summary}\n\n${existing}` : summary;
}

export function applyProjectMemoryToConversationParams(
  params: CreateConversationParams,
  summary: string
): CreateConversationParams {
  if (!summary.trim()) {
    return params;
  }

  switch (params.type) {
    case 'gemini':
    case 'aionrs':
      return {
        ...params,
        extra: {
          ...params.extra,
          presetRules: mergeContext(params.extra.presetRules, summary),
        },
      };
    case 'acp':
    case 'openclaw-gateway':
      return {
        ...params,
        extra: {
          ...params.extra,
          presetContext: mergeContext(params.extra.presetContext as string | undefined, summary),
        },
      };
    default:
      return params;
  }
}
