# AI Provider Architecture — Análise e Plano Técnico

> Documento de planejamento para suporte a múltiplos provedores de IA na DevX Studio.
> **Não implementa** — apenas analisa e propõe arquitetura.

## Estado implementado — Etapa 5G

Os providers built-in registrados no backend são `anthropic`, `deepseek`, `gemini` e `openai`.
Os modelos locais são, respectivamente, `claude-3-5-sonnet`, `deepseek-v4-flash`,
`gemini-3.6-flash` e `gpt-5.6-terra`. Claude permanece como default global.

O adapter OpenAI usa `OPENAI_API_KEY` exclusivamente no servidor e delega ao mesmo core
OpenAI-compatible já compartilhado por DeepSeek e Gemini, com base URL estática
`https://api.openai.com/v1`. A rota `/api/chat` permanece agnóstica a providers e recebe
apenas o `modelId` local opcional.

---

## 1. Arquitetura Atual (Anthropic Only)

### 1.1 Estrutura de Arquivos

```
app/lib/.server/llm/
├── api-key.ts          # Carregamento de chave (env + Cloudflare)
├── constants.ts        # MAX_TOKENS, MAX_RESPONSE_SEGMENTS
├── model.ts            # Factory Anthropic (claude-3-5-sonnet-20240620)
├── prompts.ts          # System prompt + CONTINUE_PROMPT
├── stream-text.ts      # Wrapper streamText (Vercel AI SDK)
├── switchable-stream.ts # TransformStream para continuidade
```

### 1.2 Fluxo de Requisição

```
api.chat.ts (POST /api/chat)
    │
    ▼
streamText(messages, env, options)
    │
    ├── getAPIKey(env) ──────────► api-key.ts
    ├── getAnthropicModel(key) ──► model.ts
    ├── getSystemPrompt() ───────► prompts.ts
    └── streamText (AI SDK) ─────► @ai-sdk/anthropic
    │
    ▼
SwitchableStream (continuation handling)
    │
    ▼
Response (text/plain stream)
```

### 1.3 Pontos de Integração

| Arquivo | Responsabilidade |
|---------|------------------|
| `api.chat.ts` | Endpoint principal: recebe mensagens, orquestra streaming, gerencia continuação |
| `api.enhancer.ts` | Endpoint secundário: melhora prompts do usuário |
| `stream-text.ts` | Wrapper do `ai.streamText` com configuração Anthropic |
| `model.ts` | Cria instância `anthropic('claude-3-5-sonnet-20240620')` |
| `api-key.ts` | Resolve `ANTHROPIC_API_KEY` de `process.env` ou Cloudflare `env` |
| `prompts.ts` | System prompt fixo + exemplos + `CONTINUE_PROMPT` |
| `constants.ts` | `MAX_TOKENS=8192`, `MAX_RESPONSE_SEGMENTS=2` |
| `switchable-stream.ts` | Permite trocar stream fonte (continuação) |

---

## 2. Acoplamentos Encontrados

### 2.1 Acoplamentos Diretos ao Anthropic

| Local | Código | Tipo |
|-------|--------|------|
| `model.ts` | `createAnthropic`, `anthropic('claude-3-5-sonnet-20240620')` | Factory hardcoded |
| `stream-text.ts` | `getAnthropicModel(getAPIKey(env))` | Modelo fixo |
| `api-key.ts` | `ANTHROPIC_API_KEY` | Variável de ambiente específica |
| `stream-text.ts` | `headers: { 'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' }` | Header específico |
| `package.json` | `@ai-sdk/anthropic` | Dependência única |
| `prompts.ts` | Exemplos com `boltArtifact` | Prompt não genérico |

### 2.2 Contratos que Devem Permanecer Iguais

