import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type {
  ProviderAdapter,
  ProviderConfiguration,
  ModelDefinition,
  ModelCapabilities,
} from '~/lib/.server/llm/types';
import { ProviderError, normalizeProviderError, createProviderError } from '~/lib/.server/llm/errors';

/**
 * Default capabilities for OpenAI-compatible models.
 * Can be overridden by specific provider adapters.
 */
export const DEFAULT_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: false,
  reasoning: false,
  systemPrompt: true,
  maximumContextTokens: 128000,
  maximumOutputTokens: 4096,
};

/**
 * Creates an OpenAI-compatible model using the Vercel AI SDK.
 * This is a helper for providers that use OpenAI-compatible APIs.
 *
 * @param config - Provider configuration (apiKey, baseURL, headers, timeout)
 * @param modelId - Remote model ID
 * @returns LanguageModel compatible with Vercel AI SDK
 */
export function createOpenAICompatibleModel(config: ProviderConfiguration, modelId: string): LanguageModel {
  // baseURL is required - no default to any specific provider
  if (!config.baseURL || config.baseURL.trim() === '') {
    throw new Error('baseURL is required for OpenAI-compatible provider');
  }

  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: config.headers,
  });

  return openai.chat(modelId);
}

export class OpenAICompatibleProviderAdapter implements ProviderAdapter {
  readonly id = 'openai-compatible';
  readonly name = 'OpenAI Compatible';
  readonly models: readonly ModelDefinition[] = [];

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!config.baseURL || config.baseURL.trim() === '') {
      return false;
    }

    return true;
  }

  createModel(config: ProviderConfiguration, modelId: string): LanguageModel {
    return createOpenAICompatibleModel(config, modelId);
  }

  normalizeError(error: unknown, modelId: string): ProviderError {
    const normalized = normalizeProviderError(error, this.id, modelId);
    return createProviderError(this.id, modelId, normalized);
  }

  getCapabilities(_modelId: string): ModelCapabilities | undefined {
    return DEFAULT_MODEL_CAPABILITIES;
  }
}

/**
 * Creates a generic OpenAI-compatible model factory.
 * This is a helper for providers that use OpenAI-compatible APIs.
 *
 * @param config - Provider configuration (apiKey, baseURL, headers, timeout)
 * @param modelId - Remote model ID
 * @returns LanguageModel compatible with Vercel AI SDK
 */
export function createGenericOpenAICompatibleModel(
  config: ProviderConfiguration,
  modelId: string,
  _capabilities?: Partial<ModelCapabilities>,
): LanguageModel {
  return createOpenAICompatibleModel(config, modelId);
}
