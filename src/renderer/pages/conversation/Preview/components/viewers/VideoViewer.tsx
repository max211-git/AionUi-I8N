/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface VideoPreviewProps {
  filePath?: string;
  fileName?: string;
}

const buildFileUrl = (filePath: string) => encodeURI(`file://${filePath}`);

const VideoPreview: React.FC<VideoPreviewProps> = ({ filePath, fileName }) => {
  const { t } = useTranslation();

  if (!filePath) {
    return (
      <div className='flex flex-1 items-center justify-center bg-bg-1 p-24px'>
        <div className='text-center text-14px text-t-secondary'>
          {t('preview.videoUnavailable', { defaultValue: 'Video preview is unavailable' })}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 items-center justify-center overflow-auto bg-bg-1 p-20px'>
      <div className='flex max-h-full w-full max-w-[1200px] flex-col gap-12px'>
        <video
          key={filePath}
          className='max-h-[calc(100vh-220px)] w-full rounded-12px bg-black shadow-[0_12px_32px_rgba(0,0,0,0.18)]'
          src={buildFileUrl(filePath)}
          controls
          preload='metadata'
        />
        <div className='truncate text-center text-12px text-t-secondary'>{fileName || filePath}</div>
      </div>
    </div>
  );
};

export default VideoPreview;
