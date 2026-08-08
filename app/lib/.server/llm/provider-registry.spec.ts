import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ProviderRegistry } from './provider-registry';
import { ProviderError } from './errors';
import type { ProviderAdapter, ProviderId, ModelDefinition, ModelCapabilities } from './types';

function createMockAdapter(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter {
  const capabilities: ModelCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 200000,
    maximumOutputTokens: 8192,
  };

  const models: ModelDefinition[] = [
    {
      id: 'test-model',
      name: 'Test Model',
      providerId: 'anthropic',
      capabilities,
      status: 'available',
      requiredEnvVar: 'TEST_API_KEY',
      remoteModelId: 'test-model-1',
      isDefault: true,
    },
  ];

  return {
    id: 'anthropic',
    name: 'Anthropic',
    models,
    validateConfig: vi.fn().mockResolvedValue(true),
    createModel: vi.fn(),
    normalizeError: vi.fn(),
    getCapabilities: vi.fn().mockReturnValue(capabilities),
    ...overrides,
  } as ProviderAdapter;
}

function createOpenAIAdapter(): ProviderAdapter {
  const capabilities: ModelCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 128000,
    maximumOutputTokens: 4096,
  };

  return {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        providerId: 'openai',
        capabilities,
        status: 'available',
        requiredEnvVar: 'OPENAI_API_KEY',
        remoteModelId: 'gpt-4',
        isDefault: true,
      },
    ],
    validateConfig: vi.fn().mockResolvedValue(true),
    createModel: vi.fn(),
    normalizeError: vi.fn(),
    getCapabilities: vi.fn().mockReturnValue(capabilities),
  } as ProviderAdapter;
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should register a provider', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);
    expect(registry.has('anthropic')).toBe(true);
  });

  it('should get registered provider', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);

    const retrieved = registry.get('anthropic');
    expect(retrieved).toBe(adapter);
  });

  it('should return undefined for non-existent provider with tryGet', () => {
    const result = registry.tryGet('openai');
    expect(result).toBeUndefined();
  });

  it('should throw normalized ProviderError for non-existent provider with get', () => {
    expect(() => registry.get('openai')).toThrow(ProviderError);
    expect(() => registry.get('openai')).toThrow('Provider "openai" não registrado');
  });

  it('should throw normalized ProviderError with correct code for non-existent provider', () => {
    try {
      registry.get('openai');
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe('UNKNOWN_PROVIDER_ERROR');
      expect((error as ProviderError).providerId).toBe('openai');
      expect((error as ProviderError).retryable).toBe(false);
    }
  });

  it('should reject duplicate provider', () => {
    const adapter1 = createMockAdapter();
    const adapter2 = createMockAdapter();
    registry.register(adapter1);
    expect(() => registry.register(adapter2)).toThrow('Provider "anthropic" já está registrado');
  });

  it('should list providers', () => {
    const adapter1 = createMockAdapter();
    const adapter2 = createOpenAIAdapter();
    registry.register(adapter1);
    registry.register(adapter2);

    const list = registry.list();
    expect(list).toContain('anthropic');
    expect(list).toContain('openai');
    expect(list.length).toBe(2);
  });

  it('should remove provider', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);
    expect(registry.remove('anthropic')).toBe(true);
    expect(registry.has('anthropic')).toBe(false);
  });

  it('should return false when removing non-existent provider', () => {
    expect(registry.remove('anthropic')).toBe(false);
  });

  it('should not allow registration after freeze', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);
    registry.freeze();

    const adapter2 = createOpenAIAdapter();
    expect(() => registry.register(adapter2)).toThrow('Registry está congelado');
  });

  it('should not allow remove after freeze', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);
    registry.freeze();
    expect(registry.remove('anthropic')).toBe(false);
    expect(registry.has('anthropic')).toBe(true);
  });

  it('should clear all providers when not frozen', () => {
    const adapter1 = createMockAdapter();
    const adapter2 = createOpenAIAdapter();
    registry.register(adapter1);
    registry.register(adapter2);
    registry.clear();
    expect(registry.list().length).toBe(0);
  });

  it('should throw when clearing frozen registry', () => {
    const adapter = createMockAdapter();
    registry.register(adapter);
    registry.freeze();
    expect(() => registry.clear()).toThrow('Registry congelado');
  });

  it('should validate adapter has required fields', () => {
    const invalidAdapter = {
      id: 'anthropic' as ProviderId,
      name: 'Test',
      models: undefined as unknown as readonly ModelDefinition[],
      validateConfig: vi.fn(),
      createModel: vi.fn(),
      normalizeError: vi.fn(),
      getCapabilities: vi.fn(),
    } as ProviderAdapter;
    expect(() => registry.register(invalidAdapter)).toThrow('Adapter inválido: id, name e models são obrigatórios');
  });

  it('should validate models have required fields', () => {
    const adapter = createMockAdapter();

    // override models with invalid ones
    const adapterWithInvalidModels = {
      ...adapter,
      models: [{ ...adapter.models[0], id: '', requiredEnvVar: '' }],
    } as ProviderAdapter;
    expect(() => registry.register(adapterWithInvalidModels)).toThrow(
      'Modelo "" do provider "anthropic" tem campos obrigatórios faltando',
    );
  });
});
