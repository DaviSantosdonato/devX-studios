import { memo, type KeyboardEvent } from 'react';
import { classNames } from '~/utils/classNames';
import { genericMemo } from '~/utils/react';

interface SliderOption<T> {
  value: T;
  text: string;
  icon?: string;
  tabId?: string;
  panelId?: string;
}

export interface SliderOptions<T> {
  left: SliderOption<T>;
  right: SliderOption<T>;
}

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected?: (selected: T) => void;
  ariaLabel?: string;
}

export const Slider = genericMemo(<T,>({ selected, options, setSelected, ariaLabel = 'Views' }: SliderProps<T>) => {
  const isLeftSelected = selected === options.left.value;

  return (
    <div className="devx-tabs" role="tablist" aria-label={ariaLabel}>
      <SliderButton
        selected={isLeftSelected}
        id={options.left.tabId}
        controls={options.left.panelId}
        setSelected={() => setSelected?.(options.left.value)}
      >
        {options.left.icon ? (
          <span className={classNames(options.left.icon, 'devx-icon--sm')} aria-hidden="true" />
        ) : null}
        <span>{options.left.text}</span>
      </SliderButton>
      <SliderButton
        selected={!isLeftSelected}
        id={options.right.tabId}
        controls={options.right.panelId}
        setSelected={() => setSelected?.(options.right.value)}
      >
        {options.right.icon ? (
          <span className={classNames(options.right.icon, 'devx-icon--sm')} aria-hidden="true" />
        ) : null}
        <span>{options.right.text}</span>
      </SliderButton>
    </div>
  );
});

interface SliderButtonProps {
  selected: boolean;
  id?: string;
  controls?: string;
  children: React.ReactNode;
  setSelected: () => void;
}

const SliderButton = memo(({ selected, id, controls, children, setSelected }: SliderButtonProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();

    const tabs = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const currentIndex = tabs.indexOf(event.currentTarget);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];

    nextTab?.focus();
    nextTab?.click();
  };

  return (
    <button
      id={id}
      role="tab"
      type="button"
      aria-controls={controls}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-active={selected}
      onClick={setSelected}
      onKeyDown={handleKeyDown}
      className="devx-tab"
    >
      {children}
    </button>
  );
});
