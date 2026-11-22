/**
 * Folds an OpenAI-compatible chat/completions SSE stream into one result:
 * the text, every tool call (whose arguments arrive in fragments, keyed by
 * index), the finish reason and — when the provider sends it — the usage.
 * Pure and incremental, so it is unit-tested without a network.
 */

export interface StreamedToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamAccumulator {
  content: string;
  toolCalls: StreamedToolCall[];
  finishReason: string | null;
  usage: StreamUsage | null;
  /** A chunk carried `error` — the provider failed mid-stream. */
  error: string | null;
}

interface ChunkToolCall {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface Chunk {
  choices?: Array<{ delta?: { content?: string | null; tool_calls?: ChunkToolCall[] }; finish_reason?: string | null }>;
  usage?: Partial<StreamUsage> | null;
  error?: { message?: string };
}

export const emptyAccumulator = (): StreamAccumulator => ({
  content: '',
  toolCalls: [],
  finishReason: null,
  usage: null,
  error: null,
});

function applyToolCall(acc: StreamAccumulator, part: ChunkToolCall): void {
  const index = part.index ?? acc.toolCalls.length;
  const call = acc.toolCalls[index] ?? { id: '', name: '', arguments: '' };
  if (part.id) call.id = part.id;
  if (part.function?.name) call.name += part.function.name;
  if (part.function?.arguments) call.arguments += part.function.arguments;
  acc.toolCalls[index] = call;
}

/** Apply one parsed chunk; returns the text it added (for live streaming). */
export function applyChunk(acc: StreamAccumulator, chunk: Chunk): string {
  if (chunk.error) {
    acc.error = chunk.error.message ?? 'The provider failed while streaming';
    return '';
  }
  if (chunk.usage) {
    acc.usage = {
      prompt_tokens: chunk.usage.prompt_tokens ?? 0,
      completion_tokens: chunk.usage.completion_tokens ?? 0,
      total_tokens: chunk.usage.total_tokens ?? 0,
    };
  }
  let added = '';
  for (const choice of chunk.choices ?? []) {
    const text = choice.delta?.content;
    if (text) {
      acc.content += text;
      added += text;
    }
    for (const part of choice.delta?.tool_calls ?? []) applyToolCall(acc, part);
    if (choice.finish_reason) acc.finishReason = choice.finish_reason;
  }
  return added;
}

/**
 * Split buffered SSE text into complete `data:` payloads. Returns the payloads
 * and the unfinished tail to keep for the next read. `[DONE]` is returned as is.
 */
export function splitSseEvents(buffer: string): { events: string[]; rest: string } {
  const normalised = buffer.replace(/\r\n/g, '\n');
  const blocks = normalised.split('\n\n');
  const rest = blocks.pop() ?? '';
  const events: string[] = [];
  for (const block of blocks) {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (data) events.push(data);
  }
  return { events, rest };
}

/** Feed one payload; returns added text, or null when the payload was `[DONE]`. */
export function applyEvent(acc: StreamAccumulator, payload: string): string | null {
  if (payload === '[DONE]') return null;
  try {
    return applyChunk(acc, JSON.parse(payload) as Chunk);
  } catch {
    return '';
  }
}
