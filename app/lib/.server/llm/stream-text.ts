import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { resolveModel } from './model-resolver';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'> & {
  modelId?: string;
};

export async function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  const { modelId, ...streamOptions } = options ?? {};

  const resolved = await resolveModel({ modelId, env });

  const { languageModel, model } = resolved;

  const streamHeaders = resolved.provider.getStreamOptions?.(model.id) ?? {};

  return _streamText({
    model: languageModel,
    system: getSystemPrompt(),
    maxTokens: Math.min(MAX_TOKENS, model.capabilities.maximumOutputTokens),
    headers: {
      ...streamHeaders,
      ...streamOptions.headers,
    },
    messages: convertToCoreMessages(messages),
    ...streamOptions,
  });
}
