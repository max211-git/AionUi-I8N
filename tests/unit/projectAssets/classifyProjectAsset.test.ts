/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { classifyProjectAsset } from '@process/services/projectAssets';

describe('classifyProjectAsset', () => {
  it('classifies image files', () => {
    expect(classifyProjectAsset('/tmp/example.png')).toEqual({
      category: 'images',
      mimeType: 'image/png',
    });
  });

  it('classifies pdf files', () => {
    expect(classifyProjectAsset('/tmp/spec.pdf')).toEqual({
      category: 'pdfs',
      mimeType: 'application/pdf',
    });
  });

  it('classifies source and markdown files as code and text', () => {
    expect(classifyProjectAsset('/tmp/README.md')).toEqual({
      category: 'code-text',
      mimeType: 'text/markdown',
    });
    expect(classifyProjectAsset('/tmp/app.tsx')).toEqual({
      category: 'code-text',
      mimeType: 'text/javascript',
    });
  });

  it('classifies office documents separately from generic files', () => {
    expect(classifyProjectAsset('/tmp/pitch-deck.pptx')).toEqual({
      category: 'documents',
      mimeType: undefined,
    });
    expect(classifyProjectAsset('/tmp/archive.zip')).toEqual({
      category: 'other',
      mimeType: undefined,
    });
  });
});
