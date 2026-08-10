import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';

export function Header() {
  const chat = useStore(chatStore);

  if (!chat.started) {
    return <HomeHeader />;
  }

  return (
    <header className="flex items-center shrink-0 bg-devx-elements-background-depth-1 p-5 border-b h-[var(--header-height)] border-devx-elements-borderColor">
      <div className="flex items-center gap-2 z-logo text-devx-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a aria-label="DevX Studio home" href="/" className="text-2xl font-semibold text-accent flex items-center">
          <span className="i-devx:logo-text?mask w-[46px] inline-block" />
        </a>
      </div>
      <span className="flex-1 px-4 truncate text-center text-devx-elements-textPrimary">
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>
      <ClientOnly>
        {() => (
          <div className="mr-1">
            <HeaderActionButtons />
          </div>
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
