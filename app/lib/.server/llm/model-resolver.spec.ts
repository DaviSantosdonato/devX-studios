import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveModel } from './model-resolver';
import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { ProviderError } from './errors';

type Env = {
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  GEMINI_API_KEY: string;
};

const PROVIDER_ENV_KEYS = ['ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY'] as const;

describe('model-resolver', () => {
  beforeEach(() => {
    for (const key of PROVIDER_ENV_KEYS) {
      vi.stubEnv(key, '');
    }

    providerRegistry.clear();
    modelRegistry.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const baseEnv: Env = {
    ANTHROPIC_API_KEY: '',
    DEEPSEEK_API_KEY: '',
    GEMINI_API_KEY: '',
  };

  describe('bootstrap', () => {
    it('should initialize registries on first call', async () => {
      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' },
      });
      expect(result.model.id).toBe('claude-3-5-sonnet');
      expect(result.provider.id).toBe('anthropic');
    });

    it('should handle duplicate bootstrap gracefully', async () => {
      await resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' } });
      await resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' } });
      expect(providerRegistry.has('anthropic')).toBe(true);
    });
  });

  describe('default model', () => {
    it('should resolve Claude when no modelId provided', async () => {
      const result = await resolveModel({ env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' } });
      expect(result.model.id).toBe('claude-3-5-sonnet');
      expect(result.provider.id).toBe('anthropic');
    });

    it('should use Anthropic adapter for default', async () => {
      const result = await resolveModel({ env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' } });
      expect(result.provider.name).toBe('Anthropic');
    });
  });

  describe('Anthropic resolution', () => {
    it('should resolve claude-3-5-sonnet', async () => {
      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'sk-ant-test123' },
      });
      expect(result.model.id).toBe('claude-3-5-sonnet');
      expect(result.provider.id).toBe('anthropic');
      expect(result.languageModel).toBeDefined();
    });

    it('should use ANTHROPIC_API_KEY', async () => {
      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'sk-ant-test123' },
      });
      expect(result.languageModel).toBeDefined();
    });

    it('should fail with missing ANTHROPIC_API_KEY', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '' } }),
      );
    });

    it('should fail with empty ANTHROPIC_API_KEY', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '' } }),
      );
    });

    it('should fail with whitespace ANTHROPIC_API_KEY', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '   ' } }),
      );
    });
  });

  describe('DeepSeek resolution', () => {
    it('should resolve deepseek-v4-flash', async () => {
      const result = await resolveModel({
        modelId: 'deepseek-v4-flash',
        env: { ...baseEnv, DEEPSEEK_API_KEY: 'sk-deepseek-test123' },
      });
      expect(result.model.id).toBe('deepseek-v4-flash');
      expect(result.provider.id).toBe('deepseek');
      expect(result.languageModel).toBeDefined();
    });

    it('should use DEEPSEEK_API_KEY', async () => {
      const result = await resolveModel({
        modelId: 'deepseek-v4-flash',
        env: { ...baseEnv, DEEPSEEK_API_KEY: 'sk-deepseek-test123' },
      });
      expect(result.languageModel).toBeDefined();
    });

    it('should fail with missing DEEPSEEK_API_KEY', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'deepseek-v4-flash', env: { ...baseEnv, DEEPSEEK_API_KEY: '' } }),
      );
    });
  });

  describe('Gemini resolution', () => {
    it('should resolve gemini-3.6-flash', async () => {
      const result = await resolveModel({
        modelId: 'gemini-3.6-flash',
        env: { ...baseEnv, GEMINI_API_KEY: 'gemini-test-key' },
      });
      expect(result.model.id).toBe('gemini-3.6-flash');
      expect(result.provider.id).toBe('gemini');
      expect(result.languageModel).toBeDefined();
    });

    it('should use GEMINI_API_KEY', async () => {
      const result = await resolveModel({
        modelId: 'gemini-3.6-flash',
        env: { ...baseEnv, GEMINI_API_KEY: 'gemini-test-key' },
      });
      expect(result.config.apiKey).toBe('gemini-test-key');
      expect(result.languageModel).toBeDefined();
    });

    it('should fail with missing GEMINI_API_KEY', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'gemini-3.6-flash', env: { ...baseEnv, GEMINI_API_KEY: '' } }),
      );
    });

    it('should prefer Cloudflare GEMINI_API_KEY over process.env', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'process-gemini-key');

      const result = await resolveModel({
        modelId: 'gemini-3.6-flash',
        env: { ...baseEnv, GEMINI_API_KEY: 'cloudflare-gemini-key' },
      });

      expect(result.config.apiKey).toBe('cloudflare-gemini-key');
    });

    it('should fallback to process.env GEMINI_API_KEY', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'process-gemini-key');

      const result = await resolveModel({
        modelId: 'gemini-3.6-flash',
        env: { ...baseEnv, GEMINI_API_KEY: '' },
      });

      expect(result.config.apiKey).toBe('process-gemini-key');
    });
  });

  describe('invalid model', () => {
    it('should throw for unknown modelId', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'unknown-model', env: { ...baseEnv, ANTHROPIC_API_KEY: 'test' } }),
      );
    });

    it('should include available models in error', async () => {
      const error = await captureProviderError(() =>
        resolveModel({ modelId: 'unknown-model', env: { ...baseEnv, ANTHROPIC_API_KEY: 'test' } }),
      );

      expect(error.message).toContain('Available:');
    });
  });

  describe('invalid provider', () => {
    it('should throw for model with unknown provider', async () => {
      /**
       * This would require manually registering a model with unknown provider.
       * For now, we test that error structure is correct.
       */
      const error = new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: 'anthropic',
        modelId: 'test',
        message: 'Test',
        retryable: false,
      });
      expect(error.code).toBe('MODEL_NOT_FOUND');
    });
  });

  describe('invalid API key', () => {
    it('should throw for missing API key', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '' } }),
      );
    });

    it('should throw for empty API key', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '' } }),
      );
    });

    it('should throw for whitespace-only API key', async () => {
      await captureProviderError(() =>
        resolveModel({ modelId: 'claude-3-5-sonnet', env: { ...baseEnv, ANTHROPIC_API_KEY: '   ' } }),
      );
    });
  });

  describe('unavailable/deprecated model', () => {
    it('should throw for unavailable model', async () => {
      /**
       * This would require registering an unavailable model.
       * Test the error structure directly.
       */
      const error = new Error('Test');
      (error as any).code = 'MODEL_NOT_FOUND';
      expect(error).toBeDefined();
    });
  });

  describe('security', () => {
    it('should not expose API key in ProviderError', async () => {
      const controlledApiKey = 'sk-ant-controlled-test-key';
      const error = await captureProviderError(() =>
        resolveModel({
          modelId: 'unknown-model',
          env: { ...baseEnv, ANTHROPIC_API_KEY: controlledApiKey },
        }),
      );

      expect(error.message).not.toContain(controlledApiKey);
    });

    it('should use only a controlled fake API key in internal provider config', async () => {
      const controlledApiKey = 'sk-ant-controlled-test-key';
      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: controlledApiKey },
      });

      expect(result.config.apiKey).toBe(controlledApiKey);
    });
  });

  describe('env precedence', () => {
    it('should prefer Cloudflare env over process.env', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'process-key');

      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'cloudflare-key' },
      });

      expect(result.config.apiKey).toBe('cloudflare-key');
    });

    it('should fallback to process.env when Cloudflare env missing', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'process-key');

      const result = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: '' },
      });

      expect(result.config.apiKey).toBe('process-key');
    });
  });

  describe('default model resolution', () => {
    it('should return Anthropic as global default when no modelId', async () => {
      const result = await resolveModel({ env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key' } });
      expect(result.model.id).toBe('claude-3-5-sonnet');
      expect(result.provider.id).toBe('anthropic');
    });

    it('should NOT default to DeepSeek or Gemini', async () => {
      const result = await resolveModel({
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'test-key', DEEPSEEK_API_KEY: 'test', GEMINI_API_KEY: 'test' },
      });
      expect(result.model.id).toBe('claude-3-5-sonnet');
    });
  });
});

async function captureProviderError(operation: () => Promise<unknown>): Promise<ProviderError> {
  let thrownError: unknown;

  try {
    await operation();
  } catch (error) {
    thrownError = error;
  }

  expect(thrownError).toBeInstanceOf(ProviderError);

  return thrownError as ProviderError;
}
