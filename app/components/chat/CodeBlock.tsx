import { memo, useEffect, useState } from 'react';
import { bundledLanguages, codeToHtml, isSpecialLang, type BundledLanguage, type SpecialLanguage } from 'shiki';
import { classNames } from '~/utils/classNames';
import { createScopedLogger } from '~/utils/logger';

import styles from './CodeBlock.module.scss';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({ className, code, language = 'plaintext', theme = 'dark-plus', disableCopy = false }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      if (language && !isSpecialLang(language) && !(language in bundledLanguages)) {
        logger.warn(`Unsupported language '${language}'`);
      }

      logger.trace(`Language = ${language}`);

      const processCode = async () => {
        setHTML(await codeToHtml(code, { lang: language, theme }));
      };

      processCode();
    }, [code, language, theme]);

    const displayLanguage = language === 'plaintext' ? undefined : language;

    return (
      <div className={classNames(styles.CodeBlock, className)}>
        <div className={styles.CodeBlockHeader}>
          {displayLanguage && (
            <span className={styles.CodeBlockLanguage} data-language={displayLanguage}>
              {displayLanguage}
            </span>
          )}
          {!disableCopy && (
            <button
              className={classNames(styles.CopyButton, {
                [styles.CopyButtonCopied]: copied,
              })}
              onClick={copyToClipboard}
              aria-label={copied ? 'Copied' : 'Copy code'}
              title={copied ? 'Copied' : 'Copy code'}
            >
              {copied ? (
                <span className="i-ph:check text-lg" aria-hidden="true" />
              ) : (
                <span className="i-ph:clipboard-text-duotone text-lg" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        <div className={styles.CodeBlockContent} dangerouslySetInnerHTML={{ __html: html ?? '' }} />
      </div>
    );
  },
);
