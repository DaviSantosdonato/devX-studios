import { createOpenAICompatibleModel } from '~/lib/.server/llm/providers/openai-compatible';
import type { ProviderConfiguration, ModelDefinition, ModelCapabilities } from '~/lib/.server/llm/types';
import { normalizeProviderError, createProviderError } from '~/lib/.server/llm/errors';

export const NVIDIA_PROVIDER_ID = 'nvidia' as const;
export const NVIDIA_PROVIDER_NAME = 'NVIDIA NIM' as const;

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const NVIDIA_MODEL_ID = 'nemotron-3-ultra-550b-a55b';
export const NVIDIA_REMOTE_ID = 'nvidia/nemotron-3-ultra-550b-a55b';

const NVIDIA_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: false,
  reasoning: true,
  systemPrompt: true,
  maximumContextTokens: 1000000,
  maximumOutputTokens: 32768,
};

export const NVIDIA_MODELS: readonly ModelDefinition[] = [
  {
    id: NVIDIA_MODEL_ID,
    name: 'Nemotron 3 Ultra 550B',
    providerId: 'nvidia',
    capabilities: NVIDIA_MODEL_CAPABILITIES,
    status: 'available',
    requiredEnvVar: 'NVIDIA_API_KEY',
    remoteModelId: NVIDIA_REMOTE_ID,
    isDefault: false,
    description: 'Nemotron 3 Ultra 550B - High-performance reasoning model',
  },
] as const;

export class NvidiaNimProviderAdapter {
  readonly id = 'nvidia' as const;
  readonly name = NVIDIA_PROVIDER_NAME;
  readonly models = NVIDIA_MODELS;

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    // nvidia requires explicit baseURL
    if (!config.baseURL || config.baseURL.trim() === '') {
      return false;
    }

    // validate baseURL is NVIDIA NIM endpoint
    try {
      const url = new URL(config.baseURL);

      if (url.hostname !== 'integrate.api.nvidia.com') {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  createModel(config: ProviderConfiguration, modelId: string) {
    const model = this.models.find((m) => m.id === modelId);

    if (!model) {
      throw new Error(`Model "${modelId}" not found in NVIDIA provider`);
    }

    // nvidia adapter provides its own baseURL
    return createOpenAICompatibleModel(
      {
        ...config,
        baseURL: NVIDIA_BASE_URL,
      },
      model.remoteModelId,
    );
  }

  normalizeError(error: unknown, modelId: string) {
    const normalized = normalizeProviderError(error, 'nvidia', modelId);
    return createProviderError('nvidia', modelId, normalized);
  }

  getCapabilities(modelId: string) {
    const model = this.models.find((m) => m.id === modelId);
    return model?.capabilities;
  }

  getStreamOptions(_modelId: string): Record<string, string> | undefined {
    return undefined;
  }
}

export const nvidiaAdapter = new NvidiaNimProviderAdapter();
