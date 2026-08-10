import { memo, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '~/utils/classNames';

interface PanelHeaderButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  disabledClassName?: string;
  children: ReactNode;
}

export const PanelHeaderButton = memo(
  ({ className, disabledClassName, disabled = false, children, onClick, ...props }: PanelHeaderButtonProps) => {
    return (
      <button
        className={classNames(
          'devx-panel-header-button',
          {
            [classNames('opacity-30', disabledClassName)]: disabled,
          },
          className,
        )}
        disabled={disabled}
        type="button"
        {...props}
        onClick={(event) => {
          if (disabled) {
            return;
          }

          onClick?.(event);
        }}
      >
        {children}
      </button>
    );
  },
);
