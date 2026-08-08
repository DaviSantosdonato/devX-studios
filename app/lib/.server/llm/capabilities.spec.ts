import { describe, expect, it } from 'vitest';
import {
  supportsCapability,
  requireCapabilities,
  getCapabilities,
  supportsStreaming,
  supportsToolCalling,
  supportsVision,
  supportsSystemPrompt,
  getMaxContextTokens,
  getMaxOutputTokens,
} from './capabilities';
import type { ModelDefinition, ModelCapabilities } from './types';

const capabilities: ModelCapabilities = {
  streaming: true,
  toolCalling: true,
  vision: true,
  reasoning: false,
  systemPrompt: true,
  maximumContextTokens: 200000,
  maximumOutputTokens: 8192,
};

const model: ModelDefinition = {
  id: 'claude-3-5-sonnet',
  name: 'Claude 3.5 Sonnet',
  providerId: 'anthropic',
  capabilities,
  status: 'available',
  requiredEnvVar: 'ANTHROPIC_API_KEY',
  remoteModelId: 'claude-3-5-sonnet-20240620',
  isDefault: true,
};

const limitedModel: ModelDefinition = {
  id: 'limited-model',
  name: 'Limited Model',
  providerId: 'anthropic',
  capabilities: {
    streaming: false,
    toolCalling: false,
    vision: false,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 4096,
    maximumOutputTokens: 1024,
  },
  status: 'available',
  requiredEnvVar: 'ANTHROPIC_API_KEY',
  remoteModelId: 'limited-model',
  isDefault: false,
};

describe('Capabilities', () => {
  describe('supportsCapability', () => {
    it('should return true when capability is supported', () => {
      expect(supportsCapability(model, 'streaming')).toBe(true);
      expect(supportsCapability(model, 'toolCalling')).toBe(true);
      expect(supportsCapability(model, 'vision')).toBe(true);
      expect(supportsCapability(model, 'systemPrompt')).toBe(true);
    });

    it('should return false when capability is not supported', () => {
      expect(supportsCapability(model, 'reasoning')).toBe(false);
    });

    it('should return false for limited model', () => {
      expect(supportsCapability(limitedModel, 'streaming')).toBe(false);
      expect(supportsCapability(limitedModel, 'toolCalling')).toBe(false);
      expect(supportsCapability(limitedModel, 'vision')).toBe(false);
    });

    it('should return false for undefined model', () => {
      expect(supportsCapability(undefined, 'streaming')).toBe(false);
    });
  });

  describe('requireCapabilities', () => {
    it('should not throw when all capabilities are supported', () => {
      expect(() => requireCapabilities(model, ['streaming', 'toolCalling'])).not.toThrow();
    });

    it('should throw when capability is missing', () => {
      expect(() => requireCapabilities(limitedModel, ['streaming'])).toThrow(
        'Modelo "limited-model" não suporta as capacidades requeridas: streaming',
      );
    });

    it('should throw with all missing capabilities', () => {
      expect(() => requireCapabilities(limitedModel, ['streaming', 'toolCalling', 'vision'])).toThrow(
        'streaming, toolCalling, vision',
      );
    });

    it('should throw when model is undefined', () => {
      expect(() => requireCapabilities(undefined, ['streaming'])).toThrow('Modelo não definido');
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities for known model', () => {
      const caps = getCapabilities('claude-3-5-sonnet');
      expect(caps).toEqual(capabilities);
    });

    it('should return undefined for unknown model', () => {
      const caps = getCapabilities('unknown-model');
      expect(caps).toBeUndefined();
    });
  });

  describe('supportsStreaming', () => {
    it('should return true for streaming model', () => {
      expect(supportsStreaming(model)).toBe(true);
    });

    it('should return false for non-streaming model', () => {
      expect(supportsStreaming(limitedModel)).toBe(false);
    });

    it('should return false for undefined model', () => {
      expect(supportsStreaming(undefined)).toBe(false);
    });
  });

  describe('supportsToolCalling', () => {
    it('should return true for tool calling model', () => {
      expect(supportsToolCalling(model)).toBe(true);
    });

    it('should return false for non-tool calling model', () => {
      expect(supportsToolCalling(limitedModel)).toBe(false);
    });
  });

  describe('supportsVision', () => {
    it('should return true for vision model', () => {
      expect(supportsVision(model)).toBe(true);
    });

    it('should return false for non-vision model', () => {
      expect(supportsVision(limitedModel)).toBe(false);
    });
  });

  describe('supportsSystemPrompt', () => {
    it('should return true for system prompt model', () => {
      expect(supportsSystemPrompt(model)).toBe(true);
    });

    it('should return false for undefined model', () => {
      expect(supportsSystemPrompt(undefined)).toBe(false);
    });
  });

  describe('getMaxContextTokens', () => {
    it('should return max context tokens for model', () => {
      expect(getMaxContextTokens(model)).toBe(200000);
    });

    it('should return 0 for undefined model', () => {
      expect(getMaxContextTokens(undefined)).toBe(0);
    });

    it('should return 0 for model without capabilities', () => {
      const m: ModelDefinition | undefined = { ...model, capabilities: undefined as unknown as ModelCapabilities };
      expect(getMaxContextTokens(m)).toBe(0);
    });
  });

  describe('getMaxOutputTokens', () => {
    it('should return max output tokens for model', () => {
      expect(getMaxOutputTokens(model)).toBe(8192);
    });

    it('should return 0 for undefined model', () => {
      expect(getMaxOutputTokens(undefined)).toBe(0);
    });

    it('should return 0 for model without capabilities', () => {
      const m: ModelDefinition | undefined = { ...model, capabilities: undefined as unknown as ModelCapabilities };
      expect(getMaxOutputTokens(m)).toBe(0);
    });
  });
});
