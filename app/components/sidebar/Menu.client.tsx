import { useStore } from '@nanostores/react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import styles from '~/components/workbench/WorkspaceShell.module.scss';
import { db, deleteById, getAll, chatId, type ChatHistoryItem } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';

const menuVariants = {
  closed: {
    x: '-100%',
    visibility: 'hidden',
    transition: {
      duration: 0.16,
      ease: cubicEasingFn,
    },
  },
  open: {
    x: 0,
    visibility: 'visible',
    transition: {
      duration: 0.16,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

export function Menu() {
  const { showSidebar: open } = useStore(chatStore);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);

  const closeSidebar = useCallback(() => {
    chatStore.setKey('showSidebar', false);
  }, []);

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();

    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();

          if (chatId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    }
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, closeSidebar]);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="workspace-sidebar-backdrop"
            className={styles.sidebarBackdrop}
            type="button"
            aria-label="Close project navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={closeSidebar}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        id="devx-workspace-sidebar"
        initial={false}
        animate={open ? 'open' : 'closed'}
        variants={menuVariants}
        className={styles.workspaceSidebar}
        aria-label="Project navigation"
        aria-hidden={!open}
      >
        <div className={styles.sidebarHeader}>
          <span className="i-ph:stack-duotone devx-icon--sm" aria-hidden="true" />
          <span className={styles.regionTitle}>Projects</span>
          <IconButton
            className="ml-auto"
            icon="i-ph:x"
            size="md"
            title="Close project navigation"
            onClick={closeSidebar}
          />
        </div>

        <div className={styles.sidebarBody}>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="p-3">
              <a href="/" className="devx-button devx-button--primary devx-button--sm w-full no-underline">
                <span className="i-ph:plus-bold devx-icon--sm" aria-hidden="true" />
                New project
              </a>
            </div>

            <div className="px-4 pb-2">
              <span className={styles.sidebarSectionLabel}>Recent projects</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {list.length === 0 ? (
                <div className="px-2 py-3 text-xs text-devx-elements-textTertiary">No recent projects</div>
              ) : null}
              <DialogRoot open={dialogContent !== null}>
                {binDates(list).map(({ category, items }) => (
                  <div key={category} className="mt-3 first:mt-0">
                    <div className="sticky top-0 z-1 bg-devx-elements-background-depth-2 px-2 py-1 text-xs text-devx-elements-textTertiary">
                      {category}
                    </div>
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <HistoryItem
                          key={item.id}
                          item={item}
                          onDelete={() => setDialogContent({ type: 'delete', item })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                  {dialogContent?.type === 'delete' ? (
                    <>
                      <DialogTitle>Delete project?</DialogTitle>
                      <DialogDescription asChild>
                        <div>
                          <p>
                            You are about to delete <strong>{dialogContent.item.description}</strong>.
                          </p>
                          <p className="mt-1">This action cannot be undone.</p>
                        </div>
                      </DialogDescription>
                      <div className="flex justify-end gap-2 bg-devx-elements-background-depth-2 px-5 pb-4">
                        <DialogButton type="secondary" onClick={closeDialog}>
                          Cancel
                        </DialogButton>
                        <DialogButton
                          type="danger"
                          onClick={(event) => {
                            deleteItem(event, dialogContent.item);
                            closeDialog();
                          }}
                        >
                          Delete
                        </DialogButton>
                      </div>
                    </>
                  ) : null}
                </Dialog>
              </DialogRoot>
            </div>

            <div className="flex items-center border-t border-devx-elements-borderColor px-3 py-2">
              <span className="text-xs text-devx-elements-textTertiary">Appearance</span>
              <ThemeSwitch className="ml-auto" />
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
