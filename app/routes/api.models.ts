import { modelRegistry } from '~/lib/.server/llm/model-registry';
import { registerBuiltInProviders } from '~/lib/.server/llm/register-providers';
import type { PublicModel } from '~/lib/.server/llm/public-catalog';
import { toPublicModel } from '~/lib/.server/llm/public-catalog';

interface ModelsResponse {
  models: PublicModel[];
  defaultModelId: string;
}

export async function loader() {
  // ensure providers and models are registered
  registerBuiltInProviders();

  const models = modelRegistry.list();
  const publicModels = models.map(toPublicModel);

  // get default model ID (Anthropic is the primary default)
  let defaultModelId = '';

  try {
    const defaultModel = modelRegistry.tryGetDefault('anthropic');
    defaultModelId = defaultModel?.id ?? '';
  } catch {
    // fallback to first available model
    const firstAvailable = publicModels.find((m) => m.available);
    defaultModelId = firstAvailable?.id ?? '';
  }

  const response: ModelsResponse = {
    models: publicModels,
    defaultModelId,
  };

  return Response.json(response);
}
