import { describe, expect, it, beforeEach } from 'vitest';
import { KNOWN_PROVIDER_IDS, ModelRegistry } from './model-registry';
import type { ModelDefinition, ProviderId, ModelCapabilities, ModelStatus } from './types';

function createMockModel(overrides: Partial<ModelDefinition> = {}): ModelDefinition {
  const capabilities: ModelCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 200000,
    maximumOutputTokens: 8192,
  };

  return {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    providerId: 'anthropic',
    capabilities,
    status: 'available',
    requiredEnvVar: 'ANTHROPIC_API_KEY',
    remoteModelId: 'claude-3-5-sonnet-20240620',
    isDefault: true,
    ...overrides,
  };
}

function createOpenAIModel(overrides: Partial<ModelDefinition> = {}): ModelDefinition {
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
    id: 'gpt-4',
    name: 'GPT-4',
    providerId: 'openai',
    capabilities,
    status: 'available',
    requiredEnvVar: 'OPENAI_API_KEY',
    remoteModelId: 'gpt-4',
    isDefault: true,
    ...overrides,
  };
}

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  it('lists exactly the current built-in provider IDs', () => {
    expect(KNOWN_PROVIDER_IDS).toEqual(['anthropic', 'deepseek', 'gemini', 'openai']);
  });

  it('should register a valid model', () => {
    const model = createMockModel();
    registry.register(model);
    expect(registry.has('claude-3-5-sonnet')).toBe(true);
  });

  it('should get registered model', () => {
    const model = createMockModel();
    registry.register(model);

    const retrieved = registry.get('claude-3-5-sonnet');
    expect(retrieved).toEqual(model);
  });

  it('should return undefined for non-existent model with tryGet', () => {
    const result = registry.tryGet('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should throw error for non-existent model with get', () => {
    expect(() => registry.get('nonexistent')).toThrow('Modelo "nonexistent" não encontrado');
  });

  it('should reject duplicate model ID', () => {
    const model1 = createMockModel();
    const model2 = createMockModel({ name: 'Different Name' });
    registry.register(model1);
    expect(() => registry.register(model2)).toThrow('Modelo com ID "claude-3-5-sonnet" já está registrado');
  });

  it('should filter models by provider', () => {
    const model1 = createMockModel({ id: 'claude-3-5-sonnet' });
    const model2 = createOpenAIModel({ id: 'gpt-4' });
    registry.register(model1);
    registry.register(model2);

    const anthropicModels = registry.getByProvider('anthropic');
    expect(anthropicModels.length).toBe(1);
    expect(anthropicModels[0].providerId).toBe('anthropic');
  });

  it('should filter models by status', () => {
    const model1 = createMockModel({ id: 'model-1', status: 'available' });
    const model2 = createMockModel({ id: 'model-2', status: 'experimental', isDefault: false });
    const model3 = createOpenAIModel({ id: 'model-3', status: 'available' });
    registry.register(model1);
    registry.register(model2);
    registry.register(model3);

    const available = registry.getByStatus('available');
    expect(available.length).toBe(2);
    expect(available.every((m) => m.status === 'available')).toBe(true);
  });

  it('should get default model for provider', () => {
    const model = createMockModel();
    registry.register(model);

    const defaultModel = registry.getDefault('anthropic');
    expect(defaultModel.id).toBe('claude-3-5-sonnet');
    expect(defaultModel.isDefault).toBe(true);
  });

  it('should throw when no default model for provider', () => {
    const model = createMockModel({ isDefault: false });
    registry.register(model);
    expect(() => registry.getDefault('anthropic')).toThrow('Nenhum modelo padrão definido para provider "anthropic"');
  });

  it('should return undefined for tryGetDefault when no default', () => {
    const model = createMockModel({ isDefault: false });
    registry.register(model);

    const result = registry.tryGetDefault('anthropic');
    expect(result).toBeUndefined();
  });

  it('should reject two default models for same provider', () => {
    const model1 = createMockModel({ id: 'model-1', isDefault: true });
    const model2 = createMockModel({ id: 'model-2', isDefault: true });
    registry.register(model1);
    expect(() => registry.register(model2)).toThrow('Já existe modelo padrão para provider "anthropic"');
  });

  it('should accept defaults independent in different providers', () => {
    const model1 = createMockModel({ id: 'model-1', isDefault: true });
    const model2 = createOpenAIModel({ id: 'model-2', isDefault: true });
    registry.register(model1);
    registry.register(model2);
    expect(registry.getDefault('anthropic').id).toBe('model-1');
    expect(registry.getDefault('openai').id).toBe('model-2');
  });

  it('should reject invalid providerId', () => {
    const model = createMockModel({ providerId: 'invalid' as ProviderId });
    expect(() => registry.register(model)).toThrow('ProviderId "invalid" não reconhecido');
  });

  it('should validate required capabilities fields', () => {
    const model = createMockModel({ capabilities: null as unknown as ModelCapabilities });
    expect(() => registry.register(model)).toThrow('Modelo "claude-3-5-sonnet" deve ter capabilities válidas');
  });

  it('should validate required fields', () => {
    const model = createMockModel({ id: '', requiredEnvVar: '' });
    expect(() => registry.register(model)).toThrow('Modelo "" tem campos obrigatórios faltando');
  });

  it('should validate status', () => {
    const model = createMockModel({ status: 'invalid' as ModelStatus });
    expect(() => registry.register(model)).toThrow('Modelo "claude-3-5-sonnet" tem status inválido: invalid');
  });

  it('should list all models', () => {
    const model1 = createMockModel({ id: 'model-1' });
    const model2 = createOpenAIModel({ id: 'model-2' });
    registry.register(model1);
    registry.register(model2);

    const list = registry.list();
    expect(list.length).toBe(2);
  });

  it('should remove model', () => {
    const model = createMockModel();
    registry.register(model);
    expect(registry.remove('claude-3-5-sonnet')).toBe(true);
    expect(registry.has('claude-3-5-sonnet')).toBe(false);
  });

  it('should remove default tracking when removing default model', () => {
    const model = createMockModel();
    registry.register(model);
    registry.remove('claude-3-5-sonnet');
    expect(registry.tryGetDefault('anthropic')).toBeUndefined();
  });

  it('should clear all models', () => {
    const model1 = createMockModel({ id: 'model-1' });
    const model2 = createOpenAIModel({ id: 'model-2' });
    registry.register(model1);
    registry.register(model2);
    registry.clear();
    expect(registry.size()).toBe(0);
  });

  it('should return correct size', () => {
    expect(registry.size()).toBe(0);
    registry.register(createMockModel({ id: 'model-1' }));
    expect(registry.size()).toBe(1);
    registry.register(createOpenAIModel({ id: 'model-2' }));
    expect(registry.size()).toBe(2);
  });
});
