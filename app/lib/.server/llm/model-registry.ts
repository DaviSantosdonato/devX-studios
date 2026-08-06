/**
 * Catálogo de modelos de IA.
 * Gerencia definições de modelos, validações e consultas.
 */

import type {
  ModelDefinition,
  ModelStatus,
  ProviderId,
  ProviderErrorCode,
  ProviderError,
  ModelCapabilities,
} from './types';

/**
 * Erro interno do model registry.
 */
export class ModelRegistryError extends Error {
  public readonly code:
    | 'DUPLICATE_MODEL'
    | 'MODEL_NOT_FOUND'
    | 'INVALID_MODEL'
    | 'DUPLICATE_DEFAULT'
    | 'UNKNOWN_PROVIDER';

  constructor(
    code: 'DUPLICATE_MODEL' | 'MODEL_NOT_FOUND' | 'INVALID_MODEL' | 'DUPLICATE_DEFAULT' | 'UNKNOWN_PROVIDER',
    message: string
  ) {
    super(message);
    this.name = 'ModelRegistryError';
    this.code = code;
  }
}

/**
 * Lista de ProviderIds conhecidos conceitualmente.
 * Usada para validação sem requerer registro prévio do provider.
 */
export const KNOWN_PROVIDER_IDS: readonly ProviderId[] = [
  'anthropic',
  'openai',
  'google',
  'openai-compatible',
  'local',
] as const;

/**
 * ModelRegistry - Catálogo de modelos.
 * Validações estritas para evitar inconsistências.
 */
export class ModelRegistry {
  private models = new Map<string, ModelDefinition>();
  private defaults = new Map<ProviderId, string>(); // providerId -> default modelId

  /**
   * Registra um modelo.
   * Validações:
   * - ID único
   * - ProviderId conhecido
   * - Campos obrigatórios
   * - No máximo um default por provider
   */
  register(model: ModelDefinition): void {
    // ID único
    if (this.models.has(model.id)) {
      throw new ModelRegistryError(
        'DUPLICATE_MODEL',
        `Modelo com ID "${model.id}" já está registrado`
      );
    }

    // ProviderId conhecido
    if (!KNOWN_PROVIDER_IDS.includes(model.providerId)) {
      throw new ModelRegistryError(
        'UNKNOWN_PROVIDER',
        `ProviderId "${model.providerId}" não reconhecido. Conhecidos: ${KNOWN_PROVIDER_IDS.join(', ')}`
      );
    }

    // Campos obrigatórios
    if (!model.id || !model.name || !model.providerId || !model.requiredEnvVar || !model.remoteModelId) {
      throw new ModelRegistryError(
        'INVALID_MODEL',
        `Modelo "${model.id}" tem campos obrigatórios faltando`
      );
    }

    // Valida capabilities
    if (!model.capabilities || typeof model.capabilities !== 'object') {
      throw new ModelRegistryError(
        'INVALID_MODEL',
        `Modelo "${model.id}" deve ter capabilities válidas`
      );
    }

    // Valida status
    const validStatuses: ModelStatus[] = ['available', 'unavailable', 'experimental', 'deprecated'];
    if (!validStatuses.includes(model.status)) {
      throw new ModelRegistryError(
        'INVALID_MODEL',
        `Modelo "${model.id}" tem status inválido: ${model.status}`
      );
    }

    // Default único por provider
    if (model.isDefault) {
      const existingDefault = this.defaults.get(model.providerId);
      if (existingDefault && existingDefault !== model.id) {
        throw new ModelRegistryError(
          'DUPLICATE_DEFAULT',
          `Já existe modelo padrão para provider "${model.providerId}": "${existingDefault}"`
        );
      }
      this.defaults.set(model.providerId, model.id);
    }

    this.models.set(model.id, model);
  }

  /**
   * Busca modelo por ID interno.
   * Lança erro se não encontrado.
   */
  get(modelId: string): ModelDefinition {
    const model = this.models.get(modelId);
    if (!model) {
      const error = new Error(`Modelo "${modelId}" não encontrado`) as any;
      error.code = 'MODEL_NOT_FOUND';
      throw error;
    }
    return model;
  }

  /**
   * Busca modelo por ID (versão segura).
   */
  tryGet(modelId: string): ModelDefinition | undefined {
    return this.models.get(modelId);
  }

  /**
   * Lista todos os modelos registrados.
   */
  list(): readonly ModelDefinition[] {
    return Array.from(this.models.values());
  }

  /**
   * Filtra modelos por provider.
   */
  getByProvider(providerId: ProviderId): readonly ModelDefinition[] {
    return this.list().filter((m) => m.providerId === providerId);
  }

  /**
   * Filtra modelos por status.
   */
  getByStatus(status: ModelStatus): readonly ModelDefinition[] {
    return this.list().filter((m) => m.status === status);
  }

  /**
   * Obtém modelo padrão de um provider.
   * Lança erro se não houver default.
   */
  getDefault(providerId: ProviderId): ModelDefinition {
    const defaultId = this.defaults.get(providerId);
    if (!defaultId) {
      const error = new Error(`Nenhum modelo padrão definido para provider "${providerId}"`) as any;
      error.code = 'MODEL_NOT_FOUND';
      throw error;
    }
    return this.get(defaultId);
  }

  /**
   * Tenta obter modelo padrão (versão segura).
   */
  tryGetDefault(providerId: ProviderId): ModelDefinition | undefined {
    const defaultId = this.defaults.get(providerId);
    return defaultId ? this.tryGet(defaultId) : undefined;
  }

  /**
   * Verifica se modelo existe.
   */
  has(modelId: string): boolean {
    return this.models.has(modelId);
  }

  /**
   * Remove modelo (apenas para testes).
   */
  remove(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    if (model.isDefault) {
      this.defaults.delete(model.providerId);
    }
    return this.models.delete(modelId);
  }

  /**
   * Limpa todos os modelos (apenas para testes).
   */
  clear(): void {
    this.models.clear();
    this.defaults.clear();
  }

  /**
   * Retorna contagem de modelos.
   */
  size(): number {
    return this.models.size;
  }
}

/**
 * Instância singleton do registry.
 */
export const modelRegistry = new ModelRegistry();