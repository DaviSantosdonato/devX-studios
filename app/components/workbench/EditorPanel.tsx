import { useStore } from '@nanostores/react';
import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';
import {
  CodeMirrorEditor,
  type EditorDocument,
  type EditorSettings,
  type OnChangeCallback as OnEditorChange,
  type OnSaveCallback as OnEditorSave,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeader } from '~/components/ui/PanelHeader';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { shortcutEventEmitter } from '~/lib/hooks';
import type { FileMap } from '~/lib/stores/files';
import { themeStore } from '~/lib/stores/theme';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { WORK_DIR } from '~/utils/constants';
import { renderLogger } from '~/utils/logger';
import { isMobile } from '~/utils/mobile';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileTree } from './FileTree';
import styles from './WorkspaceShell.module.scss';
import { Terminal, type TerminalRef } from './terminal/Terminal';

interface EditorPanelProps {
  files?: FileMap;
  unsavedFiles?: Set<string>;
  editorDocument?: EditorDocument;
  selectedFile?: string | undefined;
  isStreaming?: boolean;
  onEditorChange?: OnEditorChange;
  onEditorScroll?: OnEditorScroll;
  onFileSelect?: (value?: string) => void;
  onFileSave?: OnEditorSave;
  onFileReset?: () => void;
}

const MAX_TERMINALS = 3;
const DEFAULT_FILE_PANEL_SIZE = 18;
const DEFAULT_TERMINAL_SIZE = 26;
const DEFAULT_EDITOR_SIZE = 100 - DEFAULT_TERMINAL_SIZE;

const editorSettings: EditorSettings = { tabSize: 2 };

