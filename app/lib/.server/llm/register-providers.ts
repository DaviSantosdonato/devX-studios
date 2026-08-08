import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { anthropicAdapter, ANTHROPIC_MODELS } from './providers/anthropic';
import { deepseekAdapter, DEEPSEEK_MODELS } from './providers/deepseek';
import { nvidiaAdapter, NVIDIA_MODELS } from './providers/nvidia';

export function registerBuiltInProviders(): void {
  // check if already registered
  if (providerRegistry.has('anthropic') && providerRegistry.has('deepseek') && providerRegistry.has('nvidia')) {
    return;
  }

  // register Anthropic provider
  if (!providerRegistry.has('anthropic')) {
    providerRegistry.register(anthropicAdapter);
  }

  // register Anthropic models
  for (const model of ANTHROPIC_MODELS) {
    modelRegistry.register(model);
  }

  // register DeepSeek provider
  if (!providerRegistry.has('deepseek')) {
    providerRegistry.register(deepseekAdapter);
  }

  // register DeepSeek models
  for (const model of DEEPSEEK_MODELS) {
    modelRegistry.register(model);
  }

  // register NVIDIA provider
  if (!providerRegistry.has('nvidia')) {
    providerRegistry.register(nvidiaAdapter);
  }

  // register NVIDIA models
  for (const model of NVIDIA_MODELS) {
    modelRegistry.register(model);
  }
}
