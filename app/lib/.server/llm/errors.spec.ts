import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  sanitizeHeaders,
  sanitizeBody,
  sanitizeErrorMessage,
  normalizeProviderError,
  createProviderError,
  type ProviderErrorCode,
  type ProviderId,
} from './errors';

describe('Errors', () => {
  describe('ProviderError', () => {
    it('should create error with correct code', () => {
      const error = new ProviderError({
        code: 'INVALID_API_KEY',
        providerId: 'anthropic',
        modelId: 'claude-3-5-sonnet',
        message: 'Invalid API key',
        statusCode: 401,
        retryable: false,
      });
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.providerId).toBe('anthropic');
      expect(error.modelId).toBe('claude-3-5-sonnet');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.message).toBe('Invalid API key');
    });

    it('should default retryable to false', () => {
      const error = new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: 'openai',
        message: 'Model not found',
      });
      expect(error.retryable).toBe(false);
    });

    it('should preserve cause', () => {
      const cause = new Error('Original error');
      const error = new ProviderError({
        code: 'UNKNOWN_PROVIDER_ERROR',
        providerId: 'anthropic',
        message: 'Unknown error',
        cause,
      });
      expect(error.cause).toBe(cause);
    });

    it('should have correct name', () => {
      const error = new ProviderError({
        code: 'RATE_LIMITED',
        providerId: 'anthropic',
        message: 'Rate limited',
      });
      expect(error.name).toBe('ProviderError');
    });
  });

  describe('getUserMessage', () => {
    it('should return safe message for INVALID_API_KEY', () => {
      const error = new ProviderError({
        code: 'INVALID_API_KEY',
        providerId: 'anthropic',
        message: 'Invalid API key',
      });
      expect(error.getUserMessage()).toBe('Chave de API inválida ou expirada. Verifique sua configuração.');
    });

    it('should return safe message for MISSING_API_KEY', () => {
      const error = new ProviderError({
        code: 'MISSING_API_KEY',
        providerId: 'anthropic',
        message: 'Missing API key',
      });
      expect(error.getUserMessage()).toBe('Chave de API não configurada. Adicione a variável de ambiente necessária.');
    });

    it('should return safe message for RATE_LIMITED', () => {
      const error = new ProviderError({
        code: 'RATE_LIMITED',
        providerId: 'anthropic',
        message: 'Rate limited',
      });
      expect(error.getUserMessage()).toBe('Limite de requisições excedido. Tente novamente em alguns instantes.');
    });

    it('should return safe message for MODEL_NOT_FOUND with modelId', () => {
      const error = new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: 'anthropic',
        modelId: 'claude-3-5-sonnet',
        message: 'Model not found',
      });
      expect(error.getUserMessage()).toBe('Modelo "claude-3-5-sonnet" não encontrado ou indisponível.');
    });

    it('should return safe message for MODEL_NOT_FOUND without modelId', () => {
      const error = new ProviderError({
        code: 'MODEL_NOT_FOUND',
        providerId: 'anthropic',
        message: 'Model not found',
      });
      expect(error.getUserMessage()).toBe('Modelo "desconhecido" não encontrado ou indisponível.');
    });

    it('should return safe message for PROVIDER_UNAVAILABLE', () => {
      const error = new ProviderError({
        code: 'PROVIDER_UNAVAILABLE',
        providerId: 'anthropic',
        message: 'Provider unavailable',
      });
      expect(error.getUserMessage()).toBe('Provedor temporariamente indisponível. Tente novamente mais tarde.');
    });

    it('should return safe message for TIMEOUT', () => {
      const error = new ProviderError({
        code: 'TIMEOUT',
        providerId: 'anthropic',
        message: 'Timeout',
      });
      expect(error.getUserMessage()).toBe('A requisição expirou. Tente novamente.');
    });

    it('should return safe message for REQUEST_ABORTED', () => {
      const error = new ProviderError({
        code: 'REQUEST_ABORTED',
        providerId: 'anthropic',
        message: 'Request aborted',
      });
      expect(error.getUserMessage()).toBe('A requisição foi cancelada.');
    });

    it('should return safe message for INVALID_CONFIGURATION', () => {
      const error = new ProviderError({
        code: 'INVALID_CONFIGURATION',
        providerId: 'anthropic',
        message: 'Invalid configuration',
      });
      expect(error.getUserMessage()).toBe('Configuração do provedor inválida. Verifique a documentação.');
    });

    it('should return generic message for unknown code', () => {
      const error = new ProviderError({
        code: 'UNKNOWN_PROVIDER_ERROR',
        providerId: 'anthropic',
        message: 'Unknown error',
      });
      expect(error.getUserMessage()).toBe('Ocorreu um erro ao comunicar com o provedor de IA. Tente novamente.');
    });
  });

  describe('fromUnknown', () => {
    const createErrorWithStatus = (message: string, status: number) => {
      const error = new Error(message);
      (error as Error & { status?: number }).status = status;

      return error;
    };

    const createErrorWithCode = (message: string, code: string) => {
      const error = new Error(message);
      (error as Error & { code?: string }).code = code;

      return error;
    };

    it('should return same error if already ProviderError', () => {
      const original = new ProviderError({
        code: 'INVALID_API_KEY',
        providerId: 'anthropic',
        message: 'Invalid',
      });
      const result = ProviderError.fromUnknown(original, 'anthropic');
      expect(result).toBe(original);
    });

    it('should normalize 401 to INVALID_API_KEY', () => {
      const error = createErrorWithStatus('Unauthorized', 401);
      const result = ProviderError.fromUnknown(error, 'anthropic', 'model-1');
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.providerId).toBe('anthropic');
      expect(result.modelId).toBe('model-1');
      expect(result.retryable).toBe(false);
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = createErrorWithStatus('Not found', 404);
      const result = ProviderError.fromUnknown(error, 'anthropic');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = createErrorWithStatus('Rate limited', 429);
      const result = ProviderError.fromUnknown(error, 'anthropic');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should normalize 500+ to PROVIDER_UNAVAILABLE with retryable', () => {
      const error = createErrorWithStatus('Internal server error', 500);
      const result = ProviderError.fromUnknown(error, 'anthropic');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize AbortError to REQUEST_ABORTED', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';

      const result = ProviderError.fromUnknown(error, 'anthropic');
      expect(result.code).toBe('REQUEST_ABORTED');
    });

    it('should normalize timeout errors to TIMEOUT with retryable', () => {
      const error = createErrorWithCode('ETIMEDOUT', 'ETIMEDOUT');
      const result = ProviderError.fromUnknown(error, 'anthropic');
      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should preserve original error as cause', () => {
      const original = new Error('Original error');
      const result = ProviderError.fromUnknown(original, 'anthropic');
      expect(result.cause).toBe(original);
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact Authorization header', () => {
      const headers = { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' };
      const result = sanitizeHeaders(headers);
      expect(result?.Authorization).toBe('[REDACTED]');
      expect(result?.['Content-Type']).toBe('application/json');
    });

    it('should redact x-api-key header', () => {
      const headers = { 'x-api-key': 'secret-key', 'Content-Type': 'application/json' };
      const result = sanitizeHeaders(headers);
      expect(result?.['x-api-key']).toBe('[REDACTED]');
    });

    it('should redact api-key header', () => {
      const headers = { 'api-key': 'secret', 'Content-Type': 'application/json' };
      const result = sanitizeHeaders(headers);
      expect(result?.['api-key']).toBe('[REDACTED]');
    });

    it('should redact bearer token', () => {
      const headers = { bearer: 'token123', 'Content-Type': 'application/json' };
      const result = sanitizeHeaders(headers);
      expect(result?.bearer).toBe('[REDACTED]');
    });

    it('should handle undefined headers', () => {
      expect(sanitizeHeaders(undefined)).toBeUndefined();
    });

    it('should handle empty headers', () => {
      expect(sanitizeHeaders({})).toEqual({});
    });

    it('should be case insensitive', () => {
      const headers = { AUTHORIZATION: 'Bearer secret', 'x-api-key': 'key' };
      const result = sanitizeHeaders(headers);
      expect(result?.AUTHORIZATION).toBe('[REDACTED]');
      expect(result?.['x-api-key']).toBe('[REDACTED]');
    });
  });

  describe('sanitizeBody', () => {
    it('should redact api_key in body', () => {
      const body = { api_key: 'secret-key', model: 'gpt-4' };
      const result = sanitizeBody(body);
      expect(result).toEqual({ api_key: '[REDACTED]', model: 'gpt-4' });
    });

    it('should redact access_token in body', () => {
      const body = { access_token: 'token123', prompt: 'hello' };
      const result = sanitizeBody(body);
      expect(result).toEqual({ access_token: '[REDACTED]', prompt: 'hello' });
    });

    it('should redact nested secrets', () => {
      const body = { config: { api_key: 'secret', other: 'value' } };
      const result = sanitizeBody(body);
      expect(result).toEqual({ config: { api_key: '[REDACTED]', other: 'value' } });
    });

    it('should redact array items', () => {
      const body = [{ api_key: 'key1' }, { api_key: 'key2' }];
      const result = sanitizeBody(body);
      expect(result).toEqual([{ api_key: '[REDACTED]' }, { api_key: '[REDACTED]' }]);
    });

    it('should handle non-object values', () => {
      expect(sanitizeBody('string')).toBe('string');
      expect(sanitizeBody(123)).toBe(123);
      expect(sanitizeBody(null)).toBeNull();
      expect(sanitizeBody(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should redact Anthropic keys (sk-ant-)', () => {
      const msg = 'Error: sk-ant-abcdefghijklmnopqrstuvwxyz failed';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('Error: [REDACTED] failed');
    });

    it('should redact OpenAI keys (sk-)', () => {
      const msg = 'Error: sk-abcdefghijklmnopqrstuvwxyz failed';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('Error: [REDACTED] failed');
    });

    it('should redact Bearer tokens', () => {
      const msg = 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('Authorization: Bearer [REDACTED]');
    });

    it('should redact Authorization headers', () => {
      const msg = 'Authorization: Bearer sometokenvaluewithlongstring1234567890';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('Authorization: Bearer [REDACTED]');
    });

    it('should redact generic api_key patterns', () => {
      const msg = 'api_key=abcdefghijklmnopqrstuvwxyz123456';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('api_key: [REDACTED]');
    });

    it('should handle empty message', () => {
      expect(sanitizeErrorMessage('')).toBe('');
    });

    it('should not modify message without secrets', () => {
      const msg = 'Regular error message';
      expect(sanitizeErrorMessage(msg)).toBe(msg);
    });
  });

  describe('normalizeProviderError', () => {
    const createErrorWithStatus = (message: string, status: number) => {
      const error = new Error(message);
      (error as Error & { status?: number }).status = status;

      return error;
    };

    const createErrorWithCode = (message: string, code: string) => {
      const error = new Error(message);
      (error as Error & { code?: string }).code = code;

      return error;
    };

    it('should return same error if already ProviderError', () => {
      const original = new ProviderError({
        code: 'INVALID_API_KEY',
        providerId: 'anthropic',
        message: 'Invalid',
      });
      const result = normalizeProviderError(original, 'anthropic');
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.message).toBe('Invalid');
    });

    it('should normalize 401 to INVALID_API_KEY', () => {
      const error = createErrorWithStatus('Unauthorized', 401);
      const result = normalizeProviderError(error, 'anthropic', 'model-1');
      expect(result.code).toBe('INVALID_API_KEY');
      expect(result.retryable).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should normalize 404 to MODEL_NOT_FOUND', () => {
      const error = createErrorWithStatus('Not found', 404);
      const result = normalizeProviderError(error, 'openai');
      expect(result.code).toBe('MODEL_NOT_FOUND');
    });

    it('should normalize 429 to RATE_LIMITED with retryable', () => {
      const error = createErrorWithStatus('Rate limited', 429);
      const result = normalizeProviderError(error, 'anthropic');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should normalize 500+ to PROVIDER_UNAVAILABLE with retryable', () => {
      const error = createErrorWithStatus('Server error', 503);
      const result = normalizeProviderError(error, 'google');
      expect(result.code).toBe('PROVIDER_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should normalize AbortError to REQUEST_ABORTED', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';

      const result = normalizeProviderError(error, 'anthropic');
      expect(result.code).toBe('REQUEST_ABORTED');
    });

    it('should normalize timeout to TIMEOUT with retryable', () => {
      const error = createErrorWithCode('ETIMEDOUT', 'ETIMEDOUT');
      const result = normalizeProviderError(error, 'anthropic');
      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should sanitize message in normalized error', () => {
      const error = createErrorWithStatus('Failed with key sk-ant-abcdefghijklmnopqrstuvwxyz', 401);
      const result = normalizeProviderError(error, 'anthropic');
      expect(result.message).not.toContain('sk-ant-abcdefghijklmnopqrstuvwxyz');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should preserve original error as cause', () => {
      const original = new Error('Original');
      const result = normalizeProviderError(original, 'anthropic');
      expect(result.cause).toBe(original);
    });
  });

  describe('createProviderError', () => {
    it('should create ProviderError from normalized error', () => {
      const normalized = {
        code: 'INVALID_API_KEY' as ProviderErrorCode,
        message: 'Invalid key',
        statusCode: 401,
        retryable: false,
        cause: new Error('Original'),
        providerId: 'anthropic' as ProviderId,
        modelId: 'model-1',
      };
      const error = createProviderError('anthropic', 'model-1', normalized);
      expect(error).toBeInstanceOf(ProviderError);
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.providerId).toBe('anthropic');
      expect(error.modelId).toBe('model-1');
      expect(error.message).toBe('Invalid key');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.cause).toBe(normalized.cause);
    });
  });
});
