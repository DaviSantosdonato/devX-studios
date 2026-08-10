import { useStore } from '@nanostores/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { PortDropdown } from './PortDropdown';
import styles from './WorkspaceShell.module.scss';

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!activePreview) {
      setUrl('');
      setIframeUrl(undefined);

      return;
    }

    const { baseUrl } = activePreview;

    setUrl(baseUrl);
    setIframeUrl(baseUrl);
  }, [activePreview, iframeUrl]);

  const validateUrl = useCallback(
    (value: string) => {
      if (!activePreview) {
        return false;
      }

      const { baseUrl } = activePreview;

      if (value === baseUrl) {
        return true;
      } else if (value.startsWith(baseUrl)) {
        return ['/', '?', '#'].includes(value.charAt(baseUrl.length));
      }

      return false;
    },
    [activePreview],
  );

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  useEffect(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);

      setActivePreviewIndex(minPortIndex);
    }
  }, [previews]);

  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <section className={styles.previewRegion} aria-label="Application preview">
      {isPortDropdownOpen ? (
        <button
          className="z-iframe-overlay absolute inset-0 h-full w-full cursor-default bg-transparent"
          type="button"
          aria-label="Close preview port menu"
          onClick={() => setIsPortDropdownOpen(false)}
        />
      ) : null}

      <div className={styles.previewToolbar} role="toolbar" aria-label="Preview controls">
        <IconButton
          icon="i-ph:arrow-clockwise"
          size="md"
          title="Reload preview"
          disabled={!activePreview}
          onClick={reloadPreview}
        />
        <label className={styles.previewAddress}>
          <span className={classNames('i-ph:lock-key-duotone', styles.previewAddressIcon)} aria-hidden="true" />
          <span className="sr-only">Preview address</span>
          <input
            ref={inputRef}
            aria-label="Preview address"
            className="min-w-0 w-full bg-transparent text-xs outline-none"
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && validateUrl(url)) {
                setIframeUrl(url);
                inputRef.current?.blur();
              }
            }}
          />
        </label>
        {previews.length > 1 ? (
          <PortDropdown
            activePreviewIndex={activePreviewIndex}
            setActivePreviewIndex={setActivePreviewIndex}
            isDropdownOpen={isPortDropdownOpen}
            setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
            setIsDropdownOpen={setIsPortDropdownOpen}
            previews={previews}
          />
        ) : null}
      </div>

      <div className={styles.previewContent}>
        {activePreview ? (
          <iframe
            ref={iframeRef}
            className="h-full w-full border-none bg-white"
            src={iframeUrl}
            title="DevX application preview"
          />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <span className={classNames('i-ph:browser-duotone', styles.emptyStateIcon)} aria-hidden="true" />
              <span className={styles.emptyStateTitle}>No preview available</span>
              <span className={styles.emptyStateText}>A running development server will appear here.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
