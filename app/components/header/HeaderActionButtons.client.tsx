import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import styles from '~/components/workbench/WorkspaceShell.module.scss';

export function HeaderActionButtons() {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);

  const canHideChat = showWorkbench || !showChat;

  return (
    <div className={styles.viewSwitch} role="group" aria-label="Workspace regions">
      <Button
        ariaLabel={showChat ? 'Hide chat panel' : 'Show chat panel'}
        controls="devx-chat-region"
        active={showChat}
        disabled={!canHideChat}
        onClick={() => {
          if (canHideChat) {
            chatStore.setKey('showChat', !showChat);
          }
        }}
      >
        <span className="i-devx:chat devx-icon--sm" aria-hidden="true" />
        <span>Chat</span>
      </Button>
      <Button
        ariaLabel={showWorkbench ? 'Hide workspace panel' : 'Show workspace panel'}
        controls="devx-workbench-region"
        active={showWorkbench}
        onClick={() => {
          if (showWorkbench && !showChat) {
            chatStore.setKey('showChat', true);
          }

          workbenchStore.showWorkbench.set(!showWorkbench);
        }}
      >
        <span className="i-ph:code-bold devx-icon--sm" aria-hidden="true" />
        <span>Workspace</span>
      </Button>
    </div>
  );
}

interface ButtonProps {
  ariaLabel: string;
  controls: string;
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
}

function Button({ ariaLabel, controls, active = false, disabled = false, children, onClick }: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-controls={controls}
      aria-pressed={active}
      className={classNames(styles.viewSwitchButton)}
      data-active={active && !disabled}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
