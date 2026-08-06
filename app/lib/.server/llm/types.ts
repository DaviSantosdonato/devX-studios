/**
 * Contratos de tipos para provedores de IA.
 * Definições puras sem implementação.
 */

import type { LanguageModel } from 'ai';

/**
 * Identificadores de provedores suportados.
 * Extensível para novos provedores sem quebrar existentes.
 */
export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openai-compatible'
  | 'local';

/**
 * Capacidades funcionais suportadas por um modelo.
 * Reflete apenas o que o código atual utiliza ou pode vir a utilizar.
 */
export interface ModelCapabilities {
  /** Streaming de resposta (chunks incrementais) */
  streaming: boolean;
  /** Function calling / tool calling */
  toolCalling: boolean;
  /** Suporte a entrada de imagens (vision) */
  vision: boolean;
  /** Raciocínio estruturado (ex: chain-of-thought) */
  reasoning: boolean;
  /** Suporte a system prompt dedicado */
  systemPrompt: boolean;
  /** Janela de contexto máxima (tokens de entrada) */
  maximumContextTokens: number;
  /** Saída máxima (tokens de resposta) */
  maximumOutputTokens: number;
}

/**
 * Status operacional de um modelo.
 */
export type ModelStatus =
  | 'available'
  | 'unavailable'
  | 'experimental'
  | 'deprecated';

/**
 * Definição completa de um modelo.
 */
export interface ModelDefinition {
  /** Identificador interno único (ex: 'claude-3-5-sonnet') */
  id: string;
  /** Nome público exibido na UI (ex: 'Claude 3.5 Sonnet') */
  name: string;
  /** Provedor ao qual o modelo pertence */
  providerId: ProviderId;
  /** Capacidades funcionais do modelo */
  capabilities: ModelCapabilities;
  /** Status operacional */
  status: ModelStatus;
  /** Variável de ambiente necessária para a chave da API (ex: 'ANTHROPIC_API_KEY') */
  requiredEnvVar: string;
  /** Identificador do modelo na API remota (ex: 'claude-3-5-sonnet-20240620') */
  remoteModelId: string;
  /** Se este é o modelo padrão do provedor */
  isDefault: boolean;
  /** Descrição opcional para exibição */
  description?: string;
}

/**
 * Configuração de conexão do provedor (server-side only).
 * Nunca serializada para o cliente.
 */
export interface ProviderConfiguration {
  /** Chave da API (nunca exposta ao cliente) */
  apiKey: string;
  /** URL base opcional para APIs compatíveis com OpenAI */
  baseURL?: string;
  /** Timeout em milissegundos para requisições */
  timeout?: number;
  /** Headers adicionais sanitizados */
  headers?: Record<string, string>;
}

/**
 * Interface mínima que todo adapter de provedor deve implementar.
 * Não acopla a nenhum provedor específico.
 */
export interface ProviderAdapter {
  /** Identificador único do provedor */
  readonly id: ProviderId;
  /** Nome público do provedor */
  readonly name: string;
  /** Lista de modelos suportados por este adapter */
  readonly models: readonly ModelDefinition[];

  /**
   * Valida se a configuração permite operar (ex: chave presente e válida).
   */
  validateConfig(config: ProviderConfiguration): Promise<boolean>;

  /**
   * Cria a instância do modelo compatível com Vercel AI SDK.
   * Retorna um LanguageModel pronto para uso com streamText.
   */
  createModel(config: ProviderConfiguration, modelId: string): LanguageModel;

  /**
   * Normaliza erros do provedor para ProviderError.
   */
  normalizeError(error: unknown, modelId: string): ProviderError;

  /**
   * Retorna as capacidades de um modelo específico.
   */
  getCapabilities(modelId: string): ModelCapabilities | undefined;
}

/**
 * Códigos de erro normalizados entre provedores.
 */
export type ProviderErrorCode =
  | 'INVALID_API_KEY'
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'REQUEST_ABORTED'
  | 'INVALID_CONFIGURATION'
  | 'UNKNOWN_PROVIDER_ERROR';

/**
 * Erro normalizado entre provedores.
 * Mensagem pública segura (sem segredos).
 */
export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly providerId: ProviderId;
  public readonly modelId?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly cause?: Error;

  constructor(options: {
    code: ProviderErrorCode;
    providerId: ProviderId;
    modelId?: string;
    message: string;
    statusCode?: number;
    retryable?: boolean;
    cause?: Error;
  }) {
    super(options.message);
    this.name = 'ProviderError';
    this.code = options.code;
    this.providerId = options.providerId;
    this.modelId = options.modelId;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;

    // Preserva stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }

  /**
   * Cria erro a partir de erro desconhecido, tentando normalizar.
   */
  static fromUnknown(
    error: unknown,
    providerId: ProviderId,
    modelId?: string
  ): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    const err = error as Error & { status?: number; response?: { status?: number } };
    const statusCode = err.status ?? err.response?.status;

    // Mapeia status HTTP comuns
    let code: ProviderErrorCode = 'UNKNOWN_PROVIDER_ERROR';
    let retryable = false;

    if (statusCode === 401) {
      code = 'INVALID_API_KEY';
    } else if (statusCode === 404) {
      code = 'MODEL_NOT_FOUND';
    } else if (statusCode === 429) {
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (statusCode && statusCode >= 500) {
      code = 'PROVIDER_UNAVAILABLE';
      retryable = true;
    } else if (err.name === 'AbortError' || err.message?.includes('abort')) {
      code = 'REQUEST_ABORTED';
    } else if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      code = 'TIMEOUT';
      retryable = true;
    }

    return new ProviderError({
      code,
      providerId,
      modelId,
      message: err.message ?? 'Erro desconhecido do provedor',
      statusCode,
      retryable,
      cause: error instanceof Error ? error : undefined,
    });
  }

  /**
   * Mensagem segura para exibição ao usuário (sem segredos).
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'INVALID_API_KEY':
        return 'Chave de API inválida ou expirada. Verifique sua configuração.';
      case 'MISSING_API_KEY':
        return 'Chave de API não configurada. Adicione a variável de ambiente necessária.';
      case 'RATE_LIMITED':
        return 'Limite de requisições excedido. Tente novamente em alguns instantes.';
      case 'MODEL_NOT_FOUND':
        return `Modelo "${this.modelId ?? 'desconhecido'}" não encontrado ou indisponível.`;
      case 'PROVIDER_UNAVAILABLE':
        return 'Provedor temporariamente indisponível. Tente novamente mais tarde.';
      case 'TIMEOUT':
        return 'A requisição expirou. Tente novamente.';
      case 'REQUEST_ABORTED':
        return 'A requisição foi cancelada.';
      case 'INVALID_CONFIGURATION':
        return 'Configuração do provedor inválida. Verifique a documentação.';
      default:
        return 'Ocorreu um erro ao comunicar com o provedor de IA. Tente novamente.';
    }
  }
}