/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: vi.fn(() => ({
      popup: vi.fn(),
    })),
  },
}));

import { Menu } from 'electron';
import {
  buildEditableContextMenuTemplate,
  registerEditableContextMenu,
} from '@/process/services/editContextMenuService';

describe('edit context menu service', () => {
  it('returns no menu for non-editable targets', () => {
    expect(buildEditableContextMenuTemplate({ isEditable: false })).toEqual([]);
  });

  it('builds a standard edit menu for editable targets', () => {
    const template = buildEditableContextMenuTemplate({ isEditable: true });
    const roles = template.map((item) => item.role).filter(Boolean);

    expect(roles).toEqual(['undo', 'redo', 'cut', 'copy', 'paste', 'pasteAndMatchStyle', 'delete', 'selectAll']);
  });

  it('prepends misspelling suggestions when a word is misspelled', () => {
    const window = {
      webContents: {
        replaceMisspelling: vi.fn(),
        session: {
          addWordToSpellCheckerDictionary: vi.fn(),
        },
      },
    };

    const template = buildEditableContextMenuTemplate(
      {
        isEditable: true,
        misspelledWord: 'teh',
        dictionarySuggestions: ['the'],
      },
      undefined,
      window as never
    );

    expect(template[0]?.label).toBe('the');
    expect(template[2]?.label).toBe('Add to Dictionary');
  });

  it('inserts app-specific items ahead of the standard edit actions', () => {
    const template = buildEditableContextMenuTemplate({ isEditable: true }, () => [{ label: 'Custom Action' }]);

    expect(template[0]?.label).toBe('Custom Action');
    expect(template[1]?.type).toBe('separator');
    expect(template[2]?.role).toBe('undo');
  });

  it('registers the webContents context-menu handler and pops a menu for editable targets', () => {
    const handlerRef: { current?: (event: unknown, params: { isEditable?: boolean }) => void } = {};
    const popup = vi.fn();
    vi.mocked(Menu.buildFromTemplate).mockReturnValue({ popup } as never);

    const window = {
      webContents: {
        on: vi.fn((event: string, handler: (event: unknown, params: { isEditable?: boolean }) => void) => {
          if (event === 'context-menu') {
            handlerRef.current = handler;
          }
        }),
      },
    };

    registerEditableContextMenu(window as never);
    handlerRef.current?.({}, { isEditable: true });

    expect(window.webContents.on).toHaveBeenCalledWith('context-menu', expect.any(Function));
    expect(Menu.buildFromTemplate).toHaveBeenCalled();
    expect(popup).toHaveBeenCalledWith({ window });
  });
});
