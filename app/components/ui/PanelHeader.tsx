import { memo, type HTMLAttributes } from 'react';
import { classNames } from '~/utils/classNames';

interface PanelHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PanelHeader = memo(({ className, children, ...props }: PanelHeaderProps) => {
  return (
    <div className={classNames('devx-panel-header', className)} {...props}>
      {children}
    </div>
  );
});
