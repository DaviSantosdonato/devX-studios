import { AnimatePresence, motion } from 'framer-motion';

import styles from './SendButton.client.module.scss';

interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  disabled?: boolean;
}

export function SendButton({ show, isStreaming, onClick, disabled = false }: SendButtonProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          className={styles.SendButton}
          data-streaming={isStreaming}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
          disabled={disabled}
          aria-label={isStreaming ? 'Stop generation' : 'Send prompt'}
        >
          <span className={styles.SendButtonIcon} aria-hidden="true">
            {!isStreaming ? <span className="i-ph:arrow-up-right-bold" /> : <span className="i-ph:stop-circle-bold" />}
          </span>
          <span className={styles.SendButtonLabel}>{isStreaming ? 'Stop' : 'Send'}</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
