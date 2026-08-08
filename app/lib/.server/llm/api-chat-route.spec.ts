import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderError } from '~/lib/.server/llm/errors';
import { modelRegistry } from '~/lib/.server/llm/model-registry';
import { resolveModel } from '~/lib/.server/llm/model-resolver';
import { providerRegistry } from '~/lib/.server/llm/provider-registry';
import type { Messages, StreamingOptions } from '~/lib/.server/llm/stream-text';
import { action } from '~/routes/api.chat';

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
}));

vi.mock('~/lib/.server/llm/stream-text', () => ({
  streamText: streamTextMock,
}));

const testEnv: Env = {
  ANTHROPIC_API_KEY: 'sk-ant-route-test',
  DEEPSEEK_API_KEY: 'sk-deepseek-route-test',
  NVIDIA_API_KEY: 'nvapi-route-test',
};

const messages: Messages = [{ role: 'user', content: 'Build a counter.' }];
const PROVIDER_ENV_KEYS = ['ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'NVIDIA_API_KEY'] as const;

describe('api.chat model selection', () => {
  beforeEach(() => {
    for (const key of PROVIDER_ENV_KEYS) {
      vi.stubEnv(key, '');
    }

    streamTextMock.mockReset();
    providerRegistry.clear();
    modelRegistry.clear();

    streamTextMock.mockImplementation(async (_messages: Messages, env: Env, options?: StreamingOptions) => {
      await resolveModel({ modelId: options?.modelId, env });

      return {
        toAIStream: () => emptyAIStream(),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('backward compatibility', () => {
    it('accepts a request without modelId', async () => {
      const response = await action(createActionArgs({ messages }));

      expect(response.status).toBe(200);
      expect(streamTextMock).toHaveBeenCalledOnce();
    });

    it('does not pass an explicit modelId when the request omits it', async () => {
      await action(createActionArgs({ messages }));

      const options = streamTextMock.mock.calls[0]?.[2] as StreamingOptions;
      expect(options).not.toHaveProperty('modelId');
    });

    it('continues to resolve Claude 3.5 Sonnet as the default', async () => {
      await action(createActionArgs({ messages }));

      const resolved = await resolveModel({ env: testEnv });
      expect(resolved.model.id).toBe('claude-3-5-sonnet');
      expect(resolved.provider.id).toBe('anthropic');
    });
  });

  describe('registered local model IDs', () => {
    it.each([
      ['Anthropic', 'claude-3-5-sonnet'],
      ['DeepSeek', 'deepseek-v4-flash'],
      ['NVIDIA', 'nemotron-3-ultra-550b-a55b'],
    ])('accepts and propagates the %s modelId', async (_provider, modelId) => {
      const response = await action(createActionArgs({ messages, modelId }));

      expect(response.status).toBe(200);
      expect(streamTextMock).toHaveBeenCalledWith(expect.any(Array), testEnv, expect.objectContaining({ modelId }));
    });

    it('trims modelId before propagation', async () => {
      const response = await action(createActionArgs({ messages, modelId: '  deepseek-v4-flash  ' }));

      expect(response.status).toBe(200);
      expect(streamTextMock).toHaveBeenCalledWith(
        expect.any(Array),
        testEnv,
        expect.objectContaining({ modelId: 'deepseek-v4-flash' }),
      );
    });
  });

  describe('invalid modelId input', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace', '   \t\n'],
      ['a number', 123],
      ['an object', { id: 'claude-3-5-sonnet' }],
      ['an array', ['claude-3-5-sonnet']],
    ])('rejects %s', async (_description, modelId) => {
      const response = await action(createActionArgs({ messages, modelId }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: 'INVALID_MODEL_ID',
          message: 'modelId must be a non-empty string.',
        },
      });
      expect(streamTextMock).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown local ID', 'does-not-exist'],
      ['a URL', 'https://evil.example/v1'],
      ['path traversal', '../../etc/passwd'],
      ['an unregistered remote model ID', 'nvidia/nemotron-3-ultra-550b-a55b'],
      ['a provider assignment', 'providerId=nvidia'],
      ['a base URL assignment', 'baseURL=http://localhost:3000/v1'],
      ['an API key assignment', 'apiKey=client-secret-value'],
    ])('rejects %s through the model registry', async (_description, modelId) => {
      const response = await action(createActionArgs({ messages, modelId }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'The requested modelId is not registered.',
        },
      });
    });
  });

  describe('infrastructure input isolation', () => {
    it.each([
      ['providerId', { providerId: 'nvidia' }],
      ['baseURL', { baseURL: 'https://evil.example/v1' }],
      ['remoteModelId', { remoteModelId: 'nvidia/nemotron-3-ultra-550b-a55b' }],
      ['apiKey', { apiKey: 'client-api-key' }],
      ['headers', { headers: { Authorization: 'Bearer client-token' } }],
      ['Authorization', { Authorization: 'Bearer client-token' }],
      ['ProviderConfiguration', { ProviderConfiguration: { apiKey: 'client-api-key' } }],
    ])('ignores client-supplied %s configuration', async (_field, injectedConfiguration) => {
      const response = await action(createActionArgs({ messages, ...injectedConfiguration }));

      expect(response.status).toBe(200);

      const options = streamTextMock.mock.calls[0]?.[2] as StreamingOptions;
      expect(options).not.toHaveProperty('modelId');
      expect(options).not.toHaveProperty('providerId');
      expect(options).not.toHaveProperty('baseURL');
      expect(options).not.toHaveProperty('remoteModelId');
      expect(options).not.toHaveProperty('apiKey');
      expect(options).not.toHaveProperty('headers');
      expect(options).not.toHaveProperty('Authorization');
      expect(options).not.toHaveProperty('ProviderConfiguration');
    });

    it('does not expose a client credential embedded in an invalid modelId', async () => {
      const clientCredential = 'nvapi-client-secret-that-must-not-be-reflected';
      const response = await action(createActionArgs({ messages, modelId: clientCredential }));
      const responseText = await response.text();

      expect(response.status).toBe(400);
      expect(responseText).not.toContain(clientCredential);
      expect(responseText).not.toContain('nvapi-');
    });

    it('does not expose credentials from unexpected stream errors', async () => {
      const clientCredential = 'sk-client-secret-that-must-not-be-reflected';
      streamTextMock.mockRejectedValueOnce(
        new ProviderError({
          code: 'UNKNOWN_PROVIDER_ERROR',
          providerId: 'anthropic',
          message: `Unexpected failure: ${clientCredential}`,
          retryable: false,
        }),
      );

      let thrownError: unknown;

      try {
        await action(createActionArgs({ messages, modelId: 'claude-3-5-sonnet' }));
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Response);

      const errorResponse = thrownError as Response;
      const responseText = await errorResponse.text();

      expect(errorResponse.status).toBe(500);
      expect(errorResponse.statusText).toBe('Internal Server Error');
      expect(responseText).toBe('');
      expect(responseText).not.toContain(clientCredential);
    });
  });
});

function createActionArgs(body: Record<string, unknown>): ActionFunctionArgs {
  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    request,
    params: {},
    context: {
      cloudflare: {
        env: testEnv,
      },
    },
  } as unknown as ActionFunctionArgs;
}

function emptyAIStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}
