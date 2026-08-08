import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { ProviderError } from '~/lib/.server/llm/errors';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';

interface ChatRequestBody {
  messages: Messages;
  modelId?: unknown;
}

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, modelId: requestedModelId } = await request.json<ChatRequestBody>();
  const modelId = normalizeModelId(requestedModelId);

  if (modelId instanceof Response) {
    return modelId;
  }

  const stream = new SwitchableStream();

  try {
    const options: StreamingOptions = {
      ...(modelId === undefined ? {} : { modelId }),
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        if (finishReason !== 'length') {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText(messages, context.cloudflare.env, options);

        return stream.switchSource(result.toAIStream());
      },
    };

    const result = await streamText(messages, context.cloudflare.env, options);

    stream.switchSource(result.toAIStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'MODEL_NOT_FOUND') {
      return modelSelectionError('MODEL_NOT_FOUND', 'The requested modelId is not registered.');
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

function normalizeModelId(modelId: unknown): string | undefined | Response {
  if (modelId === undefined) {
    return undefined;
  }

  if (typeof modelId !== 'string' || modelId.trim() === '') {
    return modelSelectionError('INVALID_MODEL_ID', 'modelId must be a non-empty string.');
  }

  return modelId.trim();
}

function modelSelectionError(code: 'INVALID_MODEL_ID' | 'MODEL_NOT_FOUND', message: string): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status: 400 },
  );
}
