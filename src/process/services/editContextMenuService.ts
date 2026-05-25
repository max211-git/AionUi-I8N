/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Menu } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

type EditableContextMenuParams = {
  dictionarySuggestions?: string[];
  isEditable?: boolean;
  misspelledWord?: string;
};

type EditableContextMenuItemBuilder = (params: EditableContextMenuParams) => MenuItemConstructorOptions[];

function buildMisspellingItems({
  dictionarySuggestions = [],
  misspelledWord,
}: EditableContextMenuParams, window: BrowserWindow): MenuItemConstructorOptions[] {
  if (!misspelledWord) {
    return [];
  }

  const suggestionItems: MenuItemConstructorOptions[] =
    dictionarySuggestions.length > 0
      ? dictionarySuggestions.map((suggestion) => ({
          label: suggestion,
          click: () => {
            window.webContents.replaceMisspelling(suggestion);
          },
        }))
      : [{ label: 'No Suggestions', enabled: false }];

  return [
    ...suggestionItems,
    {
      type: 'separator',
    },
    {
      label: 'Add to Dictionary',
      click: () => {
        window.webContents.session.addWordToSpellCheckerDictionary(misspelledWord);
      },
    },
    {
      type: 'separator',
    },
  ];
}

export function buildEditableContextMenuTemplate(
  params: EditableContextMenuParams,
  buildExtraItems?: EditableContextMenuItemBuilder,
  window?: BrowserWindow
): MenuItemConstructorOptions[] {
  if (!params.isEditable) {
    return [];
  }

  const baseItems: MenuItemConstructorOptions[] = [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'pasteAndMatchStyle' },
    { role: 'delete' },
    { type: 'separator' },
    { role: 'selectAll' },
  ];

  const extraItems = buildExtraItems?.(params) ?? [];
  const misspellingItems = window ? buildMisspellingItems(params, window) : [];
  if (extraItems.length === 0) {
    return [...misspellingItems, ...baseItems];
  }

  return [...misspellingItems, ...extraItems, { type: 'separator' }, ...baseItems];
}

export function registerEditableContextMenu(
  window: BrowserWindow,
  buildExtraItems?: EditableContextMenuItemBuilder
): void {
  window.webContents.on('context-menu', (_event, params) => {
    const template = buildEditableContextMenuTemplate(params, buildExtraItems, window);
    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({
      window,
    });
  });
}
