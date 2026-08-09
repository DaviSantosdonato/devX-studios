import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderError } from '~/lib/.server/llm/errors';
import { ModelRegistry, modelRegistry } from '~/lib/.server/llm/model-registry';
import { ProviderRegistry, providerRegistry } from '~/lib/.server/llm/provider-registry';
import { registerBuiltInProviders } from '~/lib/.server/llm/register-providers';
import {
  OPENAI_BASE_URL,
  OPENAI_MODEL_ID,
  OPENAI_MODELS,
  OPENAI_PROVIDER_ID,
  OPENAI_PROVIDER_NAME,
  OPENAI_REMOTE_ID,
  OpenAIProviderAdapter,
} from './openai';

describe('OpenAIProviderAdapter', () => {
  let adapter: OpenAIProviderAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    providerRegistry.clear();
    modelRegistry.clear();
    adapter = new OpenAIProviderAdapter();
  });

  describe('metadata', () => {
    it('exposes the OpenAI provider identity', () => {
      expect(OPENAI_PROVIDER_ID).toBe('openai');
      expect(OPENAI_PROVIDER_NAME).toBe('OpenAI');
      expect(adapter.id).toBe('openai');
      expect(adapter.name).toBe('OpenAI');
    });

    it('uses the official OpenAI API base URL', () => {
      expect(OPENAI_BASE_URL).toBe('https://api.openai.com/v1');
    });

    it('exposes the official local and remote model IDs', () => {
      expect(OPENAI_MODEL_ID).toBe('gpt-5.6-terra');
      expect(OPENAI_REMOTE_ID).toBe('gpt-5.6-terra');
    });
  });

  describe('model definition', () => {
    it('exposes exactly one non-default OpenAI model', () => {
      expect(OPENAI_MODELS).toHaveLength(1);
      expect(OPENAI_MODELS[0]).toMatchObject({
        id: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        providerId: 'openai',
        remoteModelId: 'gpt-5.6-terra',
        requiredEnvVar: 'OPENAI_API_KEY',
        status: 'available',
        isDefault: false,
      });
      expect(adapter.models).toEqual(OPENAI_MODELS);
    });

    it('exposes the officially documented capabilities and token limits', () => {
      expect(OPENAI_MODELS[0].capabilities).toEqual({
        streaming: true,
        toolCalling: true,
        vision: true,
        reasoning: true,
        systemPrompt: true,
        maximumContextTokens: 1050000,
        maximumOutputTokens: 128000,
      });
      expect(adapter.getCapabilities(OPENAI_MODEL_ID)).toEqual(OPENAI_MODELS[0].capabilities);
      expect(adapter.getCapabilities('unknown-model')).toBeUndefined();
    });
  });

  describe('validateConfig', () => {
    it('rejects a missing or blank API key', async () => {
      await expect(adapter.validateConfig({ apiKey: '', baseURL: OPENAI_BASE_URL })).resolves.toBe(false);
      await expect(adapter.validateConfig({ apiKey: '   ', baseURL: OPENAI_BASE_URL })).resolves.toBe(false);
    });

    it('rejects a missing or malformed base URL', async () => {
      await expect(adapter.validateConfig({ apiKey: 'test-key' })).resolves.toBe(false);
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL: 'not-a-url' })).resolves.toBe(false);
    });

    it.each([
      'http://api.openai.com/v1',
      'https://evil-openai.com/v1',
      'https://openai.com.attacker.example/v1',
      'https://api.openai.com.attacker.example/v1',
      'https://api.openai.com@evil.example/v1',
      'https://user@api.openai.com/v1',
      'https://user:password@api.openai.com/v1',
      'https://api.openai.com:8443/v1',
      'https://api.openai.com/v1/extra',
      'https://api.openai.com/v1?target=evil.example',
      'https://api.openai.com/v1#fragment',
    ])('rejects an untrusted base URL: %s', async (baseURL) => {
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL })).resolves.toBe(false);
    });

    it('accepts the exact server-side OpenAI base URL', async () => {
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL: OPENAI_BASE_URL })).resolves.toBe(true);
    });
  });

  describe('model creation', () => {
    it('creates the requested remote model through the compatible core', () => {
      const model = adapter.createModel({ apiKey: 'test-key' }, OPENAI_MODEL_ID);

      expect(model).toBeDefined();
      expect(model.modelId).toBe(OPENAI_REMOTE_ID);
    });

    it('does not access the network while creating a model', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      adapter.createModel({ apiKey: 'test-key' }, OPENAI_MODEL_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects an unknown model safely', () => {
      let thrownError: unknown;

      try {
        adapter.createModel({ apiKey: 'test-key' }, 'unknown-model');
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ProviderError);
      expect(thrownError).toMatchObject({
        code: 'MODEL_NOT_FOUND',
        providerId: 'openai',
        modelId: 'unknown-model',
        retryable: false,
      });
    });
  });

  describe('error normalization and sanitization', () => {
    it.each([
      [401, 'INVALID_API_KEY', false],
      [403, 'INVALID_CONFIGURATION', false],
      [404, 'MODEL_NOT_FOUND', false],
      [429, 'RATE_LIMITED', true],
      [503, 'PROVIDER_UNAVAILABLE', true],
    ] as const)('normalizes HTTP %i to %s', (status, code, retryable) => {
      const result = adapter.normalizeError(errorWithStatus('Provider request failed', status), OPENAI_MODEL_ID);

      expect(result).toBeInstanceOf(ProviderError);
      expect(result).toMatchObject({ code, providerId: 'openai', modelId: OPENAI_MODEL_ID, retryable });
    });

    it('normalizes network and timeout errors', () => {
      const networkError = errorWithCode('Connection refused', 'ECONNREFUSED');
      const timeoutError = errorWithCode('Request timed out', 'ETIMEDOUT');

      expect(adapter.normalizeError(networkError, OPENAI_MODEL_ID)).toMatchObject({
        code: 'PROVIDER_UNAVAILABLE',
        retryable: true,
      });
      expect(adapter.normalizeError(timeoutError, OPENAI_MODEL_ID)).toMatchObject({
        code: 'TIMEOUT',
        retryable: true,
      });
    });

    it('sanitizes OpenAI API keys without reflecting the credential', () => {
      const secret = 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890';
      const error = errorWithStatus(`Request failed with apiKey=${secret}`, 401);

      const result = adapter.normalizeError(error, OPENAI_MODEL_ID);

      expect(result.message).not.toContain(secret);
      expect(result.message).toContain('[REDACTED]');
    });

    it('sanitizes Bearer tokens without reflecting the credential', () => {
      const secret = 'openai-secret-token-abcdefghijklmnopqrstuvwxyz';
      const error = errorWithStatus(`Authorization: Bearer ${secret}`, 401);

      const result = adapter.normalizeError(error, OPENAI_MODEL_ID);

      expect(result.message).not.toContain(secret);
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('stream headers', () => {
    it('does not add Anthropic, Gemini, or OpenAI-specific headers', () => {
      expect(adapter.getStreamOptions(OPENAI_MODEL_ID)).toBeUndefined();
    });
  });

  describe('registries', () => {
    it('registers in a ProviderRegistry', () => {
      const registry = new ProviderRegistry();

      registry.register(adapter);

      expect(registry.get('openai')).toBe(adapter);
    });

    it('registers its model in a ModelRegistry', () => {
      const registry = new ModelRegistry();

      registry.register(OPENAI_MODELS[0]);

      expect(registry.get(OPENAI_MODEL_ID)).toEqual(OPENAI_MODELS[0]);
    });

    it('is registered exactly once by registerBuiltInProviders', () => {
      registerBuiltInProviders();
      registerBuiltInProviders();

      expect(providerRegistry.list()).toEqual(['anthropic', 'deepseek', 'gemini', 'openai']);
      expect(modelRegistry.list().map((model) => model.id)).toEqual([
        'claude-3-5-sonnet',
        'deepseek-v4-flash',
        'gemini-3.6-flash',
        'gpt-5.6-terra',
      ]);
    });
  });
});

function errorWithStatus(message: string, status: number): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;

  return error;
}

function errorWithCode(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;

  return error;
}
