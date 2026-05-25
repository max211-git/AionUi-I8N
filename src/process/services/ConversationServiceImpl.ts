/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IConversationService, CreateConversationParams, MigrateConversationParams } from './IConversationService';
import type { IConversationRepository } from '@process/services/database/IConversationRepository';
import type { IProjectRepository } from '@process/services/database/IProjectRepository';
import type { IProjectMemoryService } from '@process/services/projectMemory';
import type { TChatConversation } from '@/common/config/storage';
import { uuid } from '@/common/utils';
import { cronService } from './cron/cronServiceSingleton';
import {
  createGeminiAgent,
  createAcpAgent,
  createOpenClawAgent,
  createNanobotAgent,
  createRemoteAgent,
  createAionrsAgent,
} from '@process/utils/initAgent';
import { applyProjectMemoryToConversationParams } from '@process/services/projectMemory/applyProjectMemoryToConversationParams';

/**
 * Concrete implementation of IConversationService.
 * Delegates persistence to an injected IConversationRepository.
 */
export class ConversationServiceImpl implements IConversationService {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly projectRepo?: IProjectRepository,
    private readonly projectMemoryService?: IProjectMemoryService
  ) {}

  async getConversation(id: string): Promise<TChatConversation | undefined> {
    return this.repo.getConversation(id);
  }

  async listAllConversations(): Promise<TChatConversation[]> {
    return this.repo.listAllConversations();
  }

  async getConversationsByCronJob(cronJobId: string): Promise<TChatConversation[]> {
    return this.repo.getConversationsByCronJob(cronJobId);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.repo.deleteConversation(id);
  }

  async updateConversation(id: string, updates: Partial<TChatConversation>, mergeExtra?: boolean): Promise<void> {
    let finalUpdates = updates;
    if (mergeExtra && updates.extra) {
      const existing = await this.repo.getConversation(id);
      if (existing) {
        finalUpdates = {
          ...updates,
          extra: { ...existing.extra, ...updates.extra },
        } as Partial<TChatConversation>;
      }
    }
    await this.repo.updateConversation(id, finalUpdates);
  }

  async createWithMigration(params: MigrateConversationParams): Promise<TChatConversation> {
    const { conversation, sourceConversationId, migrateCron } = params;
    const conv: TChatConversation = {
      ...conversation,
      createTime: conversation.createTime ?? Date.now(),
      modifyTime: conversation.modifyTime ?? Date.now(),
    };
    await this.repo.createConversation(conv);

    if (sourceConversationId) {
      // Copy all messages from source conversation
      const pageSize = 10000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: messages, hasMore: more } = await this.repo.getMessages(sourceConversationId, page, pageSize);
        for (const msg of messages) {
          await this.repo.insertMessage({
            ...msg,
            id: uuid(),
            conversation_id: conv.id,
          });
        }
        hasMore = more;
        page++;
      }

      // Migrate or delete cron jobs associated with source conversation
      try {
        const jobs = await cronService.listJobsByConversation(sourceConversationId);
        if (migrateCron) {
          for (const job of jobs) {
            await cronService.updateJob(job.id, {
              metadata: {
                ...job.metadata,
                conversationId: conv.id,
                conversationTitle: conv.name,
              },
            });
          }
        } else {
          for (const job of jobs) {
            await cronService.removeJob(job.id);
          }
        }
      } catch (err) {
        console.error('[ConversationServiceImpl] Failed to handle cron jobs during migration:', err);
      }

      // Integrity check: only delete source if message counts match
      const sourceMsgs = await this.repo.getMessages(sourceConversationId, 0, 1);
      const newMsgs = await this.repo.getMessages(conv.id, 0, 1);
      if (sourceMsgs.total === newMsgs.total) {
        await this.repo.deleteConversation(sourceConversationId);
      } else {
        console.error('[ConversationServiceImpl] Migration integrity check failed: message counts do not match.', {
          source: sourceMsgs.total,
          new: newMsgs.total,
        });
      }
    }

    return conv;
  }

  async createConversation(params: CreateConversationParams): Promise<TChatConversation> {
    let conversation: TChatConversation;
    const explicitWorkspace = params.extra.workspace?.trim() || undefined;

    if (params.projectId && this.projectRepo) {
      const project = await this.projectRepo.get('system_default_user', params.projectId);
      if (!project) {
        throw new Error(`Project not found: ${params.projectId}`);
      }
    }

    let resolvedParams: CreateConversationParams = {
      ...params,
      extra: {
        ...params.extra,
        workspace: explicitWorkspace,
      },
    };

    if (resolvedParams.projectId && this.projectMemoryService) {
      const projectMemorySummary = await this.projectMemoryService.buildSummary(resolvedParams.projectId);
      resolvedParams = applyProjectMemoryToConversationParams(resolvedParams, projectMemorySummary);
    }

    switch (resolvedParams.type) {
      case 'gemini': {
        conversation = await createGeminiAgent(
          resolvedParams.model,
          resolvedParams.extra.workspace,
          resolvedParams.extra.defaultFiles as string[] | undefined,
          resolvedParams.extra.webSearchEngine,
          resolvedParams.extra.customWorkspace,
          resolvedParams.extra.contextFileName,
          resolvedParams.extra.presetRules,
          resolvedParams.extra.enabledSkills as string[] | undefined,
          resolvedParams.extra.presetAssistantId,
          resolvedParams.extra.sessionMode,
          resolvedParams.extra.isHealthCheck,
          resolvedParams.extra.extraSkillPaths as string[] | undefined,
          resolvedParams.extra.excludeBuiltinSkills as string[] | undefined
        );
        break;
      }
      case 'acp': {
        conversation = await createAcpAgent(resolvedParams as any);
        break;
      }
      case 'openclaw-gateway': {
        conversation = await createOpenClawAgent(resolvedParams as any);
        break;
      }
      case 'nanobot': {
        conversation = await createNanobotAgent(resolvedParams as any);
        break;
      }
      case 'remote': {
        conversation = await createRemoteAgent(resolvedParams as any);
        break;
      }
      case 'aionrs': {
        conversation = await createAionrsAgent(resolvedParams as any);
        break;
      }
      default: {
        throw new Error(`Invalid conversation type: ${(resolvedParams as any).type}`);
      }
    }

    // Apply optional overrides without mutating the object returned by agent factories
    const overrides: Partial<TChatConversation> = {
      projectId: resolvedParams.projectId,
    };
    if (resolvedParams.id) overrides.id = resolvedParams.id;
    if (resolvedParams.name) overrides.name = resolvedParams.name;
    if (resolvedParams.source) overrides.source = resolvedParams.source;
    if (resolvedParams.channelChatId) overrides.channelChatId = resolvedParams.channelChatId;
    // Merge extra fields from params that the factory didn't consume (e.g. cronJobId).
    // Factory-produced values take precedence; only novel keys from params.extra are added.
    if (resolvedParams.extra && conversation.extra) {
      const factoryExtra = conversation.extra as Record<string, unknown>;
      for (const [key, value] of Object.entries(resolvedParams.extra)) {
        if (value !== undefined && !(key in factoryExtra)) {
          factoryExtra[key] = value;
        }
      }
    }

    // The spread preserves the discriminant field (type) from `conversation`;
    // the assertion is safe because `overrides` only contains non-discriminant fields.
    const finalConversation = {
      ...conversation,
      ...overrides,
    } as TChatConversation;

    await this.repo.createConversation(finalConversation);
    return finalConversation;
  }
}
