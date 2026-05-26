import type { FileOrFolderItem } from '@/renderer/utils/file/fileTypes';
import React from 'react';

type AtFileMenuProps = {
  activeIndex: number;
  emptyText: string;
  items: FileOrFolderItem[];
  label: string;
  loading: boolean;
  loadingText: string;
  onHoverItem: (index: number) => void;
  onSelectItem: (item: FileOrFolderItem) => void;
};

const AtFileMenu: React.FC<AtFileMenuProps> = ({
  activeIndex,
  emptyText,
  items,
  label,
  loading,
  loadingText,
  onHoverItem,
  onSelectItem,
}) => {
  return (
    <div
      className='rounded-14px border border-solid overflow-hidden p-6px flex flex-col gap-2px'
      style={{
        borderColor: 'var(--color-border-2)',
        background: 'color-mix(in srgb, var(--color-bg-1) 94%, transparent)',
        backdropFilter: 'blur(14px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.05)',
      }}
      role='listbox'
      aria-label={label}
    >
      {items.length === 0 ? (
        <div className='px-12px py-10px text-12px text-t-secondary'>{loading ? loadingText : emptyText}</div>
      ) : (
        items.map((item, index) => {
          const isActive = index === activeIndex;
          const sourceLabel = item.sourceLabel;
          return (
            <div
              key={item.path}
              role='option'
              aria-selected={isActive}
              className='px-12px py-8px rounded-10px cursor-pointer transition-colors'
              style={{
                background: isActive ? 'var(--color-fill-2)' : 'transparent',
              }}
              onMouseEnter={() => {
                onHoverItem(index);
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelectItem(item);
              }}
            >
              <div className='flex items-start gap-10px'>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className='mt-2px h-32px w-32px shrink-0 rounded-8px object-cover'
                  />
                ) : null}
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-8px'>
                    <div className='min-w-0 flex-1 text-13px font-medium text-t-primary'>{item.name}</div>
                    {sourceLabel ? (
                      <span className='shrink-0 rounded-999px bg-fill-2 px-6px py-2px text-11px text-t-secondary'>
                        {sourceLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className='text-12px text-t-secondary break-all'>{item.relativePath || item.path}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AtFileMenu;
