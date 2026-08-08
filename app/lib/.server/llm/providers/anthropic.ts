import { createAnthropic } from '@ai-sdk/anthropic';
import type {
  ProviderAdapter,
  ProviderConfiguration,
  ModelDefinition,
  ModelCapabilities,
} from '~/lib/.server/llm/types';
import { ProviderError, normalizeProviderError, createProviderError } from '~/lib/.server/llm/errors';

export const ANTHROPIC_PROVIDER_ID = 'anthropic' as const;
export const ANTHROPIC_PROVIDER_NAME = 'Anthropic' as const;

const CLAUDE_SONNET_35_MODEL_ID = 'claude-3-5-sonnet';
const CLAUDE_SONNET_35_REMOTE_ID = 'claude-3-5-sonnet-20240620';

const ANTHROPIC_MODEL_CAPABILITIES: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: true,
  reasoning: false,
  systemPrompt: true,
  maximumContextTokens: 200000,
  maximumOutputTokens: 8192,
};

export const ANTHROPIC_MODELS: readonly ModelDefinition[] = [
  {
    id: CLAUDE_SONNET_35_MODEL_ID,
    name: 'Claude 3.5 Sonnet',
    providerId: ANTHROPIC_PROVIDER_ID,
    capabilities: ANTHROPIC_MODEL_CAPABILITIES,
    status: 'available',
    requiredEnvVar: 'ANTHROPIC_API_KEY',
    remoteModelId: CLAUDE_SONNET_35_REMOTE_ID,
    isDefault: true,
    description: 'Anthropic Claude 3.5 Sonnet - Most capable model',
  },
] as const;

export class AnthropicProviderAdapter implements ProviderAdapter {
  readonly id = ANTHROPIC_PROVIDER_ID;
  readonly name = ANTHROPIC_PROVIDER_NAME;
  readonly models = ANTHROPIC_MODELS;

  async validateConfig(config: ProviderConfiguration): Promise<boolean> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    // basic format check for Anthropic keys
    return config.apiKey.startsWith('sk-ant-');
  }

  createModel(config: ProviderConfiguration, modelId: string) {
    const model = this.models.find((m) => m.id === modelId);

    if (!model) {
      throw new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: this.id,
        modelId,
        message: `Model "${modelId}" not found in Anthropic provider`,
        retryable: false,
      });
    }

    const anthropic = createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      headers: config.headers,
    });

    return anthropic(model.remoteModelId);
  }

  normalizeError(error: unknown, modelId: string): ProviderError {
    const normalized = normalizeProviderError(error, this.id, modelId);
    return createProviderError(this.id, modelId, normalized);
  }

  getCapabilities(modelId: string): ModelCapabilities | undefined {
    const model = this.models.find((m) => m.id === modelId);
    return model?.capabilities;
  }

  getStreamOptions(modelId: string): Record<string, string> | undefined {
    const model = this.models.find((m) => m.id === modelId);

    if (model?.id === CLAUDE_SONNET_35_MODEL_ID) {
      return {
        'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
      };
    }

    return undefined;
  }
}

export const anthropicAdapter = new AnthropicProviderAdapter();
