import { describeFetchFailure } from '@utils/outboundFetch';
import { isAiFeatureEnabled } from '@modules/ai/aiFeature/aiFeature.guard';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { estimateTokens } from '@services/ai/token-estimate';
import { readError, record, resolveConfig, type OpenAiFailureCode, type OpenAiMessage } from './openai.client';
import { applyEvent, emptyAccumulator, splitSseEvents, type StreamedToolCall, type StreamUsage } from './openai.sse';

/**
 * The streaming, tool-calling half of the ONE OpenAI funnel (openai.client.ts).
 *
 * Same credentials, same AI Features switch, same usage row per call — so a
 * streamed turn appears in OpenAI Logs and the cost dashboard exactly like a
 * plain one. Only the OpenAI-compatible wire streams (OpenAI and Gemini's
 * compatible endpoint); a `claude-` model is refused here and by the Ask
 * Duncit settings that would pick it.
 */

export interface ChatToolDef {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** A message on the wire, including tool turns. */
export interface StreamMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

export interface StreamChatRequest {
  task: OpenAiTaskKey;
  messages: StreamMessage[];
  tools?: ChatToolDef[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  detail?: string;
  user_id?: string;
  signal?: AbortSignal;
  /** A specific Tech portal OpenAI entry (Duncit Intel's setting); unset = the active default. */
  credentials?: { apiKey: string; base: string } | null;
  /** Called with every piece of text as it arrives. */
  onDelta?: (text: string) => void;
}

export type StreamChatResult =
  | { ok: true; content: string; toolCalls: StreamedToolCall[]; finishReason: string | null; model: string; usage: StreamUsage }
  | { ok: false; code: OpenAiFailureCode | 'ABORTED'; status: number; message: string; model: string };

/** The usage row's preview: tool turns shown as what they were. */
const previewMessages = (messages: StreamMessage[]): OpenAiMessage[] =>
  messages.map((m) => ({
    role: m.role === 'tool' ? 'user' : m.role,
    content: m.role === 'tool' ? `[tool result] ${String(m.content).slice(0, 300)}` : m.content,
  }));

function buildBody(req: StreamChatRequest, model: string): string {
  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (req.tools?.length) {
    body.tools = req.tools;
    body.tool_choice = 'auto';
  }
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
  return JSON.stringify(body);
}

/** Usage when the provider sent none (Gemini's compatible endpoint may not). */
function estimatedUsage(req: StreamChatRequest, content: string, toolCalls: StreamedToolCall[]): StreamUsage {
  const prompt = estimateTokens(JSON.stringify(req.messages));
  const completion = estimateTokens(content + toolCalls.map((c) => c.arguments).join(''));
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion };
}

async function readStream(res: Response, req: StreamChatRequest) {
  const acc = emptyAccumulator();
  const reader = res.body?.getReader();
  if (!reader) return acc;
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const { events, rest } = splitSseEvents(buffer);
    buffer = rest;
    for (const payload of events) {
      const added = applyEvent(acc, payload);
      if (added === null) done = true;
      else if (added) req.onDelta?.(added);
    }
  }
  return acc;
}

export async function openaiChatStream(req: StreamChatRequest): Promise<StreamChatResult> {
  const startedAt = Date.now();
  const config = await resolveConfig(req.model);
  const { provider, model } = config;
  const apiKey = (provider === 'OpenAI' && req.credentials?.apiKey) || config.apiKey;
  const base = (provider === 'OpenAI' && req.credentials?.base) || config.base;
  const recordReq = { task: req.task, messages: previewMessages(req.messages), detail: req.detail, user_id: req.user_id };
  const fail = (code: OpenAiFailureCode | 'ABORTED', status: number, message: string): StreamChatResult => {
    record({ req: recordReq, model, status: code === 'DISABLED' || code === 'NOT_CONFIGURED' ? 'SKIPPED' : 'FAILED', httpStatus: status, error: message, startedAt });
    return { ok: false, code, status, message, model };
  };

  if (!(await isAiFeatureEnabled(req.task))) return fail('DISABLED', 0, 'This AI feature is switched off in the AI portal (AI Features).');
  if (provider === 'Anthropic') return fail('UPSTREAM', 0, 'Streaming tool calls need an OpenAI or Gemini model.');
  if (!apiKey) return fail('NOT_CONFIGURED', 0, `${provider} is not configured. Set the ${provider.toUpperCase()} API key in the Tech portal.`);

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: buildBody(req, model),
      signal: req.signal,
    });
  } catch (err) {
    if (req.signal?.aborted) return fail('ABORTED', 0, 'Stopped by the user');
    const detail = describeFetchFailure(err);
    return fail('NETWORK', 0, detail ? `${provider} is unreachable (${detail})` : `${provider} request failed`);
  }
  if (!res.ok) return fail('UPSTREAM', res.status, await readError(res));

  let acc;
  try {
    acc = await readStream(res, req);
  } catch (err) {
    if (req.signal?.aborted) return fail('ABORTED', res.status, 'Stopped by the user');
    return fail('NETWORK', res.status, err instanceof Error ? err.message : 'The stream broke off');
  }
  if (acc.error) return fail('UPSTREAM', res.status, acc.error);

  const usage = acc.usage ?? estimatedUsage(req, acc.content, acc.toolCalls);
  const empty = !acc.content && acc.toolCalls.length === 0;
  record({
    req: recordReq,
    model,
    status: empty ? 'FAILED' : 'SUCCESS',
    httpStatus: res.status,
    usage,
    response: acc.content || acc.toolCalls.map((c) => `${c.name}(${c.arguments})`).join('\n'),
    error: empty ? 'The model returned nothing' : '',
    startedAt,
  });
  if (empty) return { ok: false, code: 'EMPTY', status: res.status, message: 'The model returned nothing', model };
  return { ok: true, content: acc.content, toolCalls: acc.toolCalls, finishReason: acc.finishReason, model, usage };
}
