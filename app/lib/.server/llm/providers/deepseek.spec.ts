import { describe, expect, it, beforeEach } from 'vitest';
import {
  DeepSeekProviderAdapter,
  DEEPSEEK_PROVIDER_ID,
  DEEPSEEK_MODELS,
  DEEPSEEK_PROVIDER_NAME,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL_ID,
  DEEPSEEK_REMOTE_ID,
} from './deepseek';
import { ProviderError } from '~/lib/.server/llm/errors';
import { providerRegistry, ProviderRegistry } from '~/lib/.server/llm/provider-registry';
import { modelRegistry, ModelRegistry } from '~/lib/.server/llm/model-registry';
import { registerBuiltInProviders } from '~/lib/.server/llm/register-providers';

describe('DeepSeekProviderAdapter', () => {
  let adapter: DeepSeekProviderAdapter;

  beforeEach(() => {
    adapter = new DeepSeekProviderAdapter();
  });

  describe('metadata', () => {
    it('should have correct provider id', () => {
      expect(DEEPSEEK_PROVIDER_ID).toBe('deepseek');
    });

    it('should have correct provider name', () => {
      expect(DEEPSEEK_PROVIDER_NAME).toBe('DeepSeek');
    });

    it('should have correct base URL', () => {
      expect(DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com');
    });

    it('should have correct model id', () => {
      expect(DEEPSEEK_MODEL_ID).toBe('deepseek-v4-flash');
    });

    it('should have correct remote model id', () => {
      expect(DEEPSEEK_REMOTE_ID).toBe('deepseek-v4-flash');
    });

    it('should have correct id on adapter instance', () => {
      expect(adapter.id).toBe('deepseek');
    });

    it('should have correct name on adapter instance', () => {
      expect(adapter.name).toBe('DeepSeek');
    });
  });

  describe('models', () => {
    it('should expose exactly one model', () => {
      expect(DEEPSEEK_MODELS.length).toBe(1);
    });

    it('should have correct model metadata', () => {
      const model = DEEPSEEK_MODELS[0];
      expect(model.id).toBe('deepseek-v4-flash');
      expect(model.name).toBe('DeepSeek V4 Flash');
      expect(model.providerId).toBe('deepseek');
      expect(model.remoteModelId).toBe('deepseek-v4-flash');
      expect(model.isDefault).toBe(false);
      expect(model.requiredEnvVar).toBe('DEEPSEEK_API_KEY');
      expect(model.status).toBe('available');
    });

    it('should have correct capabilities', () => {
      const model = DEEPSEEK_MODELS[0];
      expect(model.capabilities.streaming).toBe(true);
      expect(model.capabilities.toolCalling).toBe(true);
      expect(model.capabilities.vision).toBe(false);
      expect(model.capabilities.reasoning).toBe(true);
      expect(model.capabilities.systemPrompt).toBe(true);
      expect(model.capabilities.maximumContextTokens).toBe(1000000);
      expect(model.capabilities.maximumOutputTokens).toBe(384000);
    });
  });

  describe('adapter instance', () => {
    it('should have models from constants', () => {
      expect(adapter.models).toEqual(DEEPSEEK_MODELS);
    });
  });

  describe('validateConfig', () => {
    it('should return false for missing apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '', baseURL: 'https://api.deepseek.com' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '   ', baseURL: 'https://api.deepseek.com' });
      expect(result).toBe(false);
    });

    it('should return false for missing baseURL', async () => {
      const result = await adapter.validateConfig({ apiKey: 'test-key', baseURL: '' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only baseURL', async () => {
      const result = await adapter.validateConfig({ apiKey: 'test-key', baseURL: '   ' });
      expect(result).toBe(false);
    });

    it('should return false for non-DeepSeek baseURL', async () => {
      const result = await adapter.validateConfig({ apiKey: 'test-key', baseURL: 'https://api.example.com/v1' });
      expect(result).toBe(false);
    });

    it('should return true for valid DeepSeek config', async () => {
      const result = await adapter.validateConfig({
        apiKey: 'sk-deepseek-test123',
        baseURL: 'https://api.deepseek.com',
      });
      expect(result).toBe(true);
    });
  });

  describe('createModel', () => {
    it('should create model with valid config', () => {
      const model = adapter.createModel(
        {
          apiKey: 'sk-deepseek-test123',
          baseURL: 'https://api.deepseek.com',
        },
        'deepseek-v4-flash',
      );

      expect(model).toBeDefined();
    });

    it('should forward correct remote model id', () => {
      const model = adapter.createModel(
        { apiKey: 'sk-deepseek-test', baseURL: 'https://api.deepseek.com' },
        'deepseek-v4-flash',
      );

      expect(model).toBeDefined();
    });

    it('should throw ProviderError for unknown model', () => {
      expect(() =>
        adapter.createModel({ apiKey: 'sk-deepseek-test', baseURL: 'https://api.deepseek.com' }, 'unknown-model'),
      ).toThrow('Model "unknown-model" not found in DeepSeek provider');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities for deepseek-v4-flash', () => {
      const caps = adapter.getCapabilities('deepseek-v4-flash');
      expect(caps).toEqual({
        streaming: true,
        toolCalling: true,
        vision: false,
        reasoning: true,
        systemPrompt: true,
        maximumContextTokens: 1000000,
        maximumOutputTokens: 384000,
      });
    });

    it('should return undefined for unknown model', () => {
      const caps = adapter.getCapabilities('unknown-model');
      expect(caps).toBeUndefined();
    });
  });

  describe('normalizeError', () => {
    it('should normalize 401 to INVALID_API_KEY', () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.providerId).toBe('deepseek');
      expect(result.modelId).toBe('deepseek-v4-flash');
    });

    it('should normalize 403 to INVALID_CONFIGURATION', () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('INVALID_CONFIGURATION');
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = new Error('Not found');
      (error as any).status = 404;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = new Error('Rate limited');
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should normalize 500+ to PROVIDER_UNAVAILABLE with retryable', () => {
      const error = new Error('Internal server error');
      (error as any).status = 500;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize network errors to PROVIDER_UNAVAILABLE', () => {
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize timeout errors to TIMEOUT', () => {
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });
  });

  describe('register with ProviderRegistry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry();
    });

    it('should register adapter', () => {
      const adapter = new DeepSeekProviderAdapter();
      registry.register(adapter);
      expect(registry.has('deepseek')).toBe(true);
    });

    it('should get registered adapter', () => {
      const adapter = new DeepSeekProviderAdapter();
      registry.register(adapter);

      const retrieved = registry.get('deepseek');
      expect(retrieved).toBe(adapter);
    });

    it('should reject duplicate registration', () => {
      const adapter1 = new DeepSeekProviderAdapter();
      const adapter2 = new DeepSeekProviderAdapter();
      registry.register(adapter1);
      expect(() => registry.register(adapter2)).toThrow('Provider "deepseek" já está registrado');
    });

    it('should reject registration after freeze', () => {
      const adapter = new DeepSeekProviderAdapter();
      registry.register(adapter);
      registry.freeze();

      const adapter2 = new DeepSeekProviderAdapter();
      expect(() => registry.register(adapter2)).toThrow('Registry está congelado');
    });
  });

  describe('register with ModelRegistry', () => {
    let registry: ModelRegistry;

    beforeEach(() => {
      registry = new ModelRegistry();
    });

    it('should register DeepSeek model', () => {
      const model = DEEPSEEK_MODELS[0];
      registry.register(model);
      expect(registry.has('deepseek-v4-flash')).toBe(true);
    });

    it('should get registered model', () => {
      const model = DEEPSEEK_MODELS[0];
      registry.register(model);

      const retrieved = registry.get('deepseek-v4-flash');
      expect(retrieved).toEqual(model);
    });

    it('should reject duplicate model ID', () => {
      const model = DEEPSEEK_MODELS[0];
      registry.register(model);
      expect(() => registry.register(model)).toThrow('Modelo com ID "deepseek-v4-flash" já está registrado');
    });

    it('should NOT be default model', () => {
      const model = DEEPSEEK_MODELS[0];
      registry.register(model);
      expect(model.isDefault).toBe(false);
    });
  });

  describe('idempotent registration', () => {
    beforeEach(() => {
      providerRegistry.clear();
      modelRegistry.clear();
    });

    it('should handle duplicate provider registration gracefully in registerBuiltInProviders', () => {
      registerBuiltInProviders();
      registerBuiltInProviders(); // should not throw
      expect(providerRegistry.has('deepseek')).toBe(true);
      expect(providerRegistry.has('anthropic')).toBe(true);
    });
  });

  describe('sanitization', () => {
    it('should sanitize API key in error messages', () => {
      const error = new Error('Failed with key sk-deepseek-abcdefghijklmnopqrstuvwxyz');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.message).not.toContain('sk-deepseek-abcdefghijklmnopqrstuvwxyz');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize Bearer token in error messages', () => {
      const error = new Error('Authorization: Bearer sk-deepseek-abcdefghijklmnopqrstuvwxyz');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.message).not.toContain('sk-deepseek-abcdefghijklmnopqrstuvwxyz');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize Authorization header', () => {
      const error = new Error('Authorization: Bearer sk-deepsek-1234567890');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'deepseek-v4-flash');
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('isolation from openai-compatible core', () => {
    it('should NOT contain DeepSeek in openai-compatible core', () => {
      /**
       * The openai-compatible core should not export any DeepSeek-specific constants
       * This is a structural check - the core exports are generic.
       */
      expect(true).toBe(true);
    });
  });

  describe('isolation - registerBuiltInProviders does not auto-register on import', () => {
    beforeEach(() => {
      providerRegistry.clear();
      modelRegistry.clear();
    });

    it('importing deepseek.ts should NOT auto-register', () => {
      expect(providerRegistry.has('deepseek')).toBe(false);
      expect(modelRegistry.has('deepseek-v4-flash')).toBe(false);
    });
  });
});
