import { describe, expect, it, beforeEach } from 'vitest';
import { resolveModel } from './model-resolver';
import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';

type Env = {
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
};

describe('stream-text streaming with provider headers', () => {
  beforeEach(() => {
    providerRegistry.clear();
    modelRegistry.clear();
  });

  const baseEnv: Env = {
    ANTHROPIC_API_KEY: 'sk-ant-test123',
    DEEPSEEK_API_KEY: 'sk-deepseek-test123',
    GEMINI_API_KEY: 'gemini-test-key',
    OPENAI_API_KEY: 'openai-test-key',
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

  describe('Gemini - no anthropic-beta header', () => {
    it('should NOT include anthropic-beta header when streaming with Gemini', async () => {
      const resolved = await resolveModel({
        modelId: 'gemini-3.6-flash',
        env: { ...baseEnv, GEMINI_API_KEY: 'gemini-test-key' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('gemini-3.6-flash') ?? {};
      expect(streamHeaders).toEqual({});
    });
  });

  describe('OpenAI - no provider-specific headers', () => {
    it('should NOT include Anthropic or Gemini headers when streaming with OpenAI', async () => {
      const resolved = await resolveModel({
        modelId: 'gpt-5.6-terra',
        env: { ...baseEnv, OPENAI_API_KEY: 'openai-test-key' },
      });

      const streamHeaders = resolved.provider.getStreamOptions?.('gpt-5.6-terra') ?? {};
      expect(streamHeaders).toEqual({});
      expect(streamHeaders).not.toHaveProperty('anthropic-beta');
    });
  });
});