| Contrato | Descrição | Não Quebrar |
|----------|-----------|-------------|
| **Streaming** | `streamText` retorna `ReadableStream` compatível com `SwitchableStream` | Formato de chunks, continuidade |
| **boltArtifact** | Tags `<boltArtifact>`, `<boltAction>` no system prompt | Parser (`message-parser.ts`) |
| **boltAction** | Tipos `file`/`shell` com `filePath`/`content` | `action-runner.ts` |
| **Parser** | `StreamingMessageParser` emite `onArtifactOpen/Close`, `onActionOpen/Close` | `useMessageParser.ts` |
| **Criação de arquivos** | `ActionRunner#runFileAction` escreve no WebContainer | `files.ts` watcher |
| **Execução de comandos** | `ActionRunner#runShellAction` spawn `jsh -c` | `terminal.ts`, `shell.ts` |
| **System prompt** | Define formato de artefato, constraints WebContainer | Comportamento da IA |

---

## 3. Arquitetura Proposta

### 3.1 Nova Estrutura de Diretórios

```
app/lib/.server/llm/
├── providers/
│   ├── anthropic.ts          # Adapter Anthropic (existente → movido)
│   ├── openai.ts             # Adapter OpenAI (novo)
│   ├── google.ts             # Adapter Google Gemini (novo)
│   ├── openai-compatible.ts  # Base para APIs compatíveis OpenAI (novo)
│   └── index.ts              # Exporta todos
├── provider-registry.ts      # Registro e seleção de provedores
├── model-registry.ts         # Catálogo de modelos com metadados
├── types.ts                  # Contratos compartilhados
├── capabilities.ts           # Feature flags por modelo
├── errors.ts                 # Erros normalizados
├── env.ts                    # Validação de variáveis de ambiente
├── stream-text.ts            # Wrapper genérico (refatorado)
├── switchable-stream.ts      # Inalterado
├── prompts.ts                # System prompt (parametrizado)
├── constants.ts              # Inalterado
├── api-key.ts                # Deprecated → movido para env.ts
└── model.ts                  # Deprecated → movido para providers/
```

### 3.2 Contratos Propostos (`types.ts`)

```typescript
// Capacidades suportadas por modelo
export interface ModelCapabilities {
  streaming: boolean;
  tools: boolean;           // function calling
  vision: boolean;          // imagens
  maxTokens: number;        // limite de saída
  contextWindow: number;    // tokens de entrada
}

// Metadados do modelo
export interface ModelDefinition {
  id: string;                    // ex: 'claude-3-5-sonnet'
  name: string;                  // ex: 'Claude 3.5 Sonnet'
  provider: ProviderId;          // 'anthropic' | 'openai' | 'google' | 'openai-compatible'
  capabilities: ModelCapabilities;
  status: 'available' | 'deprecated' | 'unavailable';
  envVar: string;                // ex: 'ANTHROPIC_API_KEY'
  defaultParams?: Record<string, unknown>; // temperature, top_p, etc.
}

// Identificadores de provedor
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'openai-compatible';

// Configuração do provedor
export interface ProviderConfiguration {
  id: ProviderId;
  name: string;
  baseURL?: string;              // para OpenAI-compatible
  apiKeyEnvVar: string;
  headers?: Record<string, string>;
  validateKey?: (key: string) => boolean;
}

// Request de streaming unificado
export interface StreamRequest {
  messages: CoreMessage[];       // formato Vercel AI SDK
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  abortSignal?: AbortSignal;
}

// Resultado de streaming unificado
export interface StreamResult {
  stream: ReadableStream;
  usage?: Usage;
  finishReason?: FinishReason;
}

// Erro normalizado
export interface ProviderError extends Error {
  code: ProviderErrorCode;
  provider: ProviderId;
  retryable: boolean;
  statusCode?: number;
}

export type ProviderErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_UNAVAILABLE'
  | 'CONTEXT_WINDOW_EXCEEDED'
  | 'CONTENT_FILTERED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';
```

### 3.3 Interface do Adapter (`providers/index.ts`)

```typescript
export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly name: string;
  readonly models: ModelDefinition[];
  
  // Validação de chave
  validateKey(key: string): Promise<boolean>;
  
  // Cria instância do modelo para AI SDK
  createModel(modelId: string, apiKey: string): LanguageModelV1;
  
  // Headers customizados (ex: anthropic-beta)
  getHeaders(modelId: string): Record<string, string>;
  
  // Transformação de request se necessário
  prepareRequest(request: StreamRequest): StreamRequest;
  
  // Normalização de erros
  normalizeError(error: unknown, modelId: string): ProviderError;
}
```

### 3.4 Registry (`provider-registry.ts`)

```typescript
export class ProviderRegistry {
  private adapters = new Map<ProviderId, ProviderAdapter>();
  private activeProvider: ProviderId = 'anthropic';
  
  register(adapter: ProviderAdapter): void;
  get(providerId: ProviderId): ProviderAdapter | undefined;
  getActive(): ProviderAdapter;
  setActive(providerId: ProviderId): void;
  listModels(): ModelDefinition[];
  getModel(modelId: string): ModelDefinition | undefined;
  getModelsByProvider(providerId: ProviderId): ModelDefinition[];
}
```

### 3.5 Environment (`env.ts`)

```typescript
export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnv(env: Record<string, string>): EnvValidationResult;
export function getApiKey(env: Record<string, string>, providerId: ProviderId): string | undefined;
export function getAllApiKeys(env: Record<string, string>): Map<ProviderId, string>;
```

### 3.6 Capabilities (`capabilities.ts`)

```typescript
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'claude-3-5-sonnet': { streaming: true, tools: true, vision: true, maxTokens: 8192, contextWindow: 200000 },
  'gpt-4o': { streaming: true, tools: true, vision: true, maxTokens: 4096, contextWindow: 128000 },
  'gemini-3.6-flash': { streaming: true, tools: true, vision: true, maxTokens: 65536, contextWindow: 1048576 },
  // ...
};

export function getCapabilities(modelId: string): ModelCapabilities;
export function supportsStreaming(modelId: string): boolean;
export function supportsTools(modelId: string): boolean;
export function supportsVision(modelId: string): boolean;
```

---

## 4. Estratégia de Migração

### Fase 1: Infraestrutura (Semana 1)
- [ ] Criar `types.ts`, `capabilities.ts`, `errors.ts`, `env.ts`
- [ ] Criar `ProviderAdapter` interface e `ProviderRegistry`
- [ ] Mover código Anthropic para `providers/anthropic.ts` implementando `ProviderAdapter`
- [ ] Refatorar `stream-text.ts` para usar `ProviderRegistry`
- [ ] Testes: Anthropic continua funcionando idêntico

### Fase 2: Provedores OpenAI-compatíveis (Semana 2)
- [ ] Implementar `providers/openai-compatible.ts` (base genérica)
- [ ] Implementar `providers/openai.ts` (GPT-4o, GPT-4o-mini)
- [ ] Adicionar modelos ao `ModelRegistry`
- [ ] Variáveis de ambiente: `OPENAI_API_KEY`, `OPENAI_BASE_URL` (opcional)

### Fase 3: Google Gemini (Semana 2-3)
- [ ] Implementar `providers/google.ts` (Gemini 1.5 Pro/Flash)
- [ ] Variável: `GOOGLE_API_KEY`

### Fase 4: Interface & Config (Semana 3)
- [ ] Settings store para seleção de provedor/modelo
- [ ] UI para configuração de chaves (somente servidor)
- [ ] Validação de chaves no backend
- [ ] Persistência criptografada (futuro)

### Fase 5: Modelos Locais / OpenAI-compatible (Semana 4+)
- [ ] Suporte a `baseURL` customizado (Ollama, LM Studio, vLLM)
- [ ] Detecção automática de modelos via `/v1/models`
- [ ] Fallback graceful

---

