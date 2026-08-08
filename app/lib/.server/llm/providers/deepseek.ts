import { createOpenAICompatibleModel } from '~/lib/.server/llm/providers/openai-compatible';
import type { ProviderConfiguration, ModelDefinition, ModelCapabilities } from '~/lib/.server/llm/types';
import { normalizeProviderError, createProviderError } from '~/lib/.server/llm/errors';

export const DEEPSEEK_PROVIDER_ID = 'deepseek' as const;
export const DEEPSEEK_PROVIDER_NAME = 'DeepSeek' as const;

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_MODEL_ID = 'deepseek-v4-flash';
export const DEEPSEEK_REMOTE_ID = 'deepseek-v4-flash';

const DEEPSEEK_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: false,
  reasoning: true,
  systemPrompt: true,
  maximumContextTokens: 1000000,
  maximumOutputTokens: 384000,
};

export const DEEPSEEK_MODELS: readonly ModelDefinition[] = [
  {
    id: DEEPSEEK_MODEL_ID,
    name: 'DeepSeek V4 Flash',
    providerId: 'deepseek',
    capabilities: DEEPSEEK_MODEL_CAPABILITIES,
    status: 'available',
    requiredEnvVar: 'DEEPSEEK_API_KEY',
    remoteModelId: DEEPSEEK_REMOTE_ID,
    isDefault: false,
    description: 'DeepSeek V4 Flash - Fast and efficient model',
  },
] as const;

export class DeepSeekProviderAdapter {
  readonly id = 'deepseek' as const;
  readonly name = DEEPSEEK_PROVIDER_NAME;
  readonly models = DEEPSEEK_MODELS;

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    // deepseek requires explicit baseURL
    if (!config.baseURL || config.baseURL.trim() === '') {
      return false;
    }

    // validate baseURL is DeepSeek's API
    if (!config.baseURL.includes('deepseek.com')) {
      return false;
    }

    return true;
  }

  createModel(config: ProviderConfiguration, modelId: string) {
    const model = this.models.find((m) => m.id === modelId);

    if (!model) {
      throw new Error(`Model "${modelId}" not found in DeepSeek provider`);
    }

    // deepseek adapter provides its own baseURL
    return createOpenAICompatibleModel(
      {
        ...config,
        baseURL: DEEPSEEK_BASE_URL,
      },
      model.remoteModelId,
    );
  }

  normalizeError(error: unknown, modelId: string) {
    const normalized = normalizeProviderError(error, 'deepseek', modelId);
    return createProviderError('deepseek', modelId, normalized);
  }

  getCapabilities(modelId: string) {
    const model = this.models.find((m) => m.id === modelId);
    return model?.capabilities;
  }

  getStreamOptions(_modelId: string): Record<string, string> | undefined {
    return undefined;
  }
}

export const deepseekAdapter = new DeepSeekProviderAdapter();
