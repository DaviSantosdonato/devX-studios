import type React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { HomeRecentProjects } from './HomeRecentProjects.client';

import styles from './HomeStart.module.scss';

interface HomeStartProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  input: string;
  isStreaming: boolean;
  enhancingPrompt: boolean;
  promptEnhanced: boolean;
  onInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (event: React.SyntheticEvent) => void;
  onStop?: () => void;
  onEnhance?: () => void;
  onPromptSelect?: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  { label: 'Build a landing page', icon: 'i-ph:layout-duotone' },
  { label: 'Create a dashboard', icon: 'i-ph:chart-line-up-duotone' },
  { label: 'Make a portfolio', icon: 'i-ph:user-square-duotone' },
  { label: 'Build a React app', icon: 'i-ph:code-duotone' },
] as const;

export function HomeStart({
  textareaRef,
  input,
  isStreaming,
  enhancingPrompt,
  promptEnhanced,
  onInputChange,
  onSubmit,
  onStop,
  onEnhance,
  onPromptSelect,
}: HomeStartProps) {
  const canSubmit = input.length > 0 && !isStreaming;

  return (
    <section className={styles.Home} aria-labelledby="home-title">
      <div className={styles.Content}>
        <div id="intro" className={styles.Hero}>
          <div className={styles.ProductLabel}>
            <span className="i-devx:logo devx-icon--md" aria-hidden="true" />
            <span>DevX Studio</span>
            <span className={styles.ProductDivider} aria-hidden="true" />
            <span className={styles.ProductContext}>AI software workspace</span>
          </div>
          <h1 id="home-title" className={classNames('devx-type-display', styles.HeroTitle)}>
            What do you want to build?
          </h1>
          <p id="home-description" className={styles.HeroDescription}>
            Describe your idea. DevX will turn it into working code.
          </p>
        </div>

        <form
          className={styles.Composer}
          aria-label="Create a new project"
          aria-describedby="home-description composer-hint"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.(event);
          }}
        >
          <div className={styles.ComposerHeader}>
            <span className={styles.ComposerMode}>
              <span className="i-ph:terminal-window-duotone devx-icon--sm" aria-hidden="true" />
              New project
            </span>
            <span className={styles.ReadyState}>
              <span className={styles.ReadyDot} aria-hidden="true" />
              Ready
            </span>
          </div>

          <textarea
            ref={textareaRef}
            className={styles.Textarea}
            aria-label="Describe what you want to build"
            aria-describedby="home-description composer-hint"
            value={input}
            placeholder="Describe what you want to build..."
            rows={4}
            translate="no"
            onChange={(event) => onInputChange?.(event)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();

                if (canSubmit) {
                  onSubmit?.(event);
                }
              }
            }}
          />

          <div className={styles.ComposerFooter}>
            <IconButton
              title="Enhance prompt"
              disabled={input.length === 0 || enhancingPrompt}
              className={classNames(styles.EnhanceButton, {
                [styles.EnhanceButtonActive]: promptEnhanced,
              })}
              onClick={onEnhance}
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

            <span id="composer-hint" className={styles.ComposerHint}>
              <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
            </span>

            <button
              type={isStreaming ? 'button' : 'submit'}
              className={classNames('devx-button devx-button--primary', styles.SendButton)}
              disabled={!isStreaming && !canSubmit}
              aria-label={isStreaming ? 'Stop generation' : 'Send prompt'}
              onClick={isStreaming ? onStop : undefined}
            >
              <span className={isStreaming ? 'i-ph:stop-circle-bold' : 'i-ph:arrow-up-right-bold'} aria-hidden="true" />
              <span className={styles.SendLabel}>{isStreaming ? 'Stop' : 'Send'}</span>
            </button>
          </div>
        </form>

        <section id="examples" className={styles.QuickStart} aria-labelledby="quick-start-title">
          <div className={styles.SectionHeading}>
            <h2 id="quick-start-title" className="devx-type-label">
              Quick start
            </h2>
            <span className="devx-type-caption">Choose a starting point or write your own prompt</span>
          </div>
          <div className={styles.PromptList}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className={classNames('devx-button devx-button--ghost devx-button--sm', styles.PromptChip)}
                onClick={() => onPromptSelect?.(prompt.label)}
              >
                <span className={classNames(prompt.icon, 'devx-icon--sm')} aria-hidden="true" />
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </section>

        <ClientOnly fallback={<HomeRecentProjectsFallback />}>{() => <HomeRecentProjects />}</ClientOnly>
      </div>
    </section>
  );
}

function HomeRecentProjectsFallback() {
  return (
    <section className={styles.Recent} aria-labelledby="recent-projects-fallback-title" aria-busy="true">
      <div className={styles.RecentHeading}>
        <div>
          <h2 id="recent-projects-fallback-title" className="devx-type-heading-3">
            Recent projects
          </h2>
          <p className="devx-type-caption">Continue where you left off</p>
        </div>
        <span className="devx-badge">
          <span className="i-ph:hard-drives-duotone devx-icon--sm" aria-hidden="true" />
          Local
        </span>
      </div>
      <div className={styles.RecentGrid} aria-label="Loading recent projects">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className={classNames(styles.ProjectItem, styles.ProjectSkeleton)} aria-hidden="true" />
        ))}
      </div>
    </section>
  );
}
