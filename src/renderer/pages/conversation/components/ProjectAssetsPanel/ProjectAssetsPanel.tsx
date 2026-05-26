/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ProjectAssetCategory, ProjectAssetSortOption, TProjectAsset } from '@/common/projectAssets';
import type { TChatConversation } from '@/common/config/storage';
import type { PreviewContentType } from '@/common/types/preview';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { clearProjectAssetInspector } from '@/renderer/pages/conversation/hooks/useProjectAssetInspectorSync';
import { usePreviewContext } from '@/renderer/pages/conversation/Preview';
import type { FileOrFolderItem } from '@/renderer/utils/file/fileTypes';
import { emitter } from '@/renderer/utils/emitter';
import { useLatestRef } from '@renderer/hooks/ui/useLatestRef';
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Menu,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { Application, Code, FileText, FolderOpen, GridFour, Left, ListView, MoreOne, Refresh } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './ProjectAssetsPanel.module.css';

type ProjectAssetsPanelProps = {
  conversation: TChatConversation;
  category: ProjectAssetCategory;
  messageApi: ReturnType<typeof import('@arco-design/web-react').Message.useMessage>[0];
};

type AssetViewMode = 'list' | 'grid';

const DEFAULT_SORT: ProjectAssetSortOption = 'modified-desc';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff', 'avif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm', 'ogv', 'avi', 'mkv']);

const getEventPrefix = (conversationType: TChatConversation['type']) => {
  return conversationType;
};

const getCategoryI18nKey = (category: ProjectAssetCategory) => {
  switch (category) {
    case 'images':
      return 'conversation.history.projectAssetsCategoryImages';
    case 'documents':
      return 'conversation.history.projectAssetsCategoryDocuments';
    case 'pdfs':
      return 'conversation.history.projectAssetsCategoryPdfs';
    case 'code-text':
      return 'conversation.history.projectAssetsCategoryCodeText';
    case 'other':
      return 'conversation.history.projectAssetsCategoryOther';
  }
};

const getCategoryIcon = (category: ProjectAssetCategory) => {
  switch (category) {
    case 'images':
      return <Application theme='outline' size='16' />;
    case 'documents':
    case 'pdfs':
      return <FileText theme='outline' size='16' />;
    case 'code-text':
      return <Code theme='outline' size='16' />;
    case 'other':
      return <FolderOpen theme='outline' size='16' />;
  }
};

const getSortLabelKey = (sort: ProjectAssetSortOption) => {
  switch (sort) {
    case 'name-asc':
      return 'conversation.history.projectAssetsSortNameAsc';
    case 'name-desc':
      return 'conversation.history.projectAssetsSortNameDesc';
    case 'modified-desc':
      return 'conversation.history.projectAssetsSortModifiedDesc';
    case 'modified-asc':
      return 'conversation.history.projectAssetsSortModifiedAsc';
    case 'size-desc':
      return 'conversation.history.projectAssetsSortSizeDesc';
    case 'size-asc':
      return 'conversation.history.projectAssetsSortSizeAsc';
  }
};

const formatSize = (value?: number) => {
  if (!value || value < 1) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
};

const formatModifiedAt = (value?: number) => {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const buildFileUrl = (filePath: string) => encodeURI(`file://${filePath}`);

const getPreviewType = (asset: TProjectAsset): PreviewContentType => {
  const extension = asset.fileName.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (extension === 'ppt' || extension === 'pptx' || extension === 'key') {
    return 'ppt';
  }
  if (
    extension === 'doc' ||
    extension === 'docx' ||
    extension === 'rtf' ||
    extension === 'odt' ||
    extension === 'pages'
  ) {
    return 'word';
  }
  if (
    extension === 'xls' ||
    extension === 'xlsx' ||
    extension === 'csv' ||
    extension === 'tsv' ||
    extension === 'ods' ||
    extension === 'numbers'
  ) {
    return 'excel';
  }
  if (extension === 'md' || extension === 'markdown') {
    return 'markdown';
  }
  if (extension === 'html') {
    return 'html';
  }
  return 'code';
};

const SORT_OPTIONS: ProjectAssetSortOption[] = [
  'modified-desc',
  'modified-asc',
  'name-asc',
  'name-desc',
  'size-desc',
  'size-asc',
];

const LazyImageThumb: React.FC<{ filePath: string; alt: string; placeholderLabel: string }> = ({
  filePath,
  alt,
  placeholderLabel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.imageThumbWrap}>
      {shouldLoad ? (
        <img className={styles.imageThumb} src={buildFileUrl(filePath)} alt={alt} loading='lazy' decoding='async' />
      ) : (
        <div className='text-12px text-t-secondary'>{placeholderLabel}</div>
      )}
    </div>
  );
};

