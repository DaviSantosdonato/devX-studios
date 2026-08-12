import type { ModelDefinition } from '~/lib/.server/llm/types';

/**
 * Public model information exposed to the client.
 * Only contains safe, non-sensitive metadata.
 */
export interface PublicModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  status: 'available' | 'unavailable' | 'experimental' | 'deprecated';
  isDefault: boolean;
  description?: string;
}

/**
 * Sanitizes a server-side ModelDefinition into a client-safe PublicModel.
 * Uses explicit allowlist - no spreading or deletion of secrets.
 */
export function toPublicModel(model: ModelDefinition): PublicModel {
  const requiredEnvVar = model.requiredEnvVar;
  let available = false;

  // check if API key is configured (server-side only check)
  if (typeof process !== 'undefined' && process.env && requiredEnvVar in process.env) {
    const value = process.env[requiredEnvVar];

    if (value && value.trim() !== '') {
      available = true;
    }
  }

  return {
    id: model.id,
    name: model.name,
    provider: model.providerId,
    available,
    status: model.status,
    isDefault: model.isDefault,
    description: model.description,
  };
}
