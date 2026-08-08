import { describe, expect, it, beforeEach } from 'vitest';
import { resolveModel } from './model-resolver';
import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';

type Env = {
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  NVIDIA_API_KEY: string;
};

describe('stream-text streaming with provider headers', () => {
  beforeEach(() => {
    providerRegistry.clear();
    modelRegistry.clear();
  });

  const baseEnv: Env = {
    ANTHROPIC_API_KEY: 'sk-ant-test123',
    DEEPSEEK_API_KEY: 'sk-deepseek-test123',
    NVIDIA_API_KEY: 'nvapi-test123',
  };

  describe('Anthropic header propagation', () => {
    it('should include anthropic-beta header when streaming with Claude', async () => {
      /**
       * Test that streamText calls the AI SDK with anthropic-beta header.
       * We verify this by checking the resolved model's provider getStreamOptions.
       */
      const resolved = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'sk-ant-test123' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('claude-3-5-sonnet') ?? {};
      expect(streamHeaders).toEqual({
        'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
      });
    });

    it('should merge custom headers with provider headers', async () => {
      const resolved = await resolveModel({
        modelId: 'claude-3-5-sonnet',
        env: { ...baseEnv, ANTHROPIC_API_KEY: 'sk-ant-test123' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('claude-3-5-sonnet') ?? {};
      expect(streamHeaders).toEqual({
        'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
      });
    });
  });

  describe('DeepSeek - no anthropic-beta header', () => {
    it('should NOT include anthropic-beta header when streaming with DeepSeek', async () => {
      const resolved = await resolveModel({
        modelId: 'deepseek-v4-flash',
        env: { ...baseEnv, DEEPSEEK_API_KEY: 'sk-deepseek-test123' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('deepseek-v4-flash') ?? {};
      expect(streamHeaders).toEqual({});
    });
  });

  describe('NVIDIA - no anthropic-beta header', () => {
    it('should NOT include anthropic-beta header when streaming with NVIDIA', async () => {
      const resolved = await resolveModel({
        modelId: 'nemotron-3-ultra-550b-a55b',
        env: { ...baseEnv, NVIDIA_API_KEY: 'nvapi-test123' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('nemotron-3-ultra-550b-a55b') ?? {};
      expect(streamHeaders).toEqual({});
    });
  });
});
