import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { anthropicAdapter, ANTHROPIC_MODELS } from './providers/anthropic';
import { deepseekAdapter, DEEPSEEK_MODELS } from './providers/deepseek';

let isRegistered = false;

export function registerBuiltInProviders(): void {
  if (isRegistered) {
    return;
  }

  // register Anthropic provider
  providerRegistry.register(anthropicAdapter);

  // register Anthropic models
  for (const model of ANTHROPIC_MODELS) {
    modelRegistry.register(model);
  }

  // register DeepSeek provider
  providerRegistry.register(deepseekAdapter);

  // register DeepSeek models
  for (const model of DEEPSEEK_MODELS) {
    modelRegistry.register(model);
  }

  isRegistered = true;
}
