/**
 * Utilitários de ambiente server-side.
 * Acesso seguro a variáveis de ambiente sem vazamento.
 */

import type { ModelDefinition } from './types';

/**
 * Resultado da validação de variáveis de ambiente.
 */
export interface EnvValidationResult {
  /** Se todas as variáveis necessárias estão presentes */
  valid: boolean;
  /** Variáveis ausentes */
  missing: string[];
  /** Variáveis presentes mas vazias */
  empty: string[];
  /** Avisos não bloqueantes */
  warnings: string[];
}

/**
 * Lê uma variável de ambiente do servidor.
 * Retorna undefined se não definida (distingue ausente de vazia).
 */
export function getEnv(name: string): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }
  const value = process.env[name];
  return value === '' ? undefined : value;
}

/**
 * Lê variável de ambiente obrigatória.
 * Lança erro se ausente ou vazia.
 */
export function getRequiredEnv(name: string): string {
  const value = getEnv(name);
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

/**
 * Tenta obter chave de API do modelo.
 * Retorna undefined se não configurada (não lança erro).
 */
export function getApiKeyForModel(model: { requiredEnvVar: string }): string | undefined {
  return getEnv(model.requiredEnvVar);
}

/**
 * Valida variáveis de ambiente para um modelo.
 */
export function validateModelEnv(model: { requiredEnvVar: string }): EnvValidationResult {
  const missing: string[] = [];
  const empty: string[] = [];
  const warnings: string[] = [];

  const value = getEnv(model.requiredEnvVar);
  if (value === undefined) {
    missing.push(model.requiredEnvVar);
  } else if (value.trim() === '') {
    empty.push(model.requiredEnvVar);
  }

  // Avisos para configurações comuns
  if (model.requiredEnvVar === 'ANTHROPIC_API_KEY' && value?.startsWith('sk-ant-') === false && value) {
    warnings.push('Chave Anthropic parece ter formato inesperado (espera-se prefixo sk-ant-)');
  }

  return {
    valid: missing.length === 0 && empty.length === 0,
    missing,
    empty,
    warnings,
  };
}

/**
 * Valida múltiplos modelos.
 */
export function validateMultipleModelsEnv(models: Array<{ requiredEnvVar: string }>): EnvValidationResult {
  const allMissing: string[] = [];
  const allEmpty: string[] = [];
  const allWarnings: string[] = [];

  for (const model of models) {
    const result = validateModelEnv(model);
    allMissing.push(...result.missing);
    allEmpty.push(...result.empty);
    allWarnings.push(...result.warnings);
  }

  // Remove duplicatas
  return {
    valid: allMissing.length === 0 && allEmpty.length === 0,
    missing: [...new Set(allMissing)],
    empty: [...new Set(allEmpty)],
    warnings: [...new Set(allWarnings)],
  };
}

/**
 * Sanitiza mensagem de erro para não expor segredos.
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove possíveis chaves de API do formato sk-*
  return message.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
}

/**
 * Verifica se está rodando no servidor (não no cliente).
 */
export function isServer(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && process.env !== undefined;
}