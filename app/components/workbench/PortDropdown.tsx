import { memo, useEffect, useRef } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import type { PreviewInfo } from '~/lib/stores/previews';
import { classNames } from '~/utils/classNames';

interface PortDropdownProps {
  activePreviewIndex: number;
  setActivePreviewIndex: (index: number) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (value: boolean) => void;
  setHasSelectedPreview: (value: boolean) => void;
  previews: PreviewInfo[];
}

export const PortDropdown = memo(
  ({
    activePreviewIndex,
    setActivePreviewIndex,
    isDropdownOpen,
    setIsDropdownOpen,
    setHasSelectedPreview,
    previews,
  }: PortDropdownProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const sortedPreviews = previews
      .map((previewInfo, index) => ({ ...previewInfo, index }))
      .sort((a, b) => a.port - b.port);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      };

      if (isDropdownOpen) {
        window.addEventListener('mousedown', handleClickOutside);
      }

      return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    return (
      <div className="relative z-port-dropdown" ref={dropdownRef}>
        <IconButton
          icon="i-ph:plug"
          size="md"
          title="Select preview port"
          aria-controls="devx-preview-port-menu"
          aria-expanded={isDropdownOpen}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        />
        {isDropdownOpen ? (
          <div
            id="devx-preview-port-menu"
            className="devx-popover dropdown-animation absolute right-0 mt-2 min-w-[160px] overflow-hidden"
            role="menu"
            aria-label="Preview ports"
          >
            <div className="border-b border-devx-elements-borderColor px-3 py-2 text-xs font-medium text-devx-elements-textSecondary">
              Preview ports
            </div>
            <div className="p-1">
              {sortedPreviews.map((preview) => {
                const isActive = activePreviewIndex === preview.index;

                return (
                  <button
                    key={preview.port}
                    className={classNames(
                      'flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-devx-elements-item-backgroundActive',
                      {
                        'bg-devx-elements-item-backgroundAccent text-devx-elements-item-contentAccent': isActive,
                        'text-devx-elements-item-contentDefault': !isActive,
                      },
                    )}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      setActivePreviewIndex(preview.index);
                      setIsDropdownOpen(false);
                      setHasSelectedPreview(true);
                    }}
                  >
                    <span
                      className={classNames('h-1.5 w-1.5 rounded-full', {
                        'bg-devx-elements-icon-success': preview.ready,
                        'bg-devx-elements-textTertiary': !preview.ready,
                      })}
                      aria-hidden="true"
                    />
                    <span>localhost:{preview.port}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
