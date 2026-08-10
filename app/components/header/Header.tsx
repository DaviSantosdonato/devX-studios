import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import styles from '~/components/workbench/WorkspaceShell.module.scss';

export function Header() {
  const chat = useStore(chatStore);

  if (!chat.started) {
    return <HomeHeader />;
  }

  return (
    <header className={styles.workspaceHeader}>
      <button
        className={styles.sidebarToggle}
        type="button"
        aria-label={chat.showSidebar ? 'Close project navigation' : 'Open project navigation'}
        aria-controls="devx-workspace-sidebar"
        aria-expanded={chat.showSidebar}
        onClick={() => chatStore.setKey('showSidebar', !chat.showSidebar)}
      >
        <span className="i-ph:sidebar-simple-duotone devx-icon--sm" aria-hidden="true" />
      </button>

      <a aria-label="DevX Studio home" href="/" className={styles.workspaceBrand}>
        <span className="i-devx:logo devx-icon--md" aria-hidden="true" />
        <span className={styles.workspaceWordmark}>DevX Studio</span>
      </a>

      <span className={styles.headerDivider} aria-hidden="true" />

      <div className={styles.projectIdentity} role="group" aria-label="Current project">
        <span className={styles.projectPrefix}>DevX /</span>
        <h1 className={styles.projectName}>
          <ClientOnly fallback="Untitled project">{() => <ChatDescription />}</ClientOnly>
        </h1>
      </div>

      <ClientOnly>
        {() => (
          <nav className={styles.workspaceHeaderActions} aria-label="Workspace actions">
            <HeaderActionButtons />
            <span className={styles.headerDivider} aria-hidden="true" />
            <ThemeSwitch />
          </nav>
        )}
      </ClientOnly>
    </header>
  );
}

function HomeHeader() {
  return (
    <header className="flex items-center shrink-0 h-[var(--header-height)] px-4 sm:px-5 bg-devx-elements-background-depth-1 border-b border-devx-elements-borderColor">
      <a
        href="/"
        aria-label="DevX Studio home"
        className="flex min-w-0 items-center gap-2 text-devx-elements-textPrimary no-underline"
      >
        <span className="i-devx:logo devx-icon--lg shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-[-0.01em] whitespace-nowrap">DevX Studio</span>
        <span className="hidden sm:block h-4 w-px mx-1 bg-devx-elements-borderColor" aria-hidden="true" />
        <span className="hidden sm:inline text-xs text-devx-elements-textTertiary whitespace-nowrap">
          by <span className="text-devx-elements-textSecondary">X Technologies</span>
        </span>
      </a>

      <nav className="ml-auto flex items-center gap-1" aria-label="Home actions">
        <a
          href="/"
          aria-current="page"
          className={classNames(
            'devx-button devx-button--ghost devx-button--sm no-underline',
            'text-devx-elements-textSecondary',
          )}
        >
          <span className="i-ph:plus-bold devx-icon--sm" aria-hidden="true" />
          <span className="hidden sm:inline">New project</span>
        </a>
        <ClientOnly fallback={<span className="block h-7 w-7" aria-hidden="true" />}>
          {() => <ThemeSwitch />}
        </ClientOnly>
      </nav>
    </header>
  );
}
