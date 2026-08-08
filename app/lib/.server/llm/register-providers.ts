import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { anthropicAdapter, ANTHROPIC_MODELS } from './providers/anthropic';
import { deepseekAdapter, DEEPSEEK_MODELS } from './providers/deepseek';
import { geminiAdapter, GEMINI_MODELS } from './providers/gemini';

export function registerBuiltInProviders(): void {
  // check if already registered
  if (providerRegistry.has('anthropic') && providerRegistry.has('deepseek') && providerRegistry.has('gemini')) {
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

  // register Gemini provider
  if (!providerRegistry.has('gemini')) {
    providerRegistry.register(geminiAdapter);
  }

  // register Gemini models
  for (const model of GEMINI_MODELS) {
    modelRegistry.register(model);
  }
}
