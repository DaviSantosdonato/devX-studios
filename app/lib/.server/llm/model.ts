import { providerRegistry } from './provider-registry';
import { ANTHROPIC_PROVIDER_ID } from './providers/anthropic';

export function getAnthropicModel(apiKey: string) {
  const provider = providerRegistry.get(ANTHROPIC_PROVIDER_ID);
  return provider.createModel({ apiKey }, 'claude-3-5-sonnet');
}
