import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);

  const canHideChat = showWorkbench || !showChat;

  return (
    <div className="flex">
      <div className="flex border border-devx-elements-borderColor rounded-md overflow-hidden">
        <Button
          ariaLabel="Toggle chat"
          active={showChat}
          disabled={!canHideChat}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
        >
          <div className="i-devx:chat text-sm" />
        </Button>
        <div className="w-[1px] bg-devx-elements-borderColor" />
        <Button
          ariaLabel="Toggle workspace"
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }

            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          <div className="i-ph:code-bold" />
        </Button>
      </div>
    </div>
  );
}

interface ButtonProps {
  ariaLabel: string;
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
}

function Button({ ariaLabel, active = false, disabled = false, children, onClick }: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={classNames('flex items-center p-1.5', {
        'bg-devx-elements-item-backgroundDefault hover:bg-devx-elements-item-backgroundActive text-devx-elements-textTertiary hover:text-devx-elements-textPrimary':
          !active,
        'bg-devx-elements-item-backgroundAccent text-devx-elements-item-contentAccent': active && !disabled,
        'bg-devx-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
          disabled,
      })}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
