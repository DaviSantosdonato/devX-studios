import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderError } from '~/lib/.server/llm/errors';
import { ModelRegistry, modelRegistry } from '~/lib/.server/llm/model-registry';
import { ProviderRegistry, providerRegistry } from '~/lib/.server/llm/provider-registry';
import { registerBuiltInProviders } from '~/lib/.server/llm/register-providers';
import {
  GEMINI_BASE_URL,
  GEMINI_MODEL_ID,
  GEMINI_MODELS,
  GEMINI_PROVIDER_ID,
  GEMINI_PROVIDER_NAME,
  GEMINI_REMOTE_ID,
  GeminiProviderAdapter,
} from './gemini';

describe('GeminiProviderAdapter', () => {
  let adapter: GeminiProviderAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    providerRegistry.clear();
    modelRegistry.clear();
    adapter = new GeminiProviderAdapter();
  });

  describe('metadata', () => {
    it('exposes the Gemini provider identity', () => {
      expect(GEMINI_PROVIDER_ID).toBe('gemini');
      expect(GEMINI_PROVIDER_NAME).toBe('Google Gemini');
      expect(adapter.id).toBe('gemini');
      expect(adapter.name).toBe('Google Gemini');
    });

    it('uses the official OpenAI-compatible base URL', () => {
      expect(GEMINI_BASE_URL).toBe('https://generativelanguage.googleapis.com/v1beta/openai/');
    });

    it('exposes the requested local and remote model IDs', () => {
      expect(GEMINI_MODEL_ID).toBe('gemini-3.6-flash');
      expect(GEMINI_REMOTE_ID).toBe('gemini-3.6-flash');
    });
  });

  describe('model definition', () => {
    it('exposes exactly one non-default Gemini model', () => {
      expect(GEMINI_MODELS).toHaveLength(1);
      expect(GEMINI_MODELS[0]).toMatchObject({
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        providerId: 'gemini',
        remoteModelId: 'gemini-3.6-flash',
        requiredEnvVar: 'GEMINI_API_KEY',
        status: 'available',
        isDefault: false,
      });
      expect(adapter.models).toEqual(GEMINI_MODELS);
    });

    it('exposes the official capabilities and token limits', () => {
      expect(GEMINI_MODELS[0].capabilities).toEqual({
        streaming: true,
        toolCalling: true,
        vision: true,
        reasoning: true,
        systemPrompt: true,
        maximumContextTokens: 1048576,
        maximumOutputTokens: 65536,
      });
      expect(adapter.getCapabilities(GEMINI_MODEL_ID)).toEqual(GEMINI_MODELS[0].capabilities);
      expect(adapter.getCapabilities('unknown-model')).toBeUndefined();
    });
  });

  describe('validateConfig', () => {
    it('rejects a missing or blank API key', async () => {
      await expect(adapter.validateConfig({ apiKey: '', baseURL: GEMINI_BASE_URL })).resolves.toBe(false);
      await expect(adapter.validateConfig({ apiKey: '   ', baseURL: GEMINI_BASE_URL })).resolves.toBe(false);
    });

    it('rejects a missing or malformed base URL', async () => {
      await expect(adapter.validateConfig({ apiKey: 'test-key' })).resolves.toBe(false);
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL: 'not-a-url' })).resolves.toBe(false);
    });

    it.each([
      'http://generativelanguage.googleapis.com/v1beta/openai/',
      'https://evil-googleapis.com/v1beta/openai/',
      'https://googleapis.com.attacker.example/v1beta/openai/',
      'https://generativelanguage.googleapis.com.attacker.example/v1beta/openai/',
      'https://generativelanguage.googleapis.com@evil.example/v1beta/openai/',
      'https://generativelanguage.googleapis.com/v1beta/openai/extra',
      'https://generativelanguage.googleapis.com/v1beta/openai/?target=evil.example',
    ])('rejects an untrusted base URL: %s', async (baseURL) => {
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL })).resolves.toBe(false);
    });

    it('accepts the exact server-side Gemini base URL', async () => {
      await expect(adapter.validateConfig({ apiKey: 'test-key', baseURL: GEMINI_BASE_URL })).resolves.toBe(true);
    });
  });

  describe('model creation', () => {
    it('creates the requested remote model through the compatible core', () => {
      const model = adapter.createModel({ apiKey: 'test-key' }, GEMINI_MODEL_ID);

      expect(model).toBeDefined();
      expect(model.modelId).toBe(GEMINI_REMOTE_ID);
    });

    it('does not access the network while creating a model', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      adapter.createModel({ apiKey: 'test-key' }, GEMINI_MODEL_ID);

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
        providerId: 'gemini',
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
      const result = adapter.normalizeError(errorWithStatus('Provider request failed', status), GEMINI_MODEL_ID);

      expect(result).toBeInstanceOf(ProviderError);
      expect(result).toMatchObject({ code, providerId: 'gemini', modelId: GEMINI_MODEL_ID, retryable });
    });

    it('normalizes network and timeout errors', () => {
      const networkError = errorWithCode('Connection refused', 'ECONNREFUSED');
      const timeoutError = errorWithCode('Request timed out', 'ETIMEDOUT');

      expect(adapter.normalizeError(networkError, GEMINI_MODEL_ID)).toMatchObject({
        code: 'PROVIDER_UNAVAILABLE',
        retryable: true,
      });
      expect(adapter.normalizeError(timeoutError, GEMINI_MODEL_ID)).toMatchObject({
        code: 'TIMEOUT',
        retryable: true,
      });
    });

    it('sanitizes Bearer tokens without provider-specific patterns', () => {
      const secret = 'gemini-secret-token-abcdefghijklmnopqrstuvwxyz';
      const error = errorWithStatus(`Authorization: Bearer ${secret}`, 401);

      const result = adapter.normalizeError(error, GEMINI_MODEL_ID);

      expect(result.message).not.toContain(secret);
      expect(result.message).toContain('[REDACTED]');
    });

    it('sanitizes labeled API keys without reflecting the credential', () => {
      const secret = 'gemini-secret-token-abcdefghijklmnopqrstuvwxyz';
      const error = errorWithStatus(`Request failed with apiKey=${secret}`, 401);

      const result = adapter.normalizeError(error, GEMINI_MODEL_ID);

      expect(result.message).not.toContain(secret);
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('stream headers', () => {
    it('does not add Anthropic headers or provider-specific headers', () => {
      expect(adapter.getStreamOptions(GEMINI_MODEL_ID)).toBeUndefined();
    });
  });

  describe('registries', () => {
    it('registers in a ProviderRegistry', () => {
      const registry = new ProviderRegistry();

      registry.register(adapter);

      expect(registry.get('gemini')).toBe(adapter);
    });

    it('registers its model in a ModelRegistry', () => {
      const registry = new ModelRegistry();

      registry.register(GEMINI_MODELS[0]);

      expect(registry.get(GEMINI_MODEL_ID)).toEqual(GEMINI_MODELS[0]);
    });

    it('is registered exactly once by registerBuiltInProviders', () => {
      registerBuiltInProviders();
      registerBuiltInProviders();

      expect(providerRegistry.list()).toEqual(['anthropic', 'deepseek', 'gemini']);
      expect(modelRegistry.list().map((model) => model.id)).toEqual([
        'claude-3-5-sonnet',
        'deepseek-v4-flash',
        'gemini-3.6-flash',
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
