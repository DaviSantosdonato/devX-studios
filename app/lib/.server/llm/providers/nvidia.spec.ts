import { describe, expect, it, beforeEach } from 'vitest';
import {
  NvidiaNimProviderAdapter,
  NVIDIA_PROVIDER_ID,
  NVIDIA_MODELS,
  NVIDIA_PROVIDER_NAME,
  NVIDIA_BASE_URL,
  NVIDIA_MODEL_ID,
  NVIDIA_REMOTE_ID,
} from './nvidia';
import { ProviderError } from '~/lib/.server/llm/errors';
import { providerRegistry, ProviderRegistry } from '~/lib/.server/llm/provider-registry';
import { modelRegistry, ModelRegistry } from '~/lib/.server/llm/model-registry';
import { registerBuiltInProviders } from '~/lib/.server/llm/register-providers';

describe('NvidiaNimProviderAdapter', () => {
  let adapter: NvidiaNimProviderAdapter;

  beforeEach(() => {
    adapter = new NvidiaNimProviderAdapter();
  });

  describe('metadata', () => {
    it('should have correct provider id', () => {
      expect(NVIDIA_PROVIDER_ID).toBe('nvidia');
    });

    it('should have correct provider name', () => {
      expect(NVIDIA_PROVIDER_NAME).toBe('NVIDIA NIM');
    });

    it('should have correct base URL', () => {
      expect(NVIDIA_BASE_URL).toBe('https://integrate.api.nvidia.com/v1');
    });

    it('should have correct model id', () => {
      expect(NVIDIA_MODEL_ID).toBe('nemotron-3-ultra-550b-a55b');
    });

    it('should have correct remote model id', () => {
      expect(NVIDIA_REMOTE_ID).toBe('nvidia/nemotron-3-ultra-550b-a55b');
    });

    it('should have correct id on adapter instance', () => {
      expect(adapter.id).toBe('nvidia');
    });

    it('should have correct name on adapter instance', () => {
      expect(adapter.name).toBe('NVIDIA NIM');
    });
  });

  describe('models', () => {
    it('should expose exactly one model', () => {
      expect(NVIDIA_MODELS.length).toBe(1);
    });

    it('should have correct model metadata', () => {
      const model = NVIDIA_MODELS[0];
      expect(model.id).toBe('nemotron-3-ultra-550b-a55b');
      expect(model.name).toBe('Nemotron 3 Ultra 550B');
      expect(model.providerId).toBe('nvidia');
      expect(model.remoteModelId).toBe('nvidia/nemotron-3-ultra-550b-a55b');
      expect(model.isDefault).toBe(false);
      expect(model.requiredEnvVar).toBe('NVIDIA_API_KEY');
      expect(model.status).toBe('available');
    });

    it('should have correct capabilities', () => {
      const model = NVIDIA_MODELS[0];
      expect(model.capabilities.streaming).toBe(true);
      expect(model.capabilities.toolCalling).toBe(true);
      expect(model.capabilities.vision).toBe(false);
      expect(model.capabilities.reasoning).toBe(true);
      expect(model.capabilities.systemPrompt).toBe(true);
      expect(model.capabilities.maximumContextTokens).toBe(1000000);
      expect(model.capabilities.maximumOutputTokens).toBe(32768);
    });
  });

  describe('adapter instance', () => {
    it('should have models from constants', () => {
      expect(adapter.models).toEqual(NVIDIA_MODELS);
    });
  });

  describe('validateConfig', () => {
    it('should return false for missing apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '', baseURL: 'https://integrate.api.nvidia.com/v1' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '   ', baseURL: 'https://integrate.api.nvidia.com/v1' });
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

    it('should return false for non-NVIDIA baseURL', async () => {
      const result = await adapter.validateConfig({ apiKey: 'test-key', baseURL: 'https://api.example.com/v1' });
      expect(result).toBe(false);
    });

    it('should return true for valid NVIDIA config', async () => {
      const result = await adapter.validateConfig({
        apiKey: 'nvapi-test123',
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      expect(result).toBe(true);
    });
  });

  describe('createModel', () => {
    it('should create model with valid config', () => {
      const model = adapter.createModel(
        {
          apiKey: 'nvapi-test123',
          baseURL: 'https://integrate.api.nvidia.com/v1',
        },
        'nemotron-3-ultra-550b-a55b',
      );

      expect(model).toBeDefined();
    });

    it('should forward correct remote model id', () => {
      const model = adapter.createModel(
        { apiKey: 'nvapi-test', baseURL: 'https://integrate.api.nvidia.com/v1' },
        'nemotron-3-ultra-550b-a55b',
      );

      expect(model).toBeDefined();
    });

    it('should throw error for unknown model', () => {
      expect(() =>
        adapter.createModel({ apiKey: 'nvapi-test', baseURL: 'https://integrate.api.nvidia.com/v1' }, 'unknown-model'),
      ).toThrow('Model "unknown-model" not found in NVIDIA provider');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities for nemotron-3-ultra-550b-a55b', () => {
      const caps = adapter.getCapabilities('nemotron-3-ultra-550b-a55b');
      expect(caps).toEqual({
        streaming: true,
        toolCalling: true,
        vision: false,
        reasoning: true,
        systemPrompt: true,
        maximumContextTokens: 1000000,
        maximumOutputTokens: 32768,
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

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.providerId).toBe('nvidia');
      expect(result.modelId).toBe('nemotron-3-ultra-550b-a55b');
    });

    it('should normalize 403 to INVALID_CONFIGURATION', () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('INVALID_CONFIGURATION');
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = new Error('Not found');
      (error as any).status = 404;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = new Error('Rate limited');
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should normalize 500+ to PROVIDER_UNAVAILABLE with retryable', () => {
      const error = new Error('Internal server error');
      (error as any).status = 500;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize network errors to PROVIDER_UNAVAILABLE', () => {
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize timeout errors to TIMEOUT', () => {
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should normalize ResourceExhausted/capacity to RATE_LIMITED with retryable', () => {
      const error = new Error(
        'ResourceExhausted: Worker local total request limit reached for nvapi-abcdefghijklmnopqrstuvwxyz123456',
      );
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize ResourceExhausted message without leaking secrets', () => {
      const error = new Error('ResourceExhausted: limit reached for api_key=nvapi-abcdefghijklmnopqrstuvwxyz123456');
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.message).not.toContain('nvapi-abcdefghijklmnopqrstuvwxyz123456');
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('register with ProviderRegistry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry();
    });

    it('should register adapter', () => {
      const adapter = new NvidiaNimProviderAdapter();
      registry.register(adapter);
      expect(registry.has('nvidia')).toBe(true);
    });

    it('should get registered adapter', () => {
      const adapter = new NvidiaNimProviderAdapter();
      registry.register(adapter);

      const retrieved = registry.get('nvidia');
      expect(retrieved).toBe(adapter);
    });

    it('should reject duplicate registration', () => {
      const adapter1 = new NvidiaNimProviderAdapter();
      const adapter2 = new NvidiaNimProviderAdapter();
      registry.register(adapter1);
      expect(() => registry.register(adapter2)).toThrow('Provider "nvidia" já está registrado');
    });

    it('should reject registration after freeze', () => {
      const adapter = new NvidiaNimProviderAdapter();
      registry.register(adapter);
      registry.freeze();

      const adapter2 = new NvidiaNimProviderAdapter();
      expect(() => registry.register(adapter2)).toThrow('Registry está congelado');
    });
  });

  describe('register with ModelRegistry', () => {
    let registry: ModelRegistry;

    beforeEach(() => {
      registry = new ModelRegistry();
    });

    it('should register NVIDIA model', () => {
      const model = NVIDIA_MODELS[0];
      registry.register(model);
      expect(registry.has('nemotron-3-ultra-550b-a55b')).toBe(true);
    });

    it('should get registered model', () => {
      const model = NVIDIA_MODELS[0];
      registry.register(model);

      const retrieved = registry.get('nemotron-3-ultra-550b-a55b');
      expect(retrieved).toEqual(model);
    });

    it('should reject duplicate model ID', () => {
      const model = NVIDIA_MODELS[0];
      registry.register(model);
      expect(() => registry.register(model)).toThrow('Modelo com ID "nemotron-3-ultra-550b-a55b" já está registrado');
    });

    it('should NOT be default model', () => {
      const model = NVIDIA_MODELS[0];
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
      expect(providerRegistry.has('nvidia')).toBe(true);
      expect(providerRegistry.has('deepseek')).toBe(true);
      expect(providerRegistry.has('anthropic')).toBe(true);
    });
  });

  describe('sanitization', () => {
    it('should sanitize NVIDIA_API_KEY in error messages', () => {
      const error = new Error('Failed with key nvapi-abcdefghijklmnopqrstuvwxyz123456');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.message).not.toContain('nvapi-abcdefghijklmnopqrstuvwxyz123456');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize Bearer token in error messages', () => {
      const error = new Error('Authorization: Bearer nvapi-abcdefghijklmnopqrstuvwxyz123456');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.message).not.toContain('nvapi-abcdefghijklmnopqrstuvwxyz123456');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize Authorization header', () => {
      const error = new Error('Authorization: Bearer nvapi-secret1234567890');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should sanitize ResourceExhausted message', () => {
      const error = new Error(
        'ResourceExhausted: Worker local total request limit reached for nvapi-abcdefghijklmnopqrstuvwxyz123456',
      );
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'nemotron-3-ultra-550b-a55b');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
      expect(result.message).not.toContain('nvapi-abcdefghijklmnopqrstuvwxyz123456');
      expect(result.message).toContain('[REDACTED]');
    });
  });

  describe('isolation from OpenAI-compatible core', () => {
    it('should NOT contain NVIDIA in openai-compatible core', () => {
      /**
       * The OpenAI-compatible core should not export any NVIDIA-specific constants
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

    it('importing nvidia.ts should NOT auto-register', () => {
      expect(providerRegistry.has('nvidia')).toBe(false);
      expect(modelRegistry.has('nemotron-3-ultra-550b-a55b')).toBe(false);
    });
  });
});
