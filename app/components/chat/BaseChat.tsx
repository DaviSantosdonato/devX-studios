import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import React, { type RefCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';
import { ClientOnly } from 'remix-utils/client-only';
import { HomeStart } from '~/components/home/HomeStart';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeader } from '~/components/ui/PanelHeader';
import { Workbench } from '~/components/workbench/Workbench.client';
import workspaceStyles from '~/components/workbench/WorkspaceShell.module.scss';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';

import styles from './BaseChat.module.scss';

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (event: React.SyntheticEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  onPromptSelect?: (prompt: string) => void;
}

const TEXTAREA_MIN_HEIGHT = 76;

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop,
      onPromptSelect,
    },
    ref,
  ) => {
    const textareaMaxHeight = chatStarted ? 400 : 200;
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const chatPanelRef = React.useRef<ImperativePanelHandle>(null);
    const workbenchPanelRef = React.useRef<ImperativePanelHandle>(null);

    React.useEffect(() => {
      const chatPanel = chatPanelRef.current;
      const workbenchPanel = workbenchPanelRef.current;

      if (!chatPanel || !workbenchPanel || !chatStarted) {
        return;
      }

      if (showWorkbench) {
        workbenchPanel.expand();
      } else {
        workbenchPanel.collapse();
      }

      if (showChat) {
        chatPanel.expand();
      } else {
        chatPanel.collapse();
      }
    }, [chatStarted, showChat, showWorkbench]);

    const chatWorkspace = (
      <div className="h-full flex flex-col">
        <ClientOnly>
          {() => (
            <Messages
              ref={messageRef}
              className="flex flex-col w-full flex-1"
              messages={messages}
              isStreaming={isStreaming}
            />
          )}
        </ClientOnly>
        <div className={classNames(styles.Composer, 'relative sticky bottom-0 w-full z-prompt')}>
          <div className={styles.ComposerInner}>
            <textarea
              ref={textareaRef}
              className={styles.ComposerTextarea}
              aria-label="Message DevX Studio"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (event.shiftKey) {
                    return;
                  }

                  event.preventDefault();
                  sendMessage?.(event);
                }
              }}
              value={input}
              onChange={handleInputChange}
              style={{
                minHeight: TEXTAREA_MIN_HEIGHT,
                maxHeight: textareaMaxHeight,
              }}
              placeholder="Como a DevX Studio pode ajudar você hoje?"
              translate="no"
            />
            <div className={styles.ComposerFooter}>
              <div className={styles.ComposerActions}>
                <IconButton
                  title="Enhance prompt"
                  disabled={input.length === 0 || enhancingPrompt}
                  className={classNames(styles.EnhanceButton, {
                    [styles.EnhanceButtonActive]: promptEnhanced,
                  })}
                  onClick={enhancePrompt}
                >
                  {enhancingPrompt ? (
                    <>
                      <span className="i-svg-spinners:90-ring-with-bg devx-icon--sm" aria-hidden="true" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <span className="i-ph:sparkle-duotone devx-icon--sm" aria-hidden="true" />
                      <span>{promptEnhanced ? 'Prompt enhanced' : 'Enhance prompt'}</span>
                    </>
                  )}
                </IconButton>
              </div>
              {input.length > 3 && (
                <span id="composer-hint" className={styles.ComposerHint}>
                  <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
                </span>
              )}
              <ClientOnly>
                {() => (
                  <SendButton
                    show={input.length > 0 || isStreaming}
                    isStreaming={isStreaming}
                    disabled={input.length === 0 && !isStreaming}
                    onClick={(event) => {
                      if (isStreaming) {
                        handleStop?.();
                        return;
                      }

                      sendMessage?.(event);
                    }}
                  />
                )}
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex h-full w-full overflow-hidden bg-devx-elements-background-depth-1',
        )}
        data-chat-visible={showChat}
      >
        {chatStarted ? (
          <>
            <ClientOnly>{() => <Menu />}</ClientOnly>
            <PanelGroup direction="horizontal" className={workspaceStyles.workspaceLayout}>
              <Panel
                ref={chatPanelRef}
                id="devx-chat-shell"
                order={1}
                defaultSize={34}
                minSize={25}
                collapsible
                collapsedSize={0}
                className={classNames(workspaceStyles.chatPanel, {
                  [workspaceStyles.chatPanelObscured]: showWorkbench,
                })}
              >
                {showChat ? (
                  <section
                    id="devx-chat-region"
                    className={workspaceStyles.chatRegion}
                    aria-labelledby="devx-chat-region-title"
                  >
                    <PanelHeader>
                      <span className="i-devx:chat devx-icon--sm" aria-hidden="true" />
                      <span id="devx-chat-region-title" className={workspaceStyles.regionTitle}>
                        Chat
                      </span>
                      <span className={workspaceStyles.panelMeta}>AI workspace</span>
                      <span className={workspaceStyles.liveStatus} data-busy={isStreaming}>
                        <span>{isStreaming ? 'Working' : 'Ready'}</span>
                      </span>
                    </PanelHeader>
                    <div ref={scrollRef} className={classNames(workspaceStyles.chatScroll, styles.MessageList)}>
                      <div className={classNames(styles.Chat, workspaceStyles.chatContent, 'flex flex-col min-h-full')}>
                        {chatWorkspace}
                      </div>
                    </div>
                  </section>
                ) : null}
              </Panel>

              <PanelResizeHandle
                id="devx-chat-workspace-resize"
                className={classNames(workspaceStyles.outerResizeHandle, {
                  [workspaceStyles.outerResizeHandleHidden]: !showChat || !showWorkbench,
                })}
                aria-label="Resize chat and workspace panels"
                title="Resize chat and workspace panels"
                disabled={!showChat || !showWorkbench}
              />

              <Panel
                ref={workbenchPanelRef}
                id="devx-workbench-shell"
                order={2}
                defaultSize={66}
                minSize={52}
                collapsible
                collapsedSize={0}
                className={workspaceStyles.workbenchPanel}
              >
                <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
              </Panel>
            </PanelGroup>
          </>
        ) : (
          <div ref={scrollRef} className="flex h-full w-full overflow-y-auto overflow-x-hidden">
            <div className={classNames(styles.Chat, 'flex min-w-0 flex-grow flex-col h-full')}>
              <HomeStart
                textareaRef={textareaRef}
                input={input}
                isStreaming={isStreaming}
                enhancingPrompt={enhancingPrompt}
                promptEnhanced={promptEnhanced}
                onInputChange={handleInputChange}
                onSubmit={sendMessage}
                onStop={handleStop}
                onEnhance={enhancePrompt}
                onPromptSelect={onPromptSelect}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);
