import * as Dialog from '@radix-ui/react-dialog';
import { type ChatHistoryItem } from '~/lib/persistence';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
}

export function HistoryItem({ item, onDelete }: HistoryItemProps) {
  return (
    <div className="group flex min-h-8 items-center rounded-md border border-transparent text-devx-elements-textSecondary hover:border-devx-elements-borderColor hover:bg-devx-elements-background-depth-3 hover:text-devx-elements-textPrimary focus-within:border-devx-elements-borderColorActive focus-within:bg-devx-elements-background-depth-3">
      <a
        href={`/chat/${item.urlId}`}
        className="min-w-0 flex-1 truncate px-2 py-1.5 text-xs no-underline outline-none"
        title={item.description}
      >
        {item.description}
      </a>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-devx-elements-textTertiary opacity-0 transition-opacity hover:bg-devx-elements-item-backgroundDanger hover:text-devx-elements-item-contentDanger group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label={`Delete ${item.description ?? 'project'}`}
          onClick={(event) => onDelete?.(event)}
        >
          <span className="i-ph:trash devx-icon--sm" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
    </div>
  );
}
