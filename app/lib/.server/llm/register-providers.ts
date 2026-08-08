import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { anthropicAdapter, ANTHROPIC_MODELS } from './providers/anthropic';
import { deepseekAdapter, DEEPSEEK_MODELS } from './providers/deepseek';
import { nvidiaAdapter, NVIDIA_MODELS } from './providers/nvidia';

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

  // register NVIDIA provider
  providerRegistry.register(nvidiaAdapter);

  // register NVIDIA models
  for (const model of NVIDIA_MODELS) {
    modelRegistry.register(model);
  }

  isRegistered = true;
}
