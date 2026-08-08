import { createOpenAICompatibleModel } from '~/lib/.server/llm/providers/openai-compatible';
import type {
  ModelCapabilities,
  ModelDefinition,
  ProviderAdapter,
  ProviderConfiguration,
} from '~/lib/.server/llm/types';
import { createProviderError, normalizeProviderError, ProviderError } from '~/lib/.server/llm/errors';

export const GEMINI_PROVIDER_ID = 'gemini' as const;
export const GEMINI_PROVIDER_NAME = 'Google Gemini' as const;

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
export const GEMINI_MODEL_ID = 'gemini-3.6-flash';
export const GEMINI_REMOTE_ID = 'gemini-3.6-flash';

const GEMINI_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: true,
  reasoning: true,
  systemPrompt: true,
  maximumContextTokens: 1048576,
  maximumOutputTokens: 65536,
};

export const GEMINI_MODELS: readonly ModelDefinition[] = [
  {
    id: GEMINI_MODEL_ID,
    name: 'Gemini 3.6 Flash',
    providerId: GEMINI_PROVIDER_ID,
    capabilities: GEMINI_MODEL_CAPABILITIES,
    status: 'available',
    requiredEnvVar: 'GEMINI_API_KEY',
    remoteModelId: GEMINI_REMOTE_ID,
    isDefault: false,
    description: 'Google Gemini 3.6 Flash - Fast multimodal reasoning model',
  },
] as const;

export class GeminiProviderAdapter implements ProviderAdapter {
  readonly id = GEMINI_PROVIDER_ID;
  readonly name = GEMINI_PROVIDER_NAME;
  readonly models = GEMINI_MODELS;

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!config.baseURL || config.baseURL.trim() === '') {
      return false;
    }

    try {
      const url = new URL(config.baseURL);
      const expected = new URL(GEMINI_BASE_URL);

      return (
        url.protocol === 'https:' &&
        url.hostname === 'generativelanguage.googleapis.com' &&
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
        message: `Model "${modelId}" not found in Gemini provider`,
        retryable: false,
      });
    }

    return createOpenAICompatibleModel(
      {
        ...config,
        baseURL: GEMINI_BASE_URL,
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

export const geminiAdapter = new GeminiProviderAdapter();
