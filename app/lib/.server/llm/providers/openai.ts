import { createOpenAICompatibleModel } from '~/lib/.server/llm/providers/openai-compatible';
import type {
  ModelCapabilities,
  ModelDefinition,
  ProviderAdapter,
  ProviderConfiguration,
} from '~/lib/.server/llm/types';
import { createProviderError, normalizeProviderError, ProviderError } from '~/lib/.server/llm/errors';

export const OPENAI_PROVIDER_ID = 'openai' as const;
export const OPENAI_PROVIDER_NAME = 'OpenAI' as const;

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const OPENAI_MODEL_ID = 'gpt-5.6-terra';
export const OPENAI_REMOTE_ID = 'gpt-5.6-terra';

const OPENAI_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: true,
  reasoning: true,
  systemPrompt: true,
  maximumContextTokens: 1050000,
  maximumOutputTokens: 128000,
};

export const OPENAI_MODELS: readonly ModelDefinition[] = [
  {
    id: OPENAI_MODEL_ID,
    name: 'GPT-5.6 Terra',
    providerId: OPENAI_PROVIDER_ID,
    capabilities: OPENAI_MODEL_CAPABILITIES,
    status: 'available',
    requiredEnvVar: 'OPENAI_API_KEY',
    remoteModelId: OPENAI_REMOTE_ID,
    isDefault: false,
    description: 'OpenAI GPT-5.6 Terra - Balanced intelligence and cost',
  },
] as const;

export class OpenAIProviderAdapter implements ProviderAdapter {
  readonly id = OPENAI_PROVIDER_ID;
  readonly name = OPENAI_PROVIDER_NAME;
  readonly models = OPENAI_MODELS;

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!config.baseURL || config.baseURL.trim() === '') {
      return false;
    }

    try {
      const url = new URL(config.baseURL);
      const expected = new URL(OPENAI_BASE_URL);

      return (
        url.protocol === 'https:' &&
        url.hostname === 'api.openai.com' &&
        url.port === '' &&
        url.username === '' &&
        url.password === '' &&
        url.pathname === expected.pathname &&
        url.search === '' &&
        url.hash === ''
      );
    } catch {
      return false;
    }
  }

  createModel(config: ProviderConfiguration, modelId: string) {
    const model = this.models.find((candidate) => candidate.id === modelId);

    if (!model) {
      throw new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: this.id,
        modelId,
        message: `Model "${modelId}" not found in OpenAI provider`,
        retryable: false,
      });
    }

    return createOpenAICompatibleModel(
      {
        ...config,
        baseURL: OPENAI_BASE_URL,
      },
      model.remoteModelId,
    );
  }

  normalizeError(error: unknown, modelId: string): ProviderError {
    const normalized = normalizeProviderError(error, this.id, modelId);
    return createProviderError(this.id, modelId, normalized);
  }

  getCapabilities(modelId: string): ModelCapabilities | undefined {
    return this.models.find((model) => model.id === modelId)?.capabilities;
  }

  getStreamOptions(_modelId: string): Record<string, string> | undefined {
    return undefined;
  }
}

export const openaiAdapter = new OpenAIProviderAdapter();
