/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';

import type { TProject } from '@/common/adapter/ipcBridge';

import type { IProjectRepository } from './database/IProjectRepository';

export interface IProjectService {
  listProjects(): Promise<TProject[]>;
  getProject(id: string): Promise<TProject | null>;
  createProject(params: { name: string; rootPath?: string }): Promise<TProject>;
  updateProject(id: string, updates: Partial<Pick<TProject, 'name' | 'rootPath'>>): Promise<boolean>;
  removeProject(id: string): Promise<boolean>;
}

export class ProjectServiceImpl implements IProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userId = 'default-user'
  ) {}

  async listProjects(): Promise<TProject[]> {
    return this.projectRepository.list(this.userId);
  }

  async getProject(id: string): Promise<TProject | null> {
    return this.projectRepository.get(this.userId, id);
  }

  async createProject(params: { name: string; rootPath?: string }): Promise<TProject> {
    const now = Date.now();
    const project: TProject = {
      id: uuidv4(),
      name: params.name,
      rootPath: params.rootPath,
      createdAt: now,
      updatedAt: now,
    };
    return this.projectRepository.create(this.userId, project);
  }

  async updateProject(id: string, updates: Partial<Pick<TProject, 'name' | 'rootPath'>>): Promise<boolean> {
    return this.projectRepository.update(this.userId, id, updates);
  }

  async removeProject(id: string): Promise<boolean> {
    await this.projectRepository.clearProjectFromConversations(this.userId, id);
    return this.projectRepository.remove(this.userId, id);
  }
}
