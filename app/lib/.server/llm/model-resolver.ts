import { modelRegistry } from './model-registry';
import { providerRegistry } from './provider-registry';
import { registerBuiltInProviders } from './register-providers';
import type { ProviderConfiguration, ModelDefinition, LanguageModel, ProviderId } from './types';
import { ProviderError } from './errors';

function ensureBootstrapped(): void {
  // always ensure providers are registered if registries are empty
  if (providerRegistry.list().length === 0 || modelRegistry.list().length === 0) {
    registerBuiltInProviders();
  }
}

interface ResolvedModel {
  model: ModelDefinition;
  provider: InstanceType<typeof import('./provider-registry').ProviderRegistry> extends { get(id: string): infer P }
    ? P
    : never;
  languageModel: LanguageModel;
  config: import('./types').ProviderConfiguration;
}

interface ResolveOptions {
  modelId?: string;
  env: Env;
}

export async function resolveModel(options: ResolveOptions): Promise<ResolvedModel> {
  ensureBootstrapped();

  const { modelId, env } = options;

  const model = modelId ? modelRegistry.tryGet(modelId) : modelRegistry.tryGetDefault('anthropic');

  if (!model) {
    const available = modelRegistry
      .list()
      .map((m) => m.id)
      .join(', ');
    throw new ProviderError({
      code: 'MODEL_NOT_FOUND',
      providerId: modelId ? (modelId as ProviderId) : 'anthropic',
      modelId: modelId ?? 'default',
      message: modelId
        ? `Model "${modelId}" not found. Available: ${available}`
        : `No default model configured. Available: ${available}`,
      retryable: false,
    });
  }

  if (model.status !== 'available') {
    throw new ProviderError({
      code: 'MODEL_NOT_FOUND',
      providerId: model.providerId,
      modelId: model.id,
      message: `Model "${model.id}" is ${model.status}`,
      retryable: false,
    });
  }

  const provider = providerRegistry.get(model.providerId);

  const apiKey = getEnv(model.requiredEnvVar, env);

  if (!apiKey) {
    throw new ProviderError({
      code: 'MISSING_API_KEY',
      providerId: model.providerId,
      modelId: model.id,
      message: `API key not configured: ${model.requiredEnvVar}`,
      retryable: false,
    });
  }

  // validate API key format (trim whitespace check)
  if (apiKey.trim() === '') {
    throw new ProviderError({
      code: 'MISSING_API_KEY',
      providerId: model.providerId,
      modelId: model.id,
      message: `API key is empty: ${model.requiredEnvVar}`,
      retryable: false,
    });
  }

  const config: ProviderConfiguration = {
    apiKey,
  };

  const languageModel = provider.createModel(config, model.id);

  return {
    model,
    provider,
    languageModel,
    config,
  };
}

function getEnv(key: string, env: Env): string | undefined {
  if (env && key in env) {
    const value = env[key] as string | undefined;

    if (value && value !== '') {
      return value;
    }
  }

  return process.env[key];
}
