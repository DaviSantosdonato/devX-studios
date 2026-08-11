import type { Message } from 'ai';
import React from 'react';
import { classNames } from '~/utils/classNames';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

import styles from './BaseChat.module.scss';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;

  return (
    <div id={id} ref={ref} className={classNames(styles.MessageList, props.className)}>
      {messages.length > 0 ? (
        messages.map((message, index) => {
          const { role, content } = message;
          const isUserMessage = role === 'user';

          if (isUserMessage) {
            return (
              <div key={index} className={styles.UserMessageWrapper}>
                <div className={styles.UserMessageMeta}>
                  <span className="i-ph:user-fill" aria-hidden="true" />
                  <span>You</span>
                </div>
                <UserMessage content={content} />
              </div>
            );
          }

          return (
            <div key={index} className={styles.AssistantMessageWrapper}>
              <div className={styles.AssistantMessageHeader}>
                <span className="i-devx:logo devx-icon--sm" aria-hidden="true" />
                <span>DevX</span>
              </div>
              <AssistantMessage content={content} />
            </div>
          );
        })
      ) : (
        <div className={styles.ChatEmptyState}>
          <div className={styles.ChatEmptyStateIcon}>
            <div className="i-devx:chat devx-icon--xl" aria-hidden="true" />
          </div>
          <p className={styles.ChatEmptyStateText}>Start building with DevX</p>
        </div>
      )}
      {isStreaming && (
        <div
          key="streaming-indicator"
          className={classNames(styles.StreamingIndicator, styles.AssistantMessageWrapper)}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.StreamingCursor} aria-hidden="true" />
          <span>DevX is working…</span>
        </div>
      )}
    </div>
  );
});
