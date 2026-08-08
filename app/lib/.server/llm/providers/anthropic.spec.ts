import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AnthropicProviderAdapter,
  ANTHROPIC_PROVIDER_ID,
  ANTHROPIC_MODELS,
  ANTHROPIC_PROVIDER_NAME,
} from '../providers/anthropic';
import { providerRegistry, ProviderRegistry } from '../provider-registry';
import { modelRegistry, ModelRegistry } from '../model-registry';
import { ProviderError } from '../errors';
import { registerBuiltInProviders } from '../register-providers';
import type { ProviderConfiguration } from '../types';

describe('AnthropicProviderAdapter', () => {
  let adapter: AnthropicProviderAdapter;

  beforeEach(() => {
    adapter = new AnthropicProviderAdapter();
  });

  describe('metadata', () => {
    it('should have correct provider id', () => {
      expect(ANTHROPIC_PROVIDER_ID).toBe('anthropic');
    });

    it('should have correct provider name', () => {
      expect(ANTHROPIC_PROVIDER_NAME).toBe('Anthropic');
    });

    it('should have correct id on adapter instance', () => {
      expect(adapter.id).toBe('anthropic');
    });

    it('should have correct name on adapter instance', () => {
      expect(adapter.name).toBe('Anthropic');
    });
  });

  describe('models', () => {
    it('should expose models', () => {
      expect(ANTHROPIC_MODELS.length).toBe(1);
    });

    it('should have correct model metadata', () => {
      const model = ANTHROPIC_MODELS[0];
      expect(model.id).toBe('claude-3-5-sonnet');
      expect(model.name).toBe('Claude 3.5 Sonnet');
      expect(model.providerId).toBe('anthropic');
      expect(model.remoteModelId).toBe('claude-3-5-sonnet-20240620');
      expect(model.isDefault).toBe(true);
      expect(model.requiredEnvVar).toBe('ANTHROPIC_API_KEY');
      expect(model.status).toBe('available');
    });

    it('should have correct capabilities', () => {
      const model = ANTHROPIC_MODELS[0];
      expect(model.capabilities.streaming).toBe(true);
      expect(model.capabilities.toolCalling).toBe(true);
      expect(model.capabilities.vision).toBe(true);
      expect(model.capabilities.reasoning).toBe(false);
      expect(model.capabilities.systemPrompt).toBe(true);
      expect(model.capabilities.maximumContextTokens).toBe(200000);
      expect(model.capabilities.maximumOutputTokens).toBe(8192);
    });
  });

  describe('adapter instance', () => {
    it('should have models from constants', () => {
      expect(adapter.models).toEqual(ANTHROPIC_MODELS);
    });
  });

  describe('validateConfig', () => {
    it('should return false for missing apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only apiKey', async () => {
      const result = await adapter.validateConfig({ apiKey: '   ' });
      expect(result).toBe(false);
    });

    it('should return false for invalid format (missing sk-ant- prefix)', async () => {
      const result = await adapter.validateConfig({ apiKey: 'invalid-key' });
      expect(result).toBe(false);
    });

    it('should return true for valid Anthropic key format', async () => {
      const result = await adapter.validateConfig({ apiKey: 'sk-ant-validkey123456789' });
      expect(result).toBe(true);
    });
  });

  describe('createModel', () => {
    it('should throw ProviderError for unknown model', () => {
      expect(() => adapter.createModel({ apiKey: 'sk-ant-test' }, 'unknown-model')).toThrow(ProviderError);
      expect(() => adapter.createModel({ apiKey: 'sk-ant-test' }, 'unknown-model')).toThrow(
        'Model "unknown-model" not found in Anthropic provider',
      );
    });

    it('should throw ProviderError with correct code for unknown model', () => {
      try {
        adapter.createModel({ apiKey: 'sk-ant-test' }, 'unknown-model');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as any).code).toBe('MODEL_NOT_FOUND');
        expect((error as any).providerId).toBe('anthropic');
        expect((error as any).modelId).toBe('unknown-model');
        expect((error as any).retryable).toBe(false);
      }
    });

    it('should create model instance for valid model id', () => {
      const model = adapter.createModel({ apiKey: 'sk-ant-test123' }, 'claude-3-5-sonnet');
      expect(model).toBeDefined();
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities for known model', () => {
      const caps = adapter.getCapabilities('claude-3-5-sonnet');
      expect(caps).toEqual({
        streaming: true,
        toolCalling: true,
        vision: true,
        reasoning: false,
        systemPrompt: true,
        maximumContextTokens: 200000,
        maximumOutputTokens: 8192,
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

      const result = adapter.normalizeError(error, 'claude-3-5-sonnet');
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.providerId).toBe('anthropic');
      expect(result.modelId).toBe('claude-3-5-sonnet');
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = new Error('Not found');
      (error as any).status = 404;

      const result = adapter.normalizeError(error, 'claude-3-5-sonnet');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = new Error('Rate limited');
      (error as any).status = 429;

      const result = adapter.normalizeError(error, 'claude-3-5-sonnet');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });
  });

  describe('register with ProviderRegistry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry();
    });

    it('should register adapter', () => {
      const adapter = new AnthropicProviderAdapter();
      registry.register(adapter);
      expect(registry.has('anthropic')).toBe(true);
    });

    it('should get registered adapter', () => {
      const adapter = new AnthropicProviderAdapter();
      registry.register(adapter);

      const retrieved = registry.get('anthropic');
      expect(retrieved).toBe(adapter);
    });

    it('should reject duplicate registration', () => {
      const adapter1 = new AnthropicProviderAdapter();
      const adapter2 = new AnthropicProviderAdapter();
      registry.register(adapter1);
      expect(() => registry.register(adapter2)).toThrow('Provider "anthropic" já está registrado');
    });

    it('should reject registration after freeze', () => {
      const adapter = new AnthropicProviderAdapter();
      registry.register(adapter);
      registry.freeze();

      const adapter2 = new AnthropicProviderAdapter();
      expect(() => registry.register(adapter2)).toThrow('Registry está congelado');
    });
  });

  describe('register with ModelRegistry', () => {
    let registry: ModelRegistry;

    beforeEach(() => {
      registry = new ModelRegistry();
    });

    it('should register Anthropic model', () => {
      const model = ANTHROPIC_MODELS[0];
      registry.register(model);
      expect(registry.has('claude-3-5-sonnet')).toBe(true);
    });

    it('should get registered model', () => {
      const model = ANTHROPIC_MODELS[0];
      registry.register(model);

      const retrieved = registry.get('claude-3-5-sonnet');
      expect(retrieved).toEqual(model);
    });

    it('should reject duplicate model ID', () => {
      const model = ANTHROPIC_MODELS[0];
      registry.register(model);
      expect(() => registry.register(model)).toThrow('Modelo com ID "claude-3-5-sonnet" já está registrado');
    });

    it('should get default model for provider', () => {
      const model = ANTHROPIC_MODELS[0];
      registry.register(model);

      const defaultModel = registry.getDefault('anthropic');
      expect(defaultModel.id).toBe('claude-3-5-sonnet');
    });

    it('should reject duplicate default for same provider', () => {
      const model1 = ANTHROPIC_MODELS[0];
      const model2 = { ...ANTHROPIC_MODELS[0], id: 'another-model', isDefault: true };
      registry.register(model1);
      expect(() => registry.register(model2)).toThrow('Já existe modelo padrão para provider "anthropic"');
    });
  });

  describe('idempotent registration', () => {
    beforeEach(() => {
      // Reset global singletons for clean test
      providerRegistry.clear();
      modelRegistry.clear();
    });

    it('should handle duplicate provider registration gracefully in registerBuiltInProviders', () => {
      // This tests that the registration function doesn't throw on second call
      registerBuiltInProviders();
      registerBuiltInProviders(); // Should not throw
      expect(providerRegistry.has('anthropic')).toBe(true);
    });
  });

  describe('sanitization', () => {
    it('should sanitize API key in error messages', () => {
      const error = new Error('Failed with key sk-ant-abcdefghijklmnopqrstuvwxyz123456');
      (error as any).status = 401;

      const result = adapter.normalizeError(error, 'claude-3-5-sonnet');
      expect(result.message).not.toContain('sk-ant-abcdefghijklmnopqrstuvwxyz123456');
      expect(result.message).toContain('[REDACTED]');
    });
  });
});
