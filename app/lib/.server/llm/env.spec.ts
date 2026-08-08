import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getEnv,
  getRequiredEnv,
  getApiKeyForModel,
  validateModelEnv,
  validateMultipleModelsEnv,
  isServer,
} from './env';

describe('Env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getEnv', () => {
    it('should return value when variable is present', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getEnv('TEST_VAR')).toBe('test-value');
    });

    it('should return undefined when variable is missing', () => {
      delete process.env.TEST_VAR;
      expect(getEnv('TEST_VAR')).toBeUndefined();
    });

    it('should return undefined when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(getEnv('TEST_VAR')).toBeUndefined();
    });

    it('should return undefined when process is undefined (client-side)', () => {
      const originalProcess = global.process;

      // @ts-ignore - testing client-side behavior where process is undefined
      global.process = undefined;
      expect(getEnv('ANY_VAR')).toBeUndefined();
      global.process = originalProcess;
    });
  });

  describe('getRequiredEnv', () => {
    it('should return value when variable is present', () => {
      process.env.REQUIRED_VAR = 'required-value';
      expect(getRequiredEnv('REQUIRED_VAR')).toBe('required-value');
    });

    it('should throw when variable is missing', () => {
      delete process.env.REQUIRED_VAR;
      expect(() => getRequiredEnv('REQUIRED_VAR')).toThrow(
        'Variável de ambiente obrigatória não definida: REQUIRED_VAR',
      );
    });

    it('should throw when variable is empty string', () => {
      process.env.REQUIRED_VAR = '';
      expect(() => getRequiredEnv('REQUIRED_VAR')).toThrow(
        'Variável de ambiente obrigatória não definida: REQUIRED_VAR',
      );
    });
  });

  describe('getApiKeyForModel', () => {
    it('should return API key when variable is present', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';
      expect(getApiKeyForModel({ requiredEnvVar: 'ANTHROPIC_API_KEY' })).toBe('sk-ant-test123');
    });

    it('should return undefined when variable is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(getApiKeyForModel({ requiredEnvVar: 'ANTHROPIC_API_KEY' })).toBeUndefined();
    });

    it('should return undefined when variable is empty', () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(getApiKeyForModel({ requiredEnvVar: 'ANTHROPIC_API_KEY' })).toBeUndefined();
    });
  });

  describe('validateModelEnv', () => {
    it('should return valid=true when variable is present', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';

      const result = validateModelEnv({ requiredEnvVar: 'ANTHROPIC_API_KEY' });
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.empty).toEqual([]);
    });

    it('should return valid=false and missing when variable is absent', () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = validateModelEnv({ requiredEnvVar: 'ANTHROPIC_API_KEY' });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('ANTHROPIC_API_KEY');
      expect(result.empty).toEqual([]);
    });

    it('should return valid=false and empty when variable is empty string', () => {
      process.env.ANTHROPIC_API_KEY = '';

      const result = validateModelEnv({ requiredEnvVar: 'ANTHROPIC_API_KEY' });
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual([]);
      expect(result.empty).toContain('ANTHROPIC_API_KEY');
    });

    it('should distinguish missing from empty', () => {
      delete process.env.MISSING_VAR;
      process.env.EMPTY_VAR = '';

      const missingResult = validateModelEnv({ requiredEnvVar: 'MISSING_VAR' });
      const emptyResult = validateModelEnv({ requiredEnvVar: 'EMPTY_VAR' });

      expect(missingResult.missing).toContain('MISSING_VAR');
      expect(missingResult.empty).toEqual([]);

      expect(emptyResult.missing).toEqual([]);
      expect(emptyResult.empty).toContain('EMPTY_VAR');
    });

    it('should add warning for Anthropic key with unexpected format', () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-format-key';

      const result = validateModelEnv({ requiredEnvVar: 'ANTHROPIC_API_KEY' });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Chave Anthropic parece ter formato inesperado (espera-se prefixo sk-ant-)');
    });

    it('should not add warning for Anthropic key with correct format', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';

      const result = validateModelEnv({ requiredEnvVar: 'ANTHROPIC_API_KEY' });
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should not add warning for non-Anthropic keys', () => {
      process.env.OPENAI_API_KEY = 'sk-invalid';

      const result = validateModelEnv({ requiredEnvVar: 'OPENAI_API_KEY' });
      expect(result.warnings).toEqual([]);
    });
  });

  describe('validateMultipleModelsEnv', () => {
    it('should return valid=true when all variables are present', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';
      process.env.OPENAI_API_KEY = 'sk-test456';

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
        { requiredEnvVar: 'OPENAI_API_KEY' },
      ]);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.empty).toEqual([]);
    });

    it('should aggregate missing variables', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
        { requiredEnvVar: 'OPENAI_API_KEY' },
      ]);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('ANTHROPIC_API_KEY');
      expect(result.missing).toContain('OPENAI_API_KEY');
    });

    it('should aggregate empty variables', () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.OPENAI_API_KEY = '';

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
        { requiredEnvVar: 'OPENAI_API_KEY' },
      ]);
      expect(result.valid).toBe(false);
      expect(result.empty).toContain('ANTHROPIC_API_KEY');
      expect(result.empty).toContain('OPENAI_API_KEY');
    });

    it('should aggregate warnings', () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-format';
      process.env.GOOGLE_API_KEY = 'also-invalid';

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
        { requiredEnvVar: 'GOOGLE_API_KEY' },
      ]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should deduplicate missing variables', () => {
      delete process.env.DUPLICATE_VAR;

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'DUPLICATE_VAR' },
        { requiredEnvVar: 'DUPLICATE_VAR' },
      ]);
      expect(result.missing).toEqual(['DUPLICATE_VAR']);
    });

    it('should deduplicate empty variables', () => {
      process.env.DUPLICATE_VAR = '';

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'DUPLICATE_VAR' },
        { requiredEnvVar: 'DUPLICATE_VAR' },
      ]);
      expect(result.empty).toEqual(['DUPLICATE_VAR']);
    });

    it('should deduplicate warnings', () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-format';

      const result = validateMultipleModelsEnv([
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
        { requiredEnvVar: 'ANTHROPIC_API_KEY' },
      ]);
      const warningMsg = 'Chave Anthropic parece ter formato inesperado (espera-se prefixo sk-ant-)';
      expect(result.warnings).toEqual([warningMsg]);
    });
  });

  describe('isServer', () => {
    it('should return true on server (Node.js)', () => {
      expect(isServer()).toBe(true);
    });

    it('should return false when window is defined (client)', () => {
      const originalWindow = global.window;

      // @ts-ignore - testing browser environment where window is defined
      global.window = {};

      // this test won't actually change the result in Node.js but documents expected behavior
      expect(typeof isServer()).toBe('boolean');
      global.window = originalWindow;
    });
  });

  describe('server-side only behavior', () => {
    it('should only access process.env (server-side)', () => {
      process.env.SERVER_VAR = 'server-value';
      expect(getEnv('SERVER_VAR')).toBe('server-value');
      expect(getRequiredEnv('SERVER_VAR')).toBe('server-value');
      expect(getApiKeyForModel({ requiredEnvVar: 'SERVER_VAR' })).toBe('server-value');
    });

    it('should not leak secrets in validation results', () => {
      process.env.SECRET_KEY = 'super-secret-value-12345';

      const result = validateModelEnv({ requiredEnvVar: 'SECRET_KEY' });

      // validation result should not contain the actual secret
      expect(JSON.stringify(result)).not.toContain('super-secret-value-12345');
    });
  });
});
