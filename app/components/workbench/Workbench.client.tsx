import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import styles from './WorkspaceShell.module.scss';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { duration: 0.16, ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
    icon: 'i-ph:code-bold',
    tabId: 'devx-code-tab',
    panelId: 'devx-code-panel',
  },
  right: {
    value: 'preview',
    text: 'Preview',
    icon: 'i-ph:browser-duotone',
    tabId: 'devx-preview-tab',
    panelId: 'devx-preview-panel',
  },
};

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const showTerminal = useStore(workbenchStore.showTerminal);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  if (!chatStarted || !showWorkbench) {
    return null;
  }

  return (
    <section id="devx-workbench-region" className={styles.workbenchRegion} aria-label="Development workspace">
      <div className={styles.workbenchToolbar}>
        <div className={styles.workbenchContext}>
          <span className="i-ph:brackets-angle-duotone devx-icon--sm" aria-hidden="true" />
          <span>Workspace</span>
        </div>

        <div className={styles.workbenchTabs}>
          <Slider
            selected={selectedView}
            options={sliderOptions}
            setSelected={setSelectedView}
            ariaLabel="Workspace views"
          />
        </div>

        <div className={styles.workbenchActions}>
          {selectedView === 'preview' && hasPreview ? (
            <span className={styles.workbenchStatus}>
              <span className={styles.workbenchStatusDot} aria-hidden="true" />
              Preview ready
            </span>
          ) : null}
          {selectedView === 'code' ? (
            <PanelHeaderButton
              aria-label={showTerminal ? 'Hide terminal' : 'Show terminal'}
              aria-controls="devx-terminal-region"
              aria-pressed={showTerminal}
              title={showTerminal ? 'Hide terminal' : 'Show terminal'}
              onClick={() => workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get())}
            >
              <span className="i-ph:terminal devx-icon--sm" aria-hidden="true" />
              <span className="hidden xl:inline">Terminal</span>
            </PanelHeaderButton>
          ) : null}
          <IconButton
            icon="i-ph:x"
            size="md"
            title="Close workspace"
            onClick={() => workbenchStore.showWorkbench.set(false)}
          />
        </div>
      </div>

      <div className={styles.workbenchViews}>
        <View
          id="devx-code-panel"
          aria-labelledby="devx-code-tab"
          active={selectedView === 'code'}
          initial={false}
          animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
        >
          <EditorPanel
            editorDocument={currentDocument}
            isStreaming={isStreaming}
            selectedFile={selectedFile}
            files={files}
            unsavedFiles={unsavedFiles}
            onFileSelect={onFileSelect}
            onEditorScroll={onEditorScroll}
            onEditorChange={onEditorChange}
            onFileSave={onFileSave}
            onFileReset={onFileReset}
          />
        </View>
        <View
          id="devx-preview-panel"
          aria-labelledby="devx-preview-tab"
          active={selectedView === 'preview'}
          initial={false}
          animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
        >
          <Preview />
        </View>
      </div>
    </section>
  );
});

interface ViewProps extends HTMLMotionProps<'div'> {
  active: boolean;
  children: JSX.Element;
}

const View = memo(({ active, children, ...props }: ViewProps) => {
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      viewRef.current?.removeAttribute('inert');
    } else {
      viewRef.current?.setAttribute('inert', '');
    }
  }, [active]);

  return (
    <motion.div
      ref={viewRef}
      className={styles.workbenchView}
      role="tabpanel"
      aria-hidden={!active}
      tabIndex={active ? 0 : -1}
      transition={viewTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
});
