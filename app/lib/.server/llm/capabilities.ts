/**
 * Definições de capacidades dos modelos.
 * Helpers puros sem efeitos colaterais.
 */

import type { ModelCapabilities, ModelDefinition } from './types';

/**
 * Catálogo de capacidades conhecidas.
 * Baseado no que o código atual utiliza (Anthropic Claude 3.5 Sonnet).
 */
export const KNOWN_CAPABILITIES: Record<string, ModelCapabilities> = {
  'claude-3-5-sonnet': {
    streaming: true,
    toolCalling: true,
    vision: true,
    reasoning: false,
    systemPrompt: true,
    maximumContextTokens: 200000,
    maximumOutputTokens: 8192,
  },
};

/**
 * Verifica se um modelo suporta uma capacidade específica.
 */
export function supportsCapability(
  model: ModelDefinition | undefined,
  capability: keyof ModelCapabilities
): boolean {
  if (!model) return false;
  return model.capabilities[capability] === true;
}

/**
 * Verifica se um modelo atende a requisitos mínimos de capacidades.
 * Lança erro descritivo se não suportar.
 */
export function requireCapabilities(
  model: ModelDefinition | undefined,
  required: (keyof ModelCapabilities)[]
): asserts model is ModelDefinition {
  if (!model) {
    throw new Error('Modelo não definido');
  }

  const missing = required.filter((cap) => !model.capabilities[cap]);

  if (missing.length > 0) {
    throw new Error(
      `Modelo "${model.id}" não suporta as capacidades requeridas: ${missing.join(', ')}`
    );
  }
}

/**
 * Obtém as capacidades de um modelo pelo ID interno.
 * Retorna undefined se modelo não catalogado.
 */
export function getCapabilities(modelId: string): ModelCapabilities | undefined {
  return KNOWN_CAPABILITIES[modelId];
}

/**
 * Verifica se um modelo suporta streaming.
 */
export function supportsStreaming(model: ModelDefinition | undefined): boolean {
  return supportsCapability(model, 'streaming');
}

/**
 * Verifica se um modelo suporta tool calling.
 */
export function supportsToolCalling(model: ModelDefinition | undefined): boolean {
  return supportsCapability(model, 'toolCalling');
}

/**
 * Verifica se um modelo suporta visão (imagens).
 */
export function supportsVision(model: ModelDefinition | undefined): boolean {
  return supportsCapability(model, 'vision');
}

/**
 * Verifica se um modelo suporta system prompt dedicado.
 */
export function supportsSystemPrompt(model: ModelDefinition | undefined): boolean {
  return supportsCapability(model, 'systemPrompt');
}

/**
 * Retorna a capacidade máxima de tokens de contexto.
 */
export function getMaxContextTokens(model: ModelDefinition | undefined): number {
  return model?.capabilities.maximumContextTokens ?? 0;
}

/**
 * Retorna a capacidade máxima de tokens de saída.
 */
export function getMaxOutputTokens(model: ModelDefinition | undefined): number {
  return model?.capabilities.maximumOutputTokens ?? 0;
}