/**
 * AI Provider Registry.
 * Strategy: singleton instance with immutable map after registration.
 * Easy to test, predictable, no dangerous mutable global state.
 */

import type { ProviderAdapter, ProviderId } from './types';
import { ProviderError } from './errors';

/**
 * Internal registry error (not exposed to user).
 */
export class ProviderRegistryError extends Error {
  readonly code: 'DUPLICATE_PROVIDER' | 'PROVIDER_NOT_FOUND' | 'INVALID_ADAPTER';

  constructor(code: 'DUPLICATE_PROVIDER' | 'PROVIDER_NOT_FOUND' | 'INVALID_ADAPTER', message: string) {
    super(message);
    this.name = 'ProviderRegistryError';
    this.code = code;
  }
}

/**
 * ProviderRegistry - Provider adapter registry.
 * Does not register providers automatically. Registration is explicit.
 */
export class ProviderRegistry {
  private _adapters = new Map<ProviderId, ProviderAdapter>();
  private _frozen = false;

  /**
   * Registers an adapter.
   * Throws error if duplicate ID or registry frozen.
   */
  register(adapter: ProviderAdapter): void {
    if (this._frozen) {
      throw new ProviderRegistryError(
        'DUPLICATE_PROVIDER',
        'Registry está congelado, não é possível registrar novos providers',
      );
    }

    if (this._adapters.has(adapter.id)) {
      throw new ProviderRegistryError('DUPLICATE_PROVIDER', `Provider "${adapter.id}" já está registrado`);
    }

    // basic adapter validation
    if (!adapter.id || !adapter.name || !Array.isArray(adapter.models)) {
      throw new ProviderRegistryError('INVALID_ADAPTER', 'Adapter inválido: id, name e models são obrigatórios');
    }

    // validate models
    for (const model of adapter.models) {
      if (!model.id || !model.providerId || !model.requiredEnvVar || !model.remoteModelId) {
        throw new ProviderRegistryError(
          'INVALID_ADAPTER',
          `Modelo "${model.id}" do provider "${adapter.id}" tem campos obrigatórios faltando`,
        );
      }
    }

    this._adapters.set(adapter.id, adapter);
  }

  /**
   * Freezes the registry preventing new registrations.
   * Useful after complete initialization.
   */
  freeze(): void {
    this._frozen = true;
  }

  /**
   * Checks if a provider is registered.
   */
  has(providerId: ProviderId): boolean {
    return this._adapters.has(providerId);
  }

  /**
   * Gets adapter by ID.
   * Throws normalized ProviderError if not found.
   */
  get(providerId: ProviderId): ProviderAdapter {
    const adapter = this._adapters.get(providerId);

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
   * Gets adapter by ID (safe version, returns undefined).
   */
  tryGet(providerId: ProviderId): ProviderAdapter | undefined {
    return this._adapters.get(providerId);
  }

  /**
   * Lists IDs of registered providers.
   */
  list(): readonly ProviderId[] {
    return Array.from(this._adapters.keys());
  }

  /**
   * Removes a provider (only if explicit).
   */
  remove(providerId: ProviderId): boolean {
    if (this._frozen) {
      return false;
    }

    return this._adapters.delete(providerId);
  }

  /**
   * Clears all providers (tests only).
   */
  clear(): void {
    if (this._frozen) {
      throw new ProviderRegistryError('DUPLICATE_PROVIDER', 'Registry congelado');
    }

    this._adapters.clear();
  }
}

/**
 * Singleton registry instance.
 * Exported for use across the server-side application.
 */
export const providerRegistry = new ProviderRegistry();