const ProjectAssetsPanel: React.FC<ProjectAssetsPanelProps> = ({ conversation, category, messageApi }) => {
  const { t } = useTranslation();
  const { openPreview } = usePreviewContext();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectRootPath, setProjectRootPath] = useState('');
  const [assets, setAssets] = useState<TProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProjectAssetSortOption>(DEFAULT_SORT);
  const [viewMode, setViewMode] = useState<AssetViewMode>(() => (category === 'images' ? 'grid' : 'list'));
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [updatingContextIds, setUpdatingContextIds] = useState<Set<string>>(new Set());
  const messageApiRef = useLatestRef(messageApi);
  const tRef = useLatestRef(t);

  const isImageCategory = category === 'images';

  const loadProject = useCallback(async () => {
    if (!conversation.projectId) {
      return;
    }

    const project = await ipcBridge.project.get.invoke({ id: conversation.projectId });
    setProjectName(project?.name || '');
    setProjectRootPath(project?.rootPath || '');
  }, [conversation.projectId]);

  const loadAssets = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!conversation.projectId) {
        setAssets([]);
        setLoading(false);
        return;
      }

      if (options?.refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        if (options?.refresh) {
          await ipcBridge.projectAssets.refresh.invoke({ projectId: conversation.projectId });
        }
        const nextAssets = await ipcBridge.projectAssets.list.invoke({
          projectId: conversation.projectId,
          category,
          query: query.trim() || undefined,
          sort,
        });
        setAssets(nextAssets);
        if (options?.refresh) {
          emitter.emit('project.assets.changed', conversation.projectId);
        }
      } catch (error) {
        console.error('[ProjectAssetsPanel] Failed to load project assets:', error);
        messageApiRef.current.error(tRef.current('conversation.history.projectAssetsLoadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, conversation.projectId, messageApiRef, query, sort, tRef]
  );

  useEffect(() => {
    setViewMode(isImageCategory ? 'grid' : 'list');
  }, [isImageCategory]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const updateCompactState = (width: number) => {
      setIsCompactLayout(width < 440);
    };

    updateCompactState(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateCompactState(entry.contentRect.width);
      }
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    void loadAssets({ refresh: true });
  }, [category, conversation.projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssets();
    }, 160);

    return () => {
      window.clearTimeout(timer);
    };
  }, [category, conversation.projectId, loadAssets, query, sort]);

  const handlePreviewAsset = useCallback(
    async (asset: TProjectAsset) => {
      try {
        const previewType = getPreviewType(asset);
        const metadata = {
          title: asset.fileName,
          fileName: asset.fileName,
          filePath: asset.absolutePath,
          workspace: projectRootPath || undefined,
        };

        if (previewType === 'image') {
          openPreview('', previewType, metadata);
          return;
        }

        if (
          previewType === 'pdf' ||
          previewType === 'ppt' ||
          previewType === 'word' ||
          previewType === 'excel' ||
          previewType === 'video'
        ) {
          openPreview('', previewType, metadata);
          return;
        }

        const content = await ipcBridge.fs.readFile.invoke({ path: asset.absolutePath });
        openPreview(content, previewType, metadata);
      } catch (error) {
        console.error('[ProjectAssetsPanel] Failed to preview asset:', error);
        messageApi.error(t('conversation.history.projectAssetsPreviewFailed'));
      }
    },
    [messageApi, openPreview, projectRootPath, t]
  );

  const handleAttachToChat = useCallback(
    (asset: TProjectAsset) => {
      const payload: FileOrFolderItem = {
        path: asset.absolutePath,
        name: asset.fileName,
        isFile: true,
        relativePath: asset.relativePath,
      };

      emitter.emit(`${getEventPrefix(conversation.type)}.selected.file.append`, [payload]);
      messageApi.success(t('conversation.history.projectAssetsAttached'));
    },
    [conversation.type, messageApi, t]
  );

  const handleOpen = useCallback(
    async (asset: TProjectAsset) => {
      try {
        await ipcBridge.shell.openFile.invoke(asset.absolutePath);
      } catch {
        messageApi.error(t('conversation.history.projectAssetsOpenFailed'));
      }
    },
    [messageApi, t]
  );

  const handleReveal = useCallback(
    async (asset: TProjectAsset) => {
      try {
        await ipcBridge.shell.showItemInFolder.invoke(asset.absolutePath);
      } catch {
        messageApi.error(t('conversation.history.projectAssetsRevealFailed'));
      }
    },
    [messageApi, t]
  );

  const handleCopyPath = useCallback(
    async (asset: TProjectAsset) => {
      try {
        await navigator.clipboard.writeText(asset.absolutePath);
        messageApi.success(t('conversation.history.projectAssetsPathCopied'));
      } catch {
        messageApi.error(t('conversation.history.projectAssetsCopyPathFailed'));
      }
    },
    [messageApi, t]
  );

  const handleRemove = useCallback(
    async (asset: TProjectAsset) => {
      try {
        const removed = await ipcBridge.projectAssets.remove.invoke({
          projectId: asset.projectId,
          assetId: asset.id,
        });
        if (!removed) {
          messageApi.error(t('conversation.history.projectAssetsRemoveFailed'));
          return;
        }
        messageApi.success(t('conversation.history.projectAssetsRemoved'));
        void loadAssets();
        emitter.emit('project.assets.changed', asset.projectId);
      } catch (error) {
        console.error('[ProjectAssetsPanel] Failed to remove project asset:', error);
        messageApi.error(t('conversation.history.projectAssetsRemoveFailed'));
      }
    },
    [loadAssets, messageApi, t]
  );

  const handleToggleContextEnabled = useCallback(
    async (asset: TProjectAsset, enabled: boolean) => {
      setUpdatingContextIds((previous) => new Set(previous).add(asset.id));
      try {
        const updated = await ipcBridge.projectAssets.setContextEnabled.invoke({
          projectId: asset.projectId,
          assetId: asset.id,
          enabled,
        });
        if (!updated) {
          messageApi.error(t('conversation.history.projectAssetsContextUpdateFailed'));
          return;
        }
        setAssets((previous) =>
          previous.map((item) => (item.id === asset.id ? { ...item, contextEnabled: enabled } : item))
        );
      } catch (error) {
        console.error('[ProjectAssetsPanel] Failed to update context flag:', error);
        messageApi.error(t('conversation.history.projectAssetsContextUpdateFailed'));
      } finally {
        setUpdatingContextIds((previous) => {
          const next = new Set(previous);
          next.delete(asset.id);
          return next;
        });
      }
    },
    [messageApi, t]
  );

  const buildActionMenu = useCallback(
    (asset: TProjectAsset) => (
      <Menu
        onClickMenuItem={(key) => {
          if (key === 'preview') {
            void handlePreviewAsset(asset);
            return;
          }
          if (key === 'attach') {
            handleAttachToChat(asset);
            return;
          }
          if (key === 'open') {
            void handleOpen(asset);
            return;
          }
          if (key === 'reveal') {
            void handleReveal(asset);
            return;
          }
          if (key === 'copy') {
            void handleCopyPath(asset);
            return;
          }
          if (key === 'remove') {
            void handleRemove(asset);
          }
        }}
      >
        <Menu.Item key='preview'>{t('conversation.history.projectAssetsPreview')}</Menu.Item>
        <Menu.Item key='attach'>{t('conversation.history.projectAssetsAttachToChat')}</Menu.Item>
        <Menu.Item key='open'>{t('conversation.history.projectAssetsOpen')}</Menu.Item>
        <Menu.Item key='reveal'>{t('conversation.history.projectAssetsReveal')}</Menu.Item>
        <Menu.Item key='copy'>{t('conversation.history.projectAssetsCopyPath')}</Menu.Item>
        <Menu.Item key='remove'>
          <span className='text-[rgb(var(--warning-6))]'>{t('conversation.history.projectAssetsRemove')}</span>
        </Menu.Item>
      </Menu>
    ),
    [handleAttachToChat, handleCopyPath, handleOpen, handlePreviewAsset, handleRemove, handleReveal, t]
  );

  const emptyNode = (
    <div className='h-full flex items-center justify-center px-20px'>
      <Empty
        description={
          <div className='flex flex-col gap-8px text-center'>
            <span>{t('conversation.history.projectAssetsEmpty')}</span>
            {projectRootPath && (
              <Button size='small' type='outline' onClick={() => void loadAssets({ refresh: true })}>
                {t('conversation.history.projectAssetsRefresh')}
              </Button>
            )}
          </div>
        }
      />
    </div>
  );

  const renderListRow = useCallback(
    (asset: TProjectAsset) => (
      <Card key={asset.id} className={styles.assetCard} bodyStyle={{ padding: 14 }}>
        <div className='flex items-start gap-12px'>
          <div className='mt-2px rounded-10px bg-[rgba(var(--primary-6),0.08)] p-8px text-[rgb(var(--primary-6))]'>
            {getCategoryIcon(asset.category)}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex items-start justify-between gap-12px'>
              <div className='min-w-0'>
                <Typography.Paragraph
                  className='!mb-4px text-14px font-semibold text-t-primary'
                  ellipsis={{ rows: 1, showTooltip: true }}
                >
                  {asset.fileName}
                </Typography.Paragraph>
                <Typography.Paragraph
                  className='!mb-8px text-12px text-t-secondary'
                  ellipsis={{ rows: 1, showTooltip: true }}
                >
                  {asset.relativePath}
                </Typography.Paragraph>
              </div>
              <Dropdown droplist={buildActionMenu(asset)} trigger='click' position='br'>
                <Button size='mini' type='text' icon={<MoreOne theme='outline' size='16' />} />
              </Dropdown>
            </div>
            <Space size={8} wrap>
              {asset.contextEnabled && (
                <Tag size='small' color='green'>
                  {t('conversation.history.projectAssetsContextEnabled')}
                </Tag>
              )}
              {asset.mimeType && (
                <Tag size='small' color='arcoblue'>
                  {asset.mimeType}
                </Tag>
              )}
              {asset.size !== undefined && <Tag size='small'>{formatSize(asset.size)}</Tag>}
              {asset.modifiedAt && <Tag size='small'>{formatModifiedAt(asset.modifiedAt)}</Tag>}
            </Space>
            <div className='mt-10px flex items-center justify-between gap-12px'>
              <Typography.Text className='text-12px text-t-secondary'>
                {t('conversation.history.projectAssetsContextToggle')}
              </Typography.Text>
              <Switch
                size='small'
                checked={asset.contextEnabled}
                loading={updatingContextIds.has(asset.id)}
                onChange={(value) => {
                  void handleToggleContextEnabled(asset, value);
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    ),
    [buildActionMenu, handleToggleContextEnabled, t, updatingContextIds]
  );

  const renderImageCard = useCallback(
    (asset: TProjectAsset) => (
      <div key={asset.id} className={styles.imageCard}>
        <LazyImageThumb
          filePath={asset.absolutePath}
          alt={asset.fileName}
          placeholderLabel={t('conversation.history.projectAssetsPreview')}
        />
        <div className={styles.imageMeta}>
          <Typography.Paragraph
            className='!mb-0 text-13px font-semibold text-t-primary'
            ellipsis={{ rows: 1, showTooltip: true }}
          >
            {asset.fileName}
          </Typography.Paragraph>
          <div className={styles.metaLine}>{formatSize(asset.size)}</div>
          <div className='flex items-center justify-between gap-8px'>
            <Typography.Text className='text-11px text-t-secondary'>
              {t('conversation.history.projectAssetsContextToggle')}
            </Typography.Text>
            <Switch
              size='small'
              checked={asset.contextEnabled}
              loading={updatingContextIds.has(asset.id)}
              onChange={(value) => {
                void handleToggleContextEnabled(asset, value);
              }}
            />
          </div>
          <div className='flex items-center justify-between gap-8px'>
            <Button size='mini' type='text' onClick={() => void handlePreviewAsset(asset)}>
              {t('conversation.history.projectAssetsPreview')}
            </Button>
            <Dropdown droplist={buildActionMenu(asset)} trigger='click' position='br'>
              <Button size='mini' type='text' icon={<MoreOne theme='outline' size='16' />} />
            </Dropdown>
          </div>
        </div>
      </div>
    ),
    [buildActionMenu, handlePreviewAsset, handleToggleContextEnabled, t, updatingContextIds]
  );

  const shouldShowGrid = isImageCategory && viewMode === 'grid';
  const panelTitle = useMemo(() => t(getCategoryI18nKey(category)), [category, t]);

  return (
    <div ref={rootRef} className={styles.panelRoot}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderMeta}>
          <div className={styles.panelHeaderTitle}>
            {getCategoryIcon(category)}
            <span>{panelTitle}</span>
            <Tag size='small'>{assets.length}</Tag>
          </div>
          <Typography.Paragraph className={styles.panelHeaderSubtitle} ellipsis={{ rows: 1, showTooltip: true }}>
            {projectName || t('conversation.history.projectAssetsSection')}
          </Typography.Paragraph>
        </div>
        <div className={styles.panelHeaderActions}>
          {conversation.extra?.workspace && (
            <Button
              size='mini'
              type='outline'
              icon={<Left theme='outline' size='14' />}
              aria-label={t('conversation.history.projectAssetsShowWorkspace')}
              title={t('conversation.history.projectAssetsShowWorkspace')}
              onClick={clearProjectAssetInspector}
            >
              {!isCompactLayout ? t('conversation.history.projectAssetsShowWorkspace') : null}
            </Button>
          )}
          <Button
            size='mini'
            type='outline'
            icon={<FolderOpen theme='outline' size='14' />}
            aria-label={t('conversation.history.projectAssetsOpenFolder')}
            title={t('conversation.history.projectAssetsOpenFolder')}
            disabled={!projectRootPath}
            onClick={() => void ipcBridge.shell.openFile.invoke(projectRootPath)}
          >
            {!isCompactLayout ? t('conversation.history.projectAssetsOpenFolder') : null}
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input.Search
          allowClear
          className={styles.toolbarSearch}
          value={query}
          onChange={setQuery}
          onSearch={() => void loadAssets()}
          placeholder={t('conversation.history.projectAssetsSearchPlaceholder')}
        />
        <div className={styles.toolbarControls}>
          <div className={styles.sortWrap}>
            <Select
              size='small'
              value={sort}
              style={{ width: '100%' }}
              onChange={(value) => {
                setSort(value as ProjectAssetSortOption);
              }}
              triggerProps={{ autoAlignPopupMinWidth: true }}
            >
              {SORT_OPTIONS.map((option) => (
                <Select.Option key={option} value={option}>
                  {t(getSortLabelKey(option))}
                </Select.Option>
              ))}
            </Select>
          </div>
          {isImageCategory && (
            <div className={styles.viewToggle}>
              <Button
                size='mini'
                type={viewMode === 'grid' ? 'primary' : 'outline'}
                icon={<GridFour theme='outline' size='14' />}
                aria-label={t('conversation.history.projectAssetsGridView')}
                title={t('conversation.history.projectAssetsGridView')}
                onClick={() => setViewMode('grid')}
              >
                {!isCompactLayout ? t('conversation.history.projectAssetsGridView') : null}
              </Button>
              <Button
                size='mini'
                type={viewMode === 'list' ? 'primary' : 'outline'}
                icon={<ListView theme='outline' size='14' />}
                aria-label={t('conversation.history.projectAssetsListView')}
                title={t('conversation.history.projectAssetsListView')}
                onClick={() => setViewMode('list')}
              >
                {!isCompactLayout ? t('conversation.history.projectAssetsListView') : null}
              </Button>
            </div>
          )}
          <Button
            size='mini'
            type='outline'
            loading={refreshing}
            icon={<Refresh theme='outline' size='14' />}
            aria-label={t('conversation.history.projectAssetsRefresh')}
            title={t('conversation.history.projectAssetsRefresh')}
            onClick={() => void loadAssets({ refresh: true })}
          >
            {!isCompactLayout ? t('conversation.history.projectAssetsRefresh') : null}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className='flex h-full items-center justify-center'>
            <Spin tip={t('conversation.history.projectAssetsLoading')} />
          </div>
        ) : assets.length === 0 ? (
          emptyNode
        ) : (
          <AionScrollArea className={styles.listScrollArea}>
            <div className={classNames(shouldShowGrid ? styles.imageGrid : styles.listColumn)}>
              {shouldShowGrid ? assets.map(renderImageCard) : assets.map(renderListRow)}
            </div>
          </AionScrollArea>
        )}
      </div>
    </div>
  );
};

export default ProjectAssetsPanel;
