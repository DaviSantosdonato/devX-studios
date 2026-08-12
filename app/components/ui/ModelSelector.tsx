import { useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';

export interface PublicModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  status: 'available' | 'unavailable' | 'experimental' | 'deprecated';
  isDefault: boolean;
  description?: string;
}

interface ModelsResponse {
  models: PublicModel[];
  defaultModelId: string;
}

const MODEL_PREFERENCE_KEY = 'devx:selected-model';

function getPersistedModel(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(MODEL_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

function setPersistedModel(modelId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(MODEL_PREFERENCE_KEY, modelId);
  } catch {
    // ignore
  }
}

interface ModelSelectorProps {
  /** Currently selected model ID */
  modelId?: string;

  /** Called when model selection changes */
  onChange?: (modelId: string) => void;

  /** Whether the selector is disabled (e.g., during streaming) */
  disabled?: boolean;

  /** Custom class name */
  className?: string;

  /** Whether to show provider name */
  showProvider?: boolean;

  /** ARIA label for the trigger button */
  ariaLabel?: string;
}

interface ModelsData {
  models: PublicModel[];
  defaultModelId: string;
  loading: boolean;
  error: Error | null;
}

export function ModelSelector({
  modelId: controlledModelId,
  onChange,
  disabled = false,
  className,
  showProvider = true,
  ariaLabel = 'Select AI model',
}: ModelSelectorProps) {
  const [modelsData, setModelsData] = useState<ModelsData>({
    models: [],
    defaultModelId: '',
    loading: true,
    error: null,
  });
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const highlightedIndexRef = useRef(-1);

  // determine effective model ID (controlled or from persistence)
  const effectiveModelId =
    controlledModelId ??
    modelsData.models.find((m) => m.id === getPersistedModel())?.id ??
    modelsData.defaultModelId ??
    '';

  // fetch models on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchModels() {
      try {
        const response = await fetch('/api/models');

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data: ModelsResponse = await response.json();

        if (!cancelled) {
          setModelsData({
            models: data.models,
            defaultModelId: data.defaultModelId,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setModelsData((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          }));
        }
      }
    }

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, []);

  // handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (triggerRef.current?.contains(event.target as Node)) {
        return;
      }

      if (listboxRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const availableModels = modelsData.models.filter((m) => m.available);

    switch (event.key) {
      case 'Escape': {
        setOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();

        if (!open) {
          setOpen(true);
          highlightedIndexRef.current = 0;
        } else {
          highlightedIndexRef.current = Math.min(highlightedIndexRef.current + 1, availableModels.length - 1);
        }

        break;
      }
      case 'ArrowUp': {
        event.preventDefault();

        if (open) {
          highlightedIndexRef.current = Math.max(highlightedIndexRef.current - 1, 0);
        }

        break;
      }
      case 'Enter':
      case ' ': {
        if (open && highlightedIndexRef.current >= 0) {
          event.preventDefault();

          const model = availableModels[highlightedIndexRef.current];

          if (model) {
            handleSelect(model.id);
          }
        } else {
          event.preventDefault();
          setOpen(true);
        }

        break;
      }
      case 'Tab': {
        setOpen(false);
        break;
      }
    }
  };

  const handleSelect = (selectedModelId: string) => {
    setPersistedModel(selectedModelId);
    onChange?.(selectedModelId);
    setOpen(false);
  };

  const selectedModel = modelsData.models.find((m) => m.id === effectiveModelId);

  // render loading state
  if (modelsData.loading) {
    return (
      <button
        ref={triggerRef}
        className={classNames(
          'devx-button devx-button--ghost devx-button--sm',
          'flex items-center gap-1.5 min-w-[180px] max-w-[280px]',
          className,
        )}
        disabled
        aria-label={ariaLabel}
        aria-disabled="true"
        type="button"
      >
        <span className="i-svg-spinners:90-ring-with-bg devx-icon--sm" aria-hidden="true" />
        <span className="devx-type-caption">Loading models…</span>
      </button>
    );
  }

  // render error state
  if (modelsData.error) {
    return (
      <button
        ref={triggerRef}
        className={classNames(
          'devx-button devx-button--ghost devx-button--sm',
          'flex items-center gap-1.5 min-w-[180px] max-w-[280px]',
          className,
        )}
        disabled
        aria-label={`${ariaLabel} (unavailable)`}
        aria-disabled="true"
        type="button"
      >
        <span className="i-ph:warning devx-icon--sm text-devx-elements-icon-error" aria-hidden="true" />
        <span className="devx-type-caption text-devx-elements-textTertiary">Models unavailable</span>
      </button>
    );
  }

  // no models available
  if (modelsData.models.length === 0) {
    return (
      <button
        ref={triggerRef}
        className={classNames(
          'devx-button devx-button--ghost devx-button--sm',
          'flex items-center gap-1.5 min-w-[180px] max-w-[280px]',
          className,
        )}
        disabled
        aria-label={`${ariaLabel} (none available)`}
        aria-disabled="true"
        type="button"
      >
        <span className="i-ph:cpu devx-icon--sm text-devx-elements-textTertiary" aria-hidden="true" />
        <span className="devx-type-caption text-devx-elements-textTertiary">No models</span>
      </button>
    );
  }

  const availableModels = modelsData.models.filter((m) => m.available);
  const unavailableModels = modelsData.models.filter((m) => !m.available);

  return (
    <div className={classNames('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        className={classNames(
          'devx-button devx-button--ghost devx-button--sm',
          'flex items-center gap-1.5 min-w-[180px] max-w-[280px] justify-between',
          { 'opacity-50': disabled },
        )}
        disabled={disabled || modelsData.models.length === 0}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="model-selector-listbox"
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selectedModel ? (
            <>
              <span className="devx-type-body-small truncate" title={selectedModel.name}>
                {selectedModel.name}
              </span>
              {showProvider && <span className="devx-badge text-[10px] px-1.5 py-0.5">{selectedModel.provider}</span>}
            </>
          ) : (
            <span className="devx-type-caption text-devx-elements-textTertiary">Select model</span>
          )}
        </span>
        <span
          className={classNames('devx-icon--sm flex-shrink-0 transition-transform', {
            'rotate-180': open,
          })}
          aria-hidden="true"
        >
          <span className="i-ph:caret-down" />
        </span>
      </button>

      {open && (
        <div
          ref={listboxRef}
          id="model-selector-listbox"
          role="listbox"
          aria-label="Available models"
          className="devx-popover absolute top-full left-0 z-max mt-1.5 w-[320px] max-h-[320px] overflow-y-auto"
        >
          {availableModels.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-medium text-devx-elements-textTertiary uppercase tracking-wider border-b border-devx-elements-borderColor">
                Available
              </div>
              {availableModels.map((model, index) => (
                <button
                  key={model.id}
                  role="option"
                  aria-selected={model.id === effectiveModelId}
                  className={classNames(
                    'w-full flex items-center gap-2 px-3 py-2 text-left',
                    'devx-type-body-small',
                    model.id === effectiveModelId
                      ? 'devx-selected text-devx-elements-textPrimary'
                      : 'text-devx-elements-textSecondary hover:text-devx-elements-textPrimary',
                    'hover:bg-devx-elements-bg-depth-3',
                  )}
                  onClick={() => handleSelect(model.id)}
                  onMouseEnter={() => (highlightedIndexRef.current = index)}
                >
                  <span className="flex-1 truncate" title={model.name}>
                    {model.name}
                  </span>
                  {showProvider && (
                    <span className="devx-badge text-[10px] px-1.5 py-0.5 flex-shrink-0">{model.provider}</span>
                  )}
                  {model.isDefault && (
                    <span className="devx-badge text-[10px] px-1.5 py-0.5 flex-shrink-0">Default</span>
                  )}
                </button>
              ))}
            </>
          )}

          {unavailableModels.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-medium text-devx-elements-textTertiary uppercase tracking-wider border-b border-devx-elements-borderColor">
                Unavailable
              </div>
              {unavailableModels.map((model) => (
                <button
                  key={model.id}
                  role="option"
                  aria-selected={false}
                  aria-disabled="true"
                  disabled
                  className={classNames(
                    'w-full flex items-center gap-2 px-3 py-2 text-left',
                    'devx-type-body-small',
                    'text-devx-elements-textDisabled',
                    'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="flex-1 truncate" title={model.name}>
                    {model.name}
                  </span>
                  {showProvider && (
                    <span className="devx-badge text-[10px] px-1.5 py-0.5 flex-shrink-0">{model.provider}</span>
                  )}
                  <span className="devx-badge text-[10px] px-1.5 py-0.5 flex-shrink-0 text-devx-elements-textTertiary">
                    Unavailable
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
