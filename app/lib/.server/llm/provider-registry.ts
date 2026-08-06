/**
 * Registro de provedores de IA.
 * Estratégia: instância única (singleton) com mapa imutável após registro.
 * Fácil de testar, previsível, sem estado global mutável perigoso.
 */

import type { ProviderAdapter, ProviderId, ProviderConfiguration, ModelDefinition, ModelCapabilities } from './types';
import { ProviderError } from './types';

/**
 * Erro interno do registry (não exposto ao usuário).
 */
export class ProviderRegistryError extends Error {
  public readonly code: 'DUPLICATE_PROVIDER' | 'PROVIDER_NOT_FOUND' | 'INVALID_ADAPTER';

  constructor(code: 'DUPLICATE_PROVIDER' | 'PROVIDER_NOT_FOUND' | 'INVALID_ADAPTER', message: string) {
    super(message);
    this.name = 'ProviderRegistryError';
    this.code = code;
  }
}

/**
 * ProviderRegistry - Registro de adapters de provedores.
 * Não registra provedores automaticamente. O registro é explícito.
 */
export class ProviderRegistry {
  private adapters = new Map<ProviderId, ProviderAdapter>();
  private frozen = false;

  /**
   * Registra um adapter.
   * Lança erro se ID duplicado ou registry congelado.
   */
  register(adapter: ProviderAdapter): void {
    if (this.frozen) {
      throw new ProviderRegistryError('DUPLICATE_PROVIDER', 'Registry está congelado, não é possível registrar novos providers');
    }

    if (this.adapters.has(adapter.id)) {
      throw new ProviderRegistryError(
        'DUPLICATE_PROVIDER',
        `Provider "${adapter.id}" já está registrado`
      );
    }

    // Validação básica do adapter
    if (!adapter.id || !adapter.name || !Array.isArray(adapter.models)) {
      throw new ProviderRegistryError(
        'INVALID_ADAPTER',
        'Adapter inválido: id, name e models são obrigatórios'
      );
    }

    // Valida modelos
    for (const model of adapter.models) {
      if (!model.id || !model.providerId || !model.requiredEnvVar || !model.remoteModelId) {
        throw new ProviderRegistryError(
          'INVALID_ADAPTER',
          `Modelo "${model.id}" do provider "${adapter.id}" tem campos obrigatórios faltando`
        );
      }
    }

    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Congela o registry impedindo novos registros.
   * Útil após inicialização completa.
   */
  freeze(): void {
    this.frozen = true;
  }

  /**
   * Verifica se um provider está registrado.
   */
  has(providerId: ProviderId): boolean {
    return this.adapters.has(providerId);
  }

  /**
   * Busca adapter por ID.
   * Lança ProviderError normalizado se não encontrado.
   */
  get(providerId: ProviderId): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new ProviderError({
        code: 'UNKNOWN_PROVIDER_ERROR',
        providerId,
        message: `Provider "${providerId}" não registrado`,
        retryable: false,
      });
    }
    return adapter;
  }

  /**
   * Busca adapter por ID (versão segura, retorna undefined).
   */
  tryGet(providerId: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * Lista IDs dos providers registrados.
   */
  list(): readonly ProviderId[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Remove um provider (apenas se explícito).
   */
  remove(providerId: ProviderId): boolean {
    if (this.frozen) {
      return false;
    }
    return this.adapters.delete(providerId);
  }

  /**
   * Limpa todos os providers (apenas para testes).
   */
  clear(): void {
    if (this.frozen) {
      throw new ProviderRegistryError('DUPLICATE_PROVIDER', 'Registry congelado');
    }
    this.adapters.clear();
  }
}

/**
 * Instância singleton do registry.
 * Exportada para uso em toda a aplicação server-side.
 */
export const providerRegistry = new ProviderRegistry();