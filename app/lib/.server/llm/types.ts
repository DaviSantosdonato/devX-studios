/**
 * Type contracts for AI providers.
 * Pure definitions without implementation.
 */

import type { LanguageModel } from 'ai';

/**
 * Supported provider identifiers.
 * Extensible for new providers without breaking existing ones.
 */
export type ProviderId = 'anthropic' | 'deepseek' | 'nvidia' | 'openai' | 'google' | 'openai-compatible' | 'local';

/**
 * Functional capabilities supported by a model.
 * Reflects only what current code uses or may use.
 */
export interface ModelCapabilities {
  /** Streaming response (incremental chunks) */
  streaming: boolean;

  /** Function calling / tool calling */
  toolCalling: boolean;

  /** Image input support (vision) */
  vision: boolean;

  /** Structured reasoning (e.g., chain-of-thought) */
  reasoning: boolean;

  /** Dedicated system prompt support */
  systemPrompt: boolean;

  /** Maximum context window (input tokens) */
  maximumContextTokens: number;

  /** Maximum output (response tokens) */
  maximumOutputTokens: number;
}

/**
 * Operational status of a model.
 */
export type ModelStatus = 'available' | 'unavailable' | 'experimental' | 'deprecated';

/**
 * Complete model definition.
 */
export interface ModelDefinition {
  /** Unique internal identifier (e.g., 'claude-3-5-sonnet') */
  id: string;

  /** Public name displayed in UI (e.g., 'Claude 3.5 Sonnet') */
  name: string;

  /** Provider to which the model belongs */
  providerId: ProviderId;

  /** Functional capabilities of the model */
  capabilities: ModelCapabilities;

  /** Operational status */
  status: ModelStatus;

  /** Required environment variable for API key (e.g., 'ANTHROPIC_API_KEY') */
  requiredEnvVar: string;

  /** Remote model identifier in API (e.g., 'claude-3-5-sonnet-20240620') */
  remoteModelId: string;

  /** Whether this is the provider's default model */
  isDefault: boolean;

  /** Optional description for display */
  description?: string;
}

/**
 * Provider connection configuration (server-side only).
 * Never serialized to client.
 */
export interface ProviderConfiguration {
  /** API key (never exposed to client) */
  apiKey: string;

  /** Optional base URL for OpenAI-compatible APIs */
  baseURL?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Additional sanitized headers */
  headers?: Record<string, string>;
}

/**
 * Minimum interface that every provider adapter must implement.
 * Does not couple to any specific provider.
 */
export interface ProviderAdapter {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Public provider name */
  readonly name: string;

  /** List of models supported by this adapter */
  readonly models: readonly ModelDefinition[];

  /**
   * Validates if configuration allows operation (e.g., key present and valid).
   */
  validateConfig(config: ProviderConfiguration): Promise<boolean>;

  /**
   * Creates model instance compatible with Vercel AI SDK.
   * Returns a LanguageModel ready for use with streamText.
   */
  createModel(config: ProviderConfiguration, modelId: string): LanguageModel;

  /**
   * Normalizes provider errors to ProviderError.
   */
  normalizeError(error: unknown, modelId: string): import('./errors').ProviderError;

  /**
   * Returns capabilities of a specific model.
   */
  getCapabilities(modelId: string): ModelCapabilities | undefined;
}