## 5. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Quebra de streaming** | Média | Alto | Testes de integração com `SwitchableStream` em cada fase |
| **Prompt incompatível** | Alta | Alto | System prompt parametrizado; manter exemplos `boltArtifact` |
| **Diferenças de tool calling** | Média | Médio | `capabilities.ts` flags; fallback graceful |
| **Rate limits diferentes** | Baixa | Médio | `ProviderErrorCode.RATE_LIMITED` + retry logic |
| **Vazamento de chaves** | Baixa | Crítico | Chaves apenas server-side; logs sanitizados |
| **Bundle size** | Baixa | Baixo | Lazy load de adapters; tree-shaking |
| **Dependência `@ai-sdk/*` versions** | Média | Médio | Pin versions; testar compatibilidade |

---

## 6. Testes Necessários

### Unitários
- [ ] `ProviderRegistry` registro/listagem
- [ ] `env.ts` validação de chaves
- [ ] `errors.ts` normalização por provedor
- [ ] `capabilities.ts` lookup de features

### Integração (por provedor)
- [ ] Streaming básico (hello world)
- [ ] Continuação (`MAX_RESPONSE_SEGMENTS`)
- [ ] Geração de `<boltArtifact>` válido
- [ ] Execução de `boltAction` (file/shell)
- [ ] Cancelamento via `AbortSignal`
- [ ] Erros: key inválida, rate limit, quota, context window

### Regressão
- [ ] Anthropic Claude 3.5 Sonnet: comportamento idêntico ao atual
- [ ] `api.enhancer.ts` continua funcionando
- [ ] `api.chat.ts` streaming + continuação
- [ ] Parser não quebra com novos modelos

---

## 7. Ordem de Implementação Recomendada

```
1. types.ts, capabilities.ts, errors.ts, env.ts
2. ProviderAdapter interface + ProviderRegistry
3. providers/anthropic.ts (migração do código existente)
4. stream-text.ts refatorado para usar registry
5. Testes de regressão Anthropic (100% paridade)
6. providers/openai-compatible.ts (base)
7. providers/openai.ts
8. providers/google.ts
8. ModelRegistry + metadados completos
9. Settings store (provider/model selection)
10. UI de configuração (server-side only)
11. OpenAI-compatible genérico (Ollama, LM Studio)
12. Documentação de migração para usuários
```

---

## 8. Critérios de Conclusão

- [ ] Anthropic funciona idêntico ao pré-migração (streaming, continuação, artefatos)
- [ ] Pelo menos 2 provedores adicionais funcionais (OpenAI + Google)
- [ ] Seleção de modelo via settings persiste
- [ ] Chaves nunca expostas ao cliente
- [ ] Erros normalizados e acionáveis
- [ ] Logs sem conteúdo sensível
- [ ] Documentação de como adicionar novo provedor
- [ ] Bundle size aumento < 50KB gzipped

---

## 9. Arquivos Analisados (Resumo)

| Arquivo | Status |
|---------|--------|
| `app/lib/.server/llm/api-key.ts` | Analisado |
| `app/lib/.server/llm/model.ts` | Analisado |
| `app/lib/.server/llm/constants.ts` | Analisado |
| `app/lib/.server/llm/stream-text.ts` | Analisado |
| `app/lib/.server/llm/switchable-stream.ts` | Analisado |
| `app/lib/.server/llm/prompts.ts` | Analisado |
| `app/routes/api.chat.ts` | Analisado |
| `app/routes/api.enhancer.ts` | Analisado |
| `app/lib/runtime/message-parser.ts` | Referenciado (contrato) |
| `app/lib/runtime/action-runner.ts` | Referenciado (contrato) |
| `package.json` | Dependências verificadas |

---

## 10. Confirmações

- ✅ **Nenhum arquivo funcional foi alterado** nesta etapa
- ✅ **Nenhuma dependência foi instalada**
- ✅ **Provedor Anthropic permanece intacto**
- ✅ **Prompts, parser, WebContainer, protocolo inalterados**
- ✅ **Interface não foi modificada**

---

*Documento gerado para planejamento — Etapa 5A concluída. Aguardando autorização para implementação (Etapa 5B).*