export const EditorPanel = memo(
  ({
    files,
    unsavedFiles,
    editorDocument,
    selectedFile,
    isStreaming,
    onFileSelect,
    onEditorChange,
    onEditorScroll,
    onFileSave,
    onFileReset,
  }: EditorPanelProps) => {
    renderLogger.trace('EditorPanel');

    const theme = useStore(themeStore);
    const showTerminal = useStore(workbenchStore.showTerminal);

    const filePanelRef = useRef<ImperativePanelHandle>(null);
    const terminalRefs = useRef<Array<TerminalRef | null>>([]);
    const terminalPanelRef = useRef<ImperativePanelHandle>(null);
    const terminalToggledByShortcut = useRef(false);

    const [showFiles, setShowFiles] = useState(true);
    const [activeTerminal, setActiveTerminal] = useState(0);
    const [terminalCount, setTerminalCount] = useState(1);

    const activeFileSegments = useMemo(() => {
      if (!editorDocument) {
        return undefined;
      }

      return editorDocument.filePath.split('/');
    }, [editorDocument]);

    const activeFileUnsaved = useMemo(() => {
      return editorDocument !== undefined && unsavedFiles?.has(editorDocument.filePath);
    }, [editorDocument, unsavedFiles]);

    useEffect(() => {
      const unsubscribeFromEventEmitter = shortcutEventEmitter.on('toggleTerminal', () => {
        terminalToggledByShortcut.current = true;
      });

      const unsubscribeFromThemeStore = themeStore.subscribe(() => {
        for (const ref of Object.values(terminalRefs.current)) {
          ref?.reloadStyles();
        }
      });

      return () => {
        unsubscribeFromEventEmitter();
        unsubscribeFromThemeStore();
      };
    }, []);

    useEffect(() => {
      const { current: terminal } = terminalPanelRef;

      if (!terminal) {
        return;
      }

      const isCollapsed = terminal.isCollapsed();

      if (!showTerminal && !isCollapsed) {
        terminal.collapse();
      } else if (showTerminal && isCollapsed) {
        terminal.resize(DEFAULT_TERMINAL_SIZE);
      }

      terminalToggledByShortcut.current = false;
    }, [showTerminal]);

    const toggleFiles = () => {
      const panel = filePanelRef.current;

      if (!panel) {
        return;
      }

      if (panel.isCollapsed()) {
        panel.resize(DEFAULT_FILE_PANEL_SIZE);
      } else {
        panel.collapse();
      }
    };

    const addTerminal = () => {
      if (terminalCount < MAX_TERMINALS) {
        setTerminalCount(terminalCount + 1);
        setActiveTerminal(terminalCount);
      }
    };

    const handleTerminalTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();

      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + terminalCount) % terminalCount;
      const nextTab = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
        `#devx-terminal-tab-${nextIndex}`,
      );

      setActiveTerminal(nextIndex);
      nextTab?.focus();
    };

    return (
      <PanelGroup id="devx-editor-terminal-layout" direction="vertical" className={styles.editorWorkspace}>
        <Panel id="devx-editor-shell" order={1} defaultSize={showTerminal ? DEFAULT_EDITOR_SIZE : 100} minSize={28}>
          <PanelGroup id="devx-files-editor-layout" direction="horizontal">
            <Panel
              id="devx-files-shell"
              order={1}
              ref={filePanelRef}
              defaultSize={DEFAULT_FILE_PANEL_SIZE}
              minSize={12}
              maxSize={32}
              collapsible
              collapsedSize={0}
              className={classNames({ [styles.panelCollapsed]: !showFiles })}
              onCollapse={() => setShowFiles(false)}
              onExpand={() => setShowFiles(true)}
            >
              <section
                id="devx-files-region"
                className={classNames(styles.panelRegion, styles.filePanel)}
                aria-labelledby="devx-files-region-title"
              >
                <PanelHeader>
                  <span className={classNames('i-ph:tree-structure-duotone', styles.panelIcon)} aria-hidden="true" />
                  <span id="devx-files-region-title" className={styles.panelLabel}>
                    Files
                  </span>
                </PanelHeader>
                <FileTree
                  className={styles.fileTreeScroll}
                  files={files}
                  hideRoot
                  unsavedFiles={unsavedFiles}
                  rootFolder={WORK_DIR}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                />
              </section>
            </Panel>

            <PanelResizeHandle
              aria-label="Resize files and code panels"
              title="Resize files and code panels"
              className={classNames({ [styles.outerResizeHandleHidden]: !showFiles })}
              disabled={!showFiles}
            />

            <Panel id="devx-code-shell" order={2} className={styles.editorPanel} defaultSize={82} minSize={42}>
              <section className={styles.panelRegion} aria-label="Code editor">
                <PanelHeader className="overflow-x-auto">
                  <IconButton
                    className={styles.panelHeaderControl}
                    icon={showFiles ? 'i-ph:sidebar-simple-duotone' : 'i-ph:sidebar-simple-fill'}
                    size="md"
                    title={showFiles ? 'Hide files' : 'Show files'}
                    aria-controls="devx-files-region"
                    aria-expanded={showFiles}
                    onClick={toggleFiles}
                  />

                  {activeFileSegments?.length ? (
                    <div className="flex min-w-0 flex-1 items-center text-xs">
                      <FileBreadcrumb pathSegments={activeFileSegments} files={files} onFileSelect={onFileSelect} />
                      {activeFileUnsaved ? (
                        <div className="ml-auto flex gap-1">
                          <PanelHeaderButton onClick={onFileSave} title="Save current file">
                            <span className="i-ph:floppy-disk-duotone devx-icon--sm" aria-hidden="true" />
                            Save
                          </PanelHeaderButton>
                          <PanelHeaderButton onClick={onFileReset} title="Reset current file">
                            <span className="i-ph:clock-counter-clockwise-duotone devx-icon--sm" aria-hidden="true" />
                            Reset
                          </PanelHeaderButton>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <span className={classNames('i-ph:file-code-duotone', styles.panelIcon)} aria-hidden="true" />
                      <span className={styles.panelLabel}>Code</span>
                      <span className={styles.panelMeta}>No file selected</span>
                    </>
                  )}
                </PanelHeader>

                <div className={styles.editorContent}>
                  {editorDocument ? (
                    <CodeMirrorEditor
                      theme={theme}
                      editable={!isStreaming}
                      settings={editorSettings}
                      doc={editorDocument}
                      autoFocusOnDocumentChange={!isMobile()}
                      onScroll={onEditorScroll}
                      onChange={onEditorChange}
                      onSave={onFileSave}
                    />
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateContent}>
                        <span
                          className={classNames('i-ph:file-code-duotone', styles.emptyStateIcon)}
                          aria-hidden="true"
                        />
                        <span className={styles.emptyStateTitle}>No file selected</span>
                        <span className={styles.emptyStateText}>Choose a file from the explorer to start editing.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle
          aria-label="Resize editor and terminal panels"
          title="Resize editor and terminal panels"
          className={classNames({ [styles.outerResizeHandleHidden]: !showTerminal })}
          disabled={!showTerminal}
        />

        <Panel
          id="devx-terminal-shell"
          order={2}
          ref={terminalPanelRef}
          defaultSize={showTerminal ? DEFAULT_TERMINAL_SIZE : 0}
          minSize={12}
          collapsible
          collapsedSize={0}
          className={classNames({ [styles.panelCollapsed]: !showTerminal })}
          onExpand={() => {
            if (!terminalToggledByShortcut.current) {
              workbenchStore.toggleTerminal(true);
            }
          }}
          onCollapse={() => {
            if (!terminalToggledByShortcut.current) {
              workbenchStore.toggleTerminal(false);
            }
          }}
        >
          <section
            id="devx-terminal-region"
            className={classNames(styles.panelRegion, styles.terminalPanel)}
            aria-label="Terminal"
          >
            <PanelHeader className="px-1!">
              <div className={classNames('devx-tabs', styles.terminalTabs)} role="tablist" aria-label="Terminals">
                {Array.from({ length: terminalCount }, (_, index) => {
                  const isActive = activeTerminal === index;

                  return (
                    <button
                      id={`devx-terminal-tab-${index}`}
                      key={index}
                      role="tab"
                      type="button"
                      aria-controls={`devx-terminal-panel-${index}`}
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      data-active={isActive}
                      className={classNames('devx-tab', styles.terminalTab)}
                      onKeyDown={(event) => handleTerminalTabKeyDown(event, index)}
                      onClick={() => setActiveTerminal(index)}
                    >
                      <span className="i-ph:terminal-window-duotone devx-icon--sm" aria-hidden="true" />
                      <span>Terminal {terminalCount > 1 ? index + 1 : ''}</span>
                    </button>
                  );
                })}
              </div>

              {terminalCount < MAX_TERMINALS ? (
                <IconButton icon="i-ph:plus" size="md" title="New terminal" onClick={addTerminal} />
              ) : null}
              <IconButton
                className="ml-auto"
                icon="i-ph:caret-down"
                title="Hide terminal"
                size="md"
                onClick={() => workbenchStore.toggleTerminal(false)}
              />
            </PanelHeader>

            <div className={styles.terminalContent}>
              {Array.from({ length: terminalCount }, (_, index) => {
                const isActive = activeTerminal === index;

                return (
                  <div
                    id={`devx-terminal-panel-${index}`}
                    key={index}
                    role="tabpanel"
                    aria-labelledby={`devx-terminal-tab-${index}`}
                    className={classNames('h-full overflow-hidden', { hidden: !isActive })}
                  >
                    <Terminal
                      className="h-full overflow-hidden"
                      ref={(ref) => {
                        terminalRefs.current[index] = ref;
                      }}
                      onTerminalReady={(terminal) => workbenchStore.attachTerminal(terminal)}
                      onTerminalResize={(cols, rows) => workbenchStore.onTerminalResize(cols, rows)}
                      theme={theme}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </Panel>
      </PanelGroup>
    );
  },
);
