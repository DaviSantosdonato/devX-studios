/**
 * Error normalization and sanitization between providers.
 * Pure types and helpers without side effects.
 */

import type { ProviderId } from './types';

/**
 * Normalized error codes across providers.
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
 * Normalized error across providers.
 * Safe public message (no secrets).
 */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly providerId: ProviderId;
  readonly modelId?: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly cause?: Error;

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

    // preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }

  /**
   * Creates error from unknown error, attempting to normalize.
   */
  static fromUnknown(error: unknown, providerId: ProviderId, modelId?: string): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    const err = error as Error & { status?: number; response?: { status?: number } };
    const statusCode = err.status ?? err.response?.status;

    // map common HTTP status codes
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
   * Safe message for user display (no secrets).
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'INVALID_API_KEY': {
        return 'Chave de API inválida ou expirada. Verifique sua configuração.';
      }
      case 'MISSING_API_KEY': {
        return 'Chave de API não configurada. Adicione a variável de ambiente necessária.';
      }
      case 'RATE_LIMITED': {
        return 'Limite de requisições excedido. Tente novamente em alguns instantes.';
      }
      case 'MODEL_NOT_FOUND': {
        return `Modelo "${this.modelId ?? 'desconhecido'}" não encontrado ou indisponível.`;
      }
      case 'PROVIDER_UNAVAILABLE': {
        return 'Provedor temporariamente indisponível. Tente novamente mais tarde.';
      }
      case 'TIMEOUT': {
        return 'A requisição expirou. Tente novamente.';
      }
      case 'REQUEST_ABORTED': {
        return 'A requisição foi cancelada.';
      }
      case 'INVALID_CONFIGURATION': {
        return 'Configuração do provedor inválida. Verifique a documentação.';
      }
      default: {
        return 'Ocorreu um erro ao comunicar com o provedor de IA. Tente novamente.';
      }
    }
  }
}

/**
 * Sanitizes sensitive headers removing Authorization and API keys.
 */
export function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const sanitized: Record<string, string> = {};
  const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'api_key', 'bearer', 'token'];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes request body removing API keys and tokens.
 */
export function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveKeys = [
    'api_key',
    'apiKey',
    'access_token',
    'accessToken',
    'authorization',
    'Bearer',
    'key',
    'secret',
    'password',
    'token',
  ];

  if (Array.isArray(body)) {
    return body.map(sanitizeBody);
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes error message removing possible secrets.
 * Removes API key patterns (sk-*, Bearer *, nvapi-*, etc.)
 */
export function sanitizeErrorMessage(message: string | null | undefined): string {
  if (!message) {
    return message ?? '';
  }

  // remove chaves API Anthropic (sk-ant-...)
  let sanitized = message.replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');

  // remove chaves API NVIDIA (nvapi-...)
  sanitized = sanitized.replace(/nvapi-[a-zA-Z0-9_-]{20,}/gi, '[REDACTED]');

  // remove Bearer tokens - keep "Bearer " prefix
  sanitized = sanitized.replace(/Bearer\s+([a-zA-Z0-9_.-]{20,})/gi, 'Bearer [REDACTED]');

  // remove Authorization headers inline - keep "Authorization: Bearer " prefix
  sanitized = sanitized.replace(/Authorization:\s*Bearer\s+\*+/gi, 'Authorization: Bearer [REDACTED]');

  // remove chaves API OpenAI/DeepSeek (sk-...)
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');

  // remove generic API keys
  sanitized = sanitized.replace(/api[_-]?key['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]{20,}['\"]?/gi, 'api_key: [REDACTED]');

  return sanitized;
}

/**
 * Normalizes provider errors.
 * Extracts statusCode, determines retryable and standardized code.
 */
export function normalizeProviderError(
  _error: unknown,
  _providerId: ProviderId,
  _modelId?: string,
): {
  code: ProviderErrorCode;
  message: string;
  statusCode?: number;
  retryable: boolean;
  cause?: Error;
  providerId: ProviderId;
  modelId?: string;
} {
  if (_error instanceof Error && 'code' in _error && typeof (_error as Record<string, unknown>).code === 'string') {
    // if it's already a ProviderError, return as-is
    if (_error.name === 'ProviderError') {
      return {
        code: (_error as Record<string, unknown>).code as ProviderErrorCode,
        message: _error.message,
        statusCode: (_error as Record<string, unknown>).statusCode as number | undefined,
        retryable: ((_error as Record<string, unknown>).retryable as boolean) ?? false,
        cause: _error,
        providerId: _providerId,
        modelId: _modelId,
      };
    }
  }

  const err = _error as Error & { status?: number; response?: { status?: number }; code?: string };
  const statusCode = err.status ?? err.response?.status;
  const errorCode = err.code;

  // map common HTTP status codes
  let code: ProviderErrorCode = 'UNKNOWN_PROVIDER_ERROR';
  let retryable = false;

  if (statusCode === 401) {
    code = 'INVALID_API_KEY';
  } else if (statusCode === 403) {
    code = 'INVALID_CONFIGURATION';
  } else if (statusCode === 404) {
    code = 'MODEL_NOT_FOUND';
  } else if (statusCode === 429) {
    code = 'RATE_LIMITED';
    retryable = true;
  } else if (statusCode && statusCode >= 500) {
    code = 'PROVIDER_UNAVAILABLE';
    retryable = true;
  } else if (errorCode === 'ETIMEDOUT' || err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
    code = 'TIMEOUT';
    retryable = true;
  } else if (errorCode === 'ECONNABORTED' || errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
    code = 'PROVIDER_UNAVAILABLE';
    retryable = true;
  } else if (err.name === 'AbortError' || err.message?.includes('abort')) {
    code = 'REQUEST_ABORTED';
  } else if (statusCode === 400) {
    code = 'INVALID_CONFIGURATION';
  }

  const sanitizedMessage = sanitizeErrorMessage(err.message ?? 'Erro desconhecido do provedor');

  return {
    code,
    message: sanitizedMessage,
    statusCode,
    retryable,
    cause: _error instanceof Error ? _error : undefined,
    providerId: _providerId,
    modelId: _modelId,
  };
}

/**
 * Builds ProviderError from normalized error.
 * Safe public message for user display.
 */
export function createProviderError(
  _providerId: ProviderId,
  _modelId: string | undefined,
  normalized: ReturnType<typeof normalizeProviderError>,
): ProviderError {
  return new ProviderError({
    code: normalized.code,
    providerId: normalized.providerId,
    modelId: normalized.modelId,
    message: normalized.message,
    statusCode: normalized.statusCode,
    retryable: normalized.retryable,
    cause: normalized.cause,
  });
}

// re-export ProviderId from types.ts for convenience
export type { ProviderId } from './types';
