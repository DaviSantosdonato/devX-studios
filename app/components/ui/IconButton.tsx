import { memo } from 'react';
import { classNames } from '~/utils/classNames';

type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface BaseIconButtonProps {
  size?: IconSize;
  className?: string;
  iconClassName?: string;
  disabledClassName?: string;
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

type IconButtonWithoutChildrenProps = {
  icon: string;
  children?: undefined;
} & BaseIconButtonProps;

type IconButtonWithChildrenProps = {
  icon?: undefined;
  children: string | JSX.Element | JSX.Element[];
} & BaseIconButtonProps;

type IconButtonProps = IconButtonWithoutChildrenProps | IconButtonWithChildrenProps;

export const IconButton = memo(
  ({
    icon,
    size = 'lg',
    className,
    iconClassName,
    disabledClassName,
    disabled = false,
    title,
    onClick,
    children,
  }: IconButtonProps) => {
    return (
      <button
        className={classNames(
          'devx-icon-button',
          {
            [classNames('opacity-30', disabledClassName)]: disabled,
          },
          className,
        )}
        title={title}
        aria-label={title}
        type="button"
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }

          onClick?.(event);
        }}
      >
        {children ? children : <div className={classNames(icon, getIconSize(size), iconClassName)}></div>}
      </button>
    );
  },
);

function getIconSize(size: IconSize) {
  if (size === 'sm') {
    return 'devx-icon--sm';
  } else if (size === 'md') {
    return 'devx-icon--md';
  } else if (size === 'lg') {
    return 'devx-icon--lg';
  } else if (size === 'xl') {
    return 'devx-icon--xl';
  } else {
    return 'devx-icon--xl';
  }
}
