import { describe, expect, it, beforeEach } from 'vitest';
import {
  createOpenAICompatibleModel,
  createGenericOpenAICompatibleModel,
  OpenAICompatibleProviderAdapter,
  DEFAULT_MODEL_CAPABILITIES,
} from '~/lib/.server/llm/providers/openai-compatible';
import { ProviderError } from '~/lib/.server/llm/errors';

describe('OpenAICompatibleProviderAdapter', () => {
  let adapter: OpenAICompatibleProviderAdapter;

  beforeEach(() => {
    adapter = new OpenAICompatibleProviderAdapter();
  });

  describe('metadata', () => {
    it('should have correct provider id', () => {
      expect(adapter.id).toBe('openai-compatible');
    });

    it('should have correct provider name', () => {
      expect(adapter.name).toBe('OpenAI Compatible');
    });

    it('should have empty models by default', () => {
      expect(adapter.models).toEqual([]);
    });
  });

  describe('DEFAULT_MODEL_CAPABILITIES', () => {
    it('should have correct default capabilities', () => {
      expect(DEFAULT_MODEL_CAPABILITIES).toEqual({
        streaming: true,
        toolCalling: true,
        vision: false,
        reasoning: false,
        systemPrompt: true,
        maximumContextTokens: 128000,
        maximumOutputTokens: 4096,
      });
    });
  });

  describe('validateConfig', () => {
    it('should return false for missing apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '', baseURL: 'https://api.example.com/v1' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '   ', baseURL: 'https://api.example.com/v1' });
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

    it('should return true for valid config', async () => {
      const result = await adapter.validateConfig({
        apiKey: 'test-key',
        baseURL: 'https://api.example.com/v1',
      });
      expect(result).toBe(true);
    });
  });

  describe('createModel', () => {
    it('should create model with valid config', () => {
      const model = adapter.createModel(
        {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
        },
        'gpt-4',
      );

      expect(model).toBeDefined();
    });

    it('should forward custom modelId', () => {
      const model = adapter.createModel(
        {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
        },
        'custom-model-id',
      );

      expect(model).toBeDefined();
    });

    it('should throw when baseURL is missing', () => {
      expect(() => {
        adapter.createModel({ apiKey: 'test-key' }, 'gpt-4');
      }).toThrow('baseURL is required for OpenAI-compatible provider');
    });
  });

  describe('getCapabilities', () => {
    it('should return default capabilities for any model', () => {
      const caps = adapter.getCapabilities('any-model');
      expect(caps).toEqual(DEFAULT_MODEL_CAPABILITIES);
    });

    it('should return same capabilities for all models', () => {
      const caps1 = adapter.getCapabilities('model-a');
      const caps2 = adapter.getCapabilities('model-b');
      expect(caps1).toEqual(caps2);
    });
  });

  describe('normalizeError', () => {
    it('should normalize 401 to INVALID_API_KEY', () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'test-model');
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.providerId).toBe('openai-compatible');
      expect(result.modelId).toBe('test-model');
    });

    it('should normalize 403 to INVALID_CONFIGURATION', () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('INVALID_CONFIGURATION');
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = new Error('Not found');
      (error as any).status = 404;

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = new Error('Rate limited');
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should normalize 500+ to PROVIDER_UNAVAILABLE with retryable', () => {
      const error = new Error('Internal server error');
      (error as any).status = 500;

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize network errors to PROVIDER_UNAVAILABLE', () => {
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize timeout errors to TIMEOUT', () => {
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';

      const result = adapter.normalizeError(error, 'test-model');
      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });
  });

  describe('createOpenAICompatibleModel', () => {
    it('should create model with valid config', () => {
      const model = createOpenAICompatibleModel(
        {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
        },
        'gpt-4',
      );

      expect(model).toBeDefined();
    });

    it('should throw when baseURL is missing', () => {
      expect(() => {
        createOpenAICompatibleModel(
          {
            apiKey: 'test-key',
          },
          'gpt-4',
        );
      }).toThrow('baseURL is required for OpenAI-compatible provider');
    });

    it('should throw when baseURL is empty string', () => {
      expect(() => {
        createOpenAICompatibleModel(
          {
            apiKey: 'test-key',
            baseURL: '',
          },
          'gpt-4',
        );
      }).toThrow('baseURL is required for OpenAI-compatible provider');
    });

    it('should forward custom headers', () => {
      const model = createOpenAICompatibleModel(
        {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
          headers: { 'X-Custom': 'value' },
        },
        'gpt-4',
      );

      expect(model).toBeDefined();
    });
  });

  describe('createGenericOpenAICompatibleModel', () => {
    it('should delegate to createOpenAICompatibleModel', () => {
      const model = createGenericOpenAICompatibleModel(
        {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
        },
        'gpt-4',
      );

      expect(model).toBeDefined();
    });
  });
});
