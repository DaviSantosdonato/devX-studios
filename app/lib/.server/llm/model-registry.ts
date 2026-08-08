import type { ModelDefinition, ModelStatus, ProviderId } from './types';

/**
 * Internal model registry error.
 */
export class ModelRegistryError extends Error {
  readonly code: 'DUPLICATE_MODEL' | 'MODEL_NOT_FOUND' | 'INVALID_MODEL' | 'DUPLICATE_DEFAULT' | 'UNKNOWN_PROVIDER';

  constructor(
    code: 'DUPLICATE_MODEL' | 'MODEL_NOT_FOUND' | 'INVALID_MODEL' | 'DUPLICATE_DEFAULT' | 'UNKNOWN_PROVIDER',
    message: string,
  ) {
    super(message);
    this.name = 'ModelRegistryError';
    this.code = code;
  }
}

/**
 * List of known ProviderIds conceptually.
 * Used for validation without requiring provider registration.
 */
export const KNOWN_PROVIDER_IDS: readonly ProviderId[] = [
  'anthropic',
  'deepseek',
  'nvidia',
  'openai',
  'google',
  'openai-compatible',
  'local',
] as const;

/**
 * ModelRegistry - Model catalog.
 * Strict validations to avoid inconsistencies.
 */
export class ModelRegistry {
  private _models = new Map<string, ModelDefinition>();
  private _defaults = new Map<ProviderId, string>(); // providerId -> default modelId

  /**
   * Registers a model.
   * Validations:
   * - Unique ID
   * - Known ProviderId
   * - Required fields
   * - At most one default per provider
   */
  register(model: ModelDefinition): void {
    // unique ID
    if (this._models.has(model.id)) {
      throw new ModelRegistryError('DUPLICATE_MODEL', `Modelo com ID "${model.id}" já está registrado`);
    }

    // known ProviderId
    if (!KNOWN_PROVIDER_IDS.includes(model.providerId)) {
      throw new ModelRegistryError(
        'UNKNOWN_PROVIDER',
        `ProviderId "${model.providerId}" não reconhecido. Conhecidos: ${KNOWN_PROVIDER_IDS.join(', ')}`,
      );
    }

    // required fields
    if (!model.id || !model.name || !model.providerId || !model.requiredEnvVar || !model.remoteModelId) {
      throw new ModelRegistryError('INVALID_MODEL', `Modelo "${model.id}" tem campos obrigatórios faltando`);
    }

    // validate capabilities
    if (!model.capabilities || typeof model.capabilities !== 'object') {
      throw new ModelRegistryError('INVALID_MODEL', `Modelo "${model.id}" deve ter capabilities válidas`);
    }

    // validate status
    const validStatuses: ModelStatus[] = ['available', 'unavailable', 'experimental', 'deprecated'];

    if (!validStatuses.includes(model.status)) {
      throw new ModelRegistryError('INVALID_MODEL', `Modelo "${model.id}" tem status inválido: ${model.status}`);
    }

    // default unique per provider
    if (model.isDefault) {
      const existingDefault = this._defaults.get(model.providerId);

      if (existingDefault && existingDefault !== model.id) {
        throw new ModelRegistryError(
          'DUPLICATE_DEFAULT',
          `Já existe modelo padrão para provider "${model.providerId}": "${existingDefault}"`,
        );
      }

      this._defaults.set(model.providerId, model.id);
    }

    this._models.set(model.id, model);
  }

  /**
   * Gets model by internal ID.
   * Throws error if not found.
   */
  get(modelId: string): ModelDefinition {
    const model = this._models.get(modelId);

    if (!model) {
      const error = new Error(`Modelo "${modelId}" não encontrado`);
      (error as Error & { code?: string }).code = 'MODEL_NOT_FOUND';
      throw error;
    }

    return model;
  }

  /**
   * Gets model by ID (safe version).
   */
  tryGet(modelId: string): ModelDefinition | undefined {
    return this._models.get(modelId);
  }

  /**
   * Lists all registered models.
   */
  list(): readonly ModelDefinition[] {
    return Array.from(this._models.values());
  }

  /**
   * Filters models by provider.
   */
  getByProvider(providerId: ProviderId): readonly ModelDefinition[] {
    return this.list().filter((m) => m.providerId === providerId);
  }

  /**
   * Filters models by status.
   */
  getByStatus(status: ModelStatus): readonly ModelDefinition[] {
    return this.list().filter((m) => m.status === status);
  }

  /**
   * Gets default model for provider.
   * Throws error if no default.
   */
  getDefault(providerId: ProviderId): ModelDefinition {
    const defaultId = this._defaults.get(providerId);

    if (!defaultId) {
      const error = new Error(`Nenhum modelo padrão definido para provider "${providerId}"`);
      (error as Error & { code?: string }).code = 'MODEL_NOT_FOUND';
      throw error;
    }

    return this.get(defaultId);
  }

  /**
   * Tries to get default model (safe version).
   */
  tryGetDefault(providerId: ProviderId): ModelDefinition | undefined {
    const defaultId = this._defaults.get(providerId);
    return defaultId ? this.tryGet(defaultId) : undefined;
  }

  /**
   * Checks if model exists.
   */
  has(modelId: string): boolean {
    return this._models.has(modelId);
  }

  /**
   * Removes model (tests only).
   */
  remove(modelId: string): boolean {
    const model = this._models.get(modelId);

    if (!model) {
      return false;
    }

    if (model.isDefault) {
      this._defaults.delete(model.providerId);
    }

    return this._models.delete(modelId);
  }

  /**
   * Clears all models (tests only).
   */
  clear(): void {
    this._models.clear();
    this._defaults.clear();
  }

  /**
   * Returns model count.
   */
  size(): number {
    return this._models.size;
  }
}

/**
 * Singleton registry instance.
 */
export const modelRegistry = new ModelRegistry();
