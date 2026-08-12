import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelDefinition, ModelCapabilities, ModelStatus } from '~/lib/.server/llm/types';
import { toPublicModel } from '~/lib/.server/llm/public-catalog';

// mock process.env for server-side checks
const originalProcessEnv = { ...process.env };

describe('toPublicModel sanitizer', () => {
  const baseCapabilities: ModelCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 200000,
    maximumOutputTokens: 8192,
  };

  const createModel = (overrides: Partial<ModelDefinition> = {}): ModelDefinition => ({
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    providerId: 'anthropic',
    capabilities: baseCapabilities,
    status: 'available' as ModelStatus,
    requiredEnvVar: 'ANTHROPIC_API_KEY',
    remoteModelId: 'claude-3-5-sonnet-20240620',
    isDefault: true,
    description: 'Anthropic Claude 3.5 Sonnet - Most capable model',
    ...overrides,
  });

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    process.env = originalProcessEnv;
  });

  it('returns only allowed public fields', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect(publicModel).toEqual({
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      available: true,
      status: 'available',
      isDefault: true,
      description: 'Anthropic Claude 3.5 Sonnet - Most capable model',
    });
  });

  it('marks model as unavailable when API key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect(publicModel.available).toBe(false);
  });

  it('marks model as unavailable when API key is empty string', () => {
    process.env.ANTHROPIC_API_KEY = '';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect(publicModel.available).toBe(false);
  });

  it('NEVER includes requiredEnvVar in output', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect('requiredEnvVar' in publicModel).toBe(false);
  });

  it('NEVER includes remoteModelId in output', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect('remoteModelId' in publicModel).toBe(false);
  });

  it('NEVER includes capabilities in output', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect('capabilities' in publicModel).toBe(false);
  });

  it('NEVER includes provider configuration fields (apiKey, baseURL, headers)', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    expect('apiKey' in publicModel).toBe(false);
    expect('baseURL' in publicModel).toBe(false);
    expect('headers' in publicModel).toBe(false);
  });

  it('NEVER includes credentials or sensitive fields', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const model = createModel();
    const publicModel = toPublicModel(model);

    // check for any field that could contain secrets
    const keys = Object.keys(publicModel);
    const forbiddenKeys = [
      'apiKey',
      'secret',
      'token',
      'credential',
      'password',
      'key',
      'auth',
      'remoteModelId',
      'requiredEnvVar',
      'baseURL',
      'headers',
      'configuration',
      'capabilities',
    ];

    for (const forbidden of forbiddenKeys) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden.toLowerCase()))).toBe(false);
    }
  });

  it('handles different providers correctly', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-key';

    const deepseekModel = createModel({
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      providerId: 'deepseek',
      requiredEnvVar: 'DEEPSEEK_API_KEY',
      remoteModelId: 'deepseek-v4-flash',
      isDefault: false,
      description: 'DeepSeek V4 Flash - Fast and efficient model',
    });

    const geminiModel = createModel({
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash',
      providerId: 'gemini',
      requiredEnvVar: 'GEMINI_API_KEY',
      remoteModelId: 'gemini-3.6-flash',
      isDefault: false,
      description: 'Google Gemini 3.6 Flash - Fast multimodal reasoning model',
    });

    const openaiModel = createModel({
      id: 'gpt-5.6-terra',
      name: 'GPT-5.6 Terra',
      providerId: 'openai',
      requiredEnvVar: 'OPENAI_API_KEY',
      remoteModelId: 'gpt-5.6-terra',
      isDefault: false,
      description: 'OpenAI GPT-5.6 Terra - Balanced intelligence and cost',
    });

    expect(toPublicModel(deepseekModel).provider).toBe('deepseek');
    expect(toPublicModel(geminiModel).provider).toBe('gemini');
    expect(toPublicModel(openaiModel).provider).toBe('openai');
  });

  it('preserves all status values correctly', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const statuses: ModelStatus[] = ['available', 'unavailable', 'experimental', 'deprecated'];

    for (const status of statuses) {
      const model = createModel({ status });
      const publicModel = toPublicModel(model);
      expect(publicModel.status).toBe(status);
    }
  });

  it('isDefault is correctly exposed', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const defaultModel = createModel({ isDefault: true });
    const nonDefaultModel = createModel({ isDefault: false });

    expect(toPublicModel(defaultModel).isDefault).toBe(true);
    expect(toPublicModel(nonDefaultModel).isDefault).toBe(false);
  });
});
