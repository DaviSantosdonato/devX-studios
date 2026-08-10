import type { Message } from 'ai';
import React, { type RefCallback } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { HomeStart } from '~/components/home/HomeStart';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
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

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex h-full w-full overflow-hidden bg-devx-elements-background-depth-1',
        )}
        data-chat-visible={showChat}
      >
        {chatStarted ? <ClientOnly>{() => <Menu />}</ClientOnly> : null}
        <div
          ref={scrollRef}
          className={classNames('flex overflow-y-auto w-full h-full', {
            'overflow-x-hidden': !chatStarted,
          })}
        >
          <div
            className={classNames(styles.Chat, 'flex flex-col flex-grow h-full', {
              'min-w-[var(--chat-min-width)]': chatStarted,
              'min-w-0': !chatStarted,
            })}
          >
            {!chatStarted ? (
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
            ) : (
              <div className="h-full flex flex-col pt-6 px-6">
                <ClientOnly>
                  {() => (
                    <Messages
                      ref={messageRef}
                      className="flex flex-col w-full flex-1 max-w-chat px-4 pb-6 mx-auto z-1"
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  )}
                </ClientOnly>
                <div className="relative sticky bottom-0 w-full max-w-chat mx-auto z-prompt">
                  <div className="shadow-sm border border-devx-elements-borderColor bg-devx-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      className="w-full pl-4 pt-4 pr-16 focus:outline-none resize-none text-md text-devx-elements-textPrimary placeholder-devx-elements-textTertiary bg-transparent"
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
                    <ClientOnly>
                      {() => (
                        <SendButton
                          show={input.length > 0 || isStreaming}
                          isStreaming={isStreaming}
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
                    <div className="flex justify-between text-sm p-4 pt-2">
                      <div className="flex gap-1 items-center">
                        <IconButton
                          title="Enhance prompt"
                          disabled={input.length === 0 || enhancingPrompt}
                          className={classNames({
                            'opacity-100!': enhancingPrompt,
                            'text-devx-elements-item-contentAccent! pr-1.5 enabled:hover:bg-devx-elements-item-backgroundAccent!':
                              promptEnhanced,
                          })}
                          onClick={enhancePrompt}
                        >
                          {enhancingPrompt ? (
                            <>
                              <div className="i-svg-spinners:90-ring-with-bg text-devx-elements-loader-progress text-xl" />
                              <div className="ml-1.5">Enhancing prompt...</div>
                            </>
                          ) : (
                            <>
                              <div className="i-ph:sparkle-duotone text-devx-elements-loader-progress text-xl" />
                              {promptEnhanced ? <div className="ml-1.5">Prompt enhanced</div> : null}
                            </>
                          )}
                        </IconButton>
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs text-devx-elements-textTertiary">
                          Use <kbd className="kdb">Shift</kbd> + <kbd className="kdb">Return</kbd> for a new line
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-devx-elements-background-depth-1 pb-6">{/* Ghost Element */}</div>
                </div>
              </div>
            )}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
        </div>
      </div>
    );
  },
);
