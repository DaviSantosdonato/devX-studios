import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

const shellHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.shellHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.shellHighlighter = shellHighlighter;
}

interface ArtifactProps {
  messageId: string;
}

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  const actions = useStore(
    computed(artifact.runner.actions, (actions) => {
      return Object.values(actions);
    }),
  );

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  useEffect(() => {
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }
  }, [actions, showActions]);

  const runningActions = actions.filter((a) => a.status === 'running').length;
  const pendingActions = actions.filter((a) => a.status === 'pending').length;
  const completedActions = actions.filter((a) => a.status === 'complete').length;
  const failedActions = actions.filter((a) => a.status === 'failed' || a.status === 'aborted').length;

  const getArtifactStatus = () => {
    if (failedActions > 0) {
      return { label: 'Error', variant: 'error' as const };
    }

    if (runningActions > 0) {
      return { label: 'Running', variant: 'running' as const };
    }

    if (pendingActions > 0) {
      return { label: 'Pending', variant: 'pending' as const };
    }

    if (completedActions > 0) {
      return { label: 'Complete', variant: 'complete' as const };
    }

    return { label: 'Idle', variant: 'idle' as const };
  };

  const artifactStatus = getArtifactStatus();

  return (
    <div
      className={classNames(
        'artifact',
        'flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150',
      )}
    >
      <button
        className={classNames(
          'flex items-center gap-3 w-full px-3 py-2.5 text-left',
          'bg-devx-elements-artifacts-background hover:bg-devx-elements-artifacts-backgroundHover',
          'border border-devx-elements-artifacts-borderColor rounded-lg',
          'transition-colors duration-150',
        )}
        onClick={() => {
          const showWorkbench = workbenchStore.showWorkbench.get();
          workbenchStore.showWorkbench.set(!showWorkbench);
        }}
        aria-expanded={showActions}
        aria-controls={`artifact-actions-${messageId}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={classNames('flex-shrink-0 w-2 h-2 rounded-full', {
              'bg-devx-accent-default animate-pulse': artifactStatus.variant === 'running',
              'bg-devx-success-default': artifactStatus.variant === 'complete',
              'bg-devx-danger-default': artifactStatus.variant === 'error',
              'bg-devx-warning-default': artifactStatus.variant === 'pending',
              'bg-devx-text-muted': artifactStatus.variant === 'idle',
            })}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="text-devx-elements-textPrimary font-medium text-sm truncate">{artifact?.title}</div>
            <div className="flex items-center gap-2 text-xs text-devx-elements-textTertiary">
              <span>Click to open Workbench</span>
              <span
                className={classNames('px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider', {
                  'bg-devx-accent-subtle text-devx-accent-hover': artifactStatus.variant === 'running',
                  'bg-devx-success-subtle text-devx-success-default': artifactStatus.variant === 'complete',
                  'bg-devx-danger-subtle text-devx-danger-default': artifactStatus.variant === 'error',
                  'bg-devx-warning-subtle text-devx-warning-default': artifactStatus.variant === 'pending',
                  'bg-devx-border-subtle text-devx-text-muted': artifactStatus.variant === 'idle',
                })}
              >
                {artifactStatus.label}
              </span>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {actions.length && (
            <motion.button
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="flex-shrink-0 bg-devx-elements-artifacts-background hover:bg-devx-elements-artifacts-backgroundHover p-2 rounded-md"
              onClick={toggleActions}
              aria-label={showActions ? 'Hide actions' : 'Show actions'}
            >
              <div
                className={classNames(
                  'i-ph:caret-down-bold text-devx-elements-textSecondary transition-transform duration-150',
                  { 'rotate-180': showActions },
                )}
                aria-hidden="true"
              />
            </motion.button>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {showActions && actions.length > 0 && (
          <motion.div
            id={`artifact-actions-${messageId}`}
            className="actions border-t border-devx-elements-artifacts-borderColor"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: '0px', opacity: 0 }}
            transition={{ duration: 0.15, ease: cubicEasingFn }}
          >
            <div className="p-3 bg-devx-elements-actions-background">
              <ActionList actions={actions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ShellCodeBlockProps {
  className?: string;
  code: string;
}

function ShellCodeBlock({ className, code }: ShellCodeBlockProps) {
  return (
    <div
      className={classNames('text-[12px]', className)}
      dangerouslySetInnerHTML={{
        __html: shellHighlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

interface ActionListProps {
  actions: ActionState[];
}

const actionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const ActionList = memo(({ actions }: ActionListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-2">
        {actions.map((action, index) => {
          const { status, type, content } = action;
          const isLast = index === actions.length - 1;

          return (
            <motion.li
              key={index}
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.15,
                ease: cubicEasingFn,
                delay: index * 0.03,
              }}
            >
              <div className="flex items-center gap-2 text-sm">
                <div className={classNames('flex-shrink-0 text-lg', getIconColor(action.status))}>
                  {status === 'running' ? (
                    <div className="i-svg-spinners:90-ring-with-bg animate-spin" aria-hidden="true" />
                  ) : status === 'pending' ? (
                    <div className="i-ph:circle-duotone" aria-hidden="true" />
                  ) : status === 'complete' ? (
                    <div className="i-ph:check" aria-hidden="true" />
                  ) : status === 'failed' || status === 'aborted' ? (
                    <div className="i-ph:x" aria-hidden="true" />
                  ) : null}
                </div>
                {type === 'file' ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-devx-elements-textSecondary">Create</span>
                      <code
                        className={classNames(
                          'bg-devx-elements-artifacts-inlineCode-background text-devx-elements-artifacts-inlineCode-text px-2 py-1 rounded text-[12px] font-mono truncate block',
                        )}
                      >
                        {action.filePath}
                      </code>
                    </div>
                  </div>
                ) : type === 'shell' ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-devx-elements-textSecondary">Run</span>
                      <code
                        className={classNames(
                          'bg-devx-elements-artifacts-inlineCode-background text-devx-elements-artifacts-inlineCode-text px-2 py-1 rounded text-[12px] font-mono truncate block',
                        )}
                      >
                        {content.split('\n')[0].slice(0, 80)}
                      </code>
                    </div>
                  </div>
                ) : null}
              </div>
              {type === 'shell' && (
                <ShellCodeBlock
                  className={classNames('mt-2', {
                    'mb-2': !isLast,
                  })}
                  code={content}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-devx-elements-textTertiary';
    }
    case 'running': {
      return 'text-devx-accent-default';
    }
    case 'complete': {
      return 'text-devx-success-default';
    }
    case 'aborted': {
      return 'text-devx-elements-textSecondary';
    }
    case 'failed': {
      return 'text-devx-danger-default';
    }
    default: {
      return undefined;
    }
  }
}
