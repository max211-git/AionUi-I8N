/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';

import type { ProjectAssetCategory } from '@/common/projectAssets';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.ico',
  '.tif',
  '.tiff',
  '.avif',
]);
const DOCUMENT_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.tsv',
  '.rtf',
  '.odt',
  '.ods',
  '.odp',
  '.pages',
  '.numbers',
  '.key',
]);
const PDF_EXTENSIONS = new Set(['.pdf']);
const CODE_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.jsonl',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
  '.sh',
  '.zsh',
  '.bash',
  '.ps1',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.xml',
  '.sql',
]);

export function classifyProjectAsset(filePath: string): { category: ProjectAssetCategory; mimeType?: string } {
  const extension = path.extname(filePath).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return { category: 'images', mimeType: guessMimeType(extension) };
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return { category: 'pdfs', mimeType: 'application/pdf' };
  }
  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return { category: 'documents', mimeType: guessMimeType(extension) };
  }
  if (CODE_TEXT_EXTENSIONS.has(extension) || path.basename(filePath).startsWith('.')) {
    return { category: 'code-text', mimeType: guessMimeType(extension) };
  }

  return { category: 'other', mimeType: guessMimeType(extension) };
}

function guessMimeType(extension: string): string | undefined {
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.md':
    case '.markdown':
      return 'text/markdown';
    case '.txt':
      return 'text/plain';
    case '.json':
    case '.jsonl':
      return 'application/json';
    case '.yaml':
    case '.yml':
      return 'application/x-yaml';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'text/javascript';
    case '.py':
      return 'text/x-python';
    case '.csv':
      return 'text/csv';
    default:
      return undefined;
  }
}
