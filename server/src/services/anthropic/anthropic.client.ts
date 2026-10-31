import Anthropic from '@anthropic-ai/sdk';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Claude, through the official SDK — the transport the OpenAI funnel
 * (services/openai/openai.client.ts) routes a `claude-…` model to.
 *
 * It is only a transport: the AI Features switch, the usage row and the
 * typed failure codes stay in the funnel, so a Claude call is attributed and
 * switched off exactly like any other. What lives here is the wire shape —
 * OpenAI-style messages become Anthropic's system prompt and turns, a JSON
 * answer is asked for in the system prompt (Claude has no json_object mode)
 * and read back without the code fences it sometimes adds, and a refusal is
 * a failure that names its category.
 *
 * The current models think adaptively on their own and reject sampling
 * parameters, so neither a thinking block nor a temperature is sent. The
 * server-side refusal fallback is on: a request a model declines is re-run on
 * one that will take it, inside the same call.
 */
export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5-5';
const FALLBACK_BETAS = ['server-side-fallback-2026-07-01'] as const;
const DEFAULT_MAX_TOKENS = 4096;
const JSON_INSTRUCTION =
  'Answer with exactly one JSON object and nothing else: no words before or after it, and no code fences.';
const DATA_IMAGE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;
const FENCE = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i;
const MESSAGE_LIMIT = 500;

export const isClaudeModel = (model?: string | null): boolean =>
  Boolean(model?.trim().toLowerCase().startsWith('claude-'));

/** The Claude model a feature runs on when its prompt does not pin one. */
export async function claudeDefaultModel(): Promise<string> {
  const configured = (await getRuntimeEnvValue('ANTHROPIC_MODEL')).trim();
  return isClaudeModel(configured) ? configured : CLAUDE_DEFAULT_MODEL;
}

export interface ClaudeMessageInput {
  role: 'system' | 'user' | 'assistant';
  /** A string, or OpenAI-style content parts (text and image_url). */
  content: unknown;
}

export interface ClaudeRequest {
  apiKey: string;
  model: string;
  messages: ClaudeMessageInput[];
  max_tokens?: number;
  /** Ask for one JSON object and strip any fences around the answer. */
  json?: boolean;
}

/** OpenAI's names, so the funnel's usage row needs no translation. */
export interface ClaudeUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export type ClaudeResult =
  | { ok: true; status: number; content: string; usage: ClaudeUsage }
  | { ok: false; code: 'NETWORK' | 'UPSTREAM' | 'EMPTY'; status: number; message: string; usage?: ClaudeUsage };

type ImageSource = Anthropic.Beta.BetaBase64ImageSource | Anthropic.Beta.BetaURLImageSource;

/** A data: URL is sent as bytes; anything else is fetched by Anthropic. */
function imageSource(url: string): ImageSource {
  const inline = DATA_IMAGE.exec(url);
  if (!inline) return { type: 'url', url };
  return { type: 'base64', media_type: inline[1].toLowerCase() as Anthropic.Beta.BetaBase64ImageSource['media_type'], data: inline[2] };
}

/** OpenAI content parts become Claude blocks; a plain string stays a string. */
function toBlocks(content: unknown): string | Anthropic.Beta.BetaContentBlockParam[] {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return JSON.stringify(content ?? '');
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const part of content as Array<Record<string, unknown>>) {
    const image = part?.type === 'image_url' ? (part.image_url as { url?: string } | undefined)?.url : undefined;
    if (image) blocks.push({ type: 'image', source: imageSource(image) });
    else if (typeof part?.text === 'string') blocks.push({ type: 'text', text: part.text });
  }
  return blocks;
}

const systemText = (content: unknown): string => (typeof content === 'string' ? content : JSON.stringify(content ?? ''));

/** The system prompt and the turns, as Claude takes them. */
function split(messages: ClaudeMessageInput[], json: boolean) {
  const system: string[] = [];
  const turns: Anthropic.Beta.BetaMessageParam[] = [];
  for (const message of messages) {
    if (message.role === 'system') system.push(systemText(message.content));
    else turns.push({ role: message.role, content: toBlocks(message.content) });
  }
  if (json) system.push(JSON_INSTRUCTION);
  return { system: system.join('\n\n'), turns };
}

/** The answer without the fences a JSON reply sometimes arrives in. */
export const unfenced = (text: string): string => FENCE.exec(text)?.[1] ?? text.trim();

/** Cached prompt tokens are prompt tokens too — they were read, at a lower price. */
const usageOf = (usage: Anthropic.Beta.BetaMessage['usage']): ClaudeUsage => {
  const prompt = usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  return { prompt_tokens: prompt, completion_tokens: usage.output_tokens, total_tokens: prompt + usage.output_tokens };
};

function failure(error: unknown): ClaudeResult {
  if (error instanceof Anthropic.APIConnectionError) {
    return { ok: false, code: 'NETWORK', status: 0, message: `Anthropic is unreachable (${error.message})`.slice(0, MESSAGE_LIMIT) };
  }
  if (error instanceof Anthropic.APIError) {
    return { ok: false, code: 'UPSTREAM', status: error.status ?? 0, message: error.message.slice(0, MESSAGE_LIMIT) };
  }
  return { ok: false, code: 'NETWORK', status: 0, message: (error instanceof Error ? error.message : String(error)).slice(0, MESSAGE_LIMIT) };
}

/** One Claude turn: the answer's text, or why there is none. Never throws. */
export async function claudeMessages(req: ClaudeRequest): Promise<ClaudeResult> {
  const client = new Anthropic({ apiKey: req.apiKey, maxRetries: 1 });
  const { system, turns } = split(req.messages, Boolean(req.json));
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages.create({
      model: req.model,
      max_tokens: req.max_tokens ?? DEFAULT_MAX_TOKENS,
      ...(system ? { system } : {}),
      messages: turns,
      betas: [...FALLBACK_BETAS],
      fallbacks: 'default',
    });
  } catch (error) {
    return failure(error);
  }

  const usage = usageOf(message.usage);
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category ?? 'policy';
    return { ok: false, code: 'EMPTY', status: 200, message: `Claude declined this request (${category}).`, usage };
  }
  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const content = req.json ? unfenced(text) : text;
  if (!content.trim()) return { ok: false, code: 'EMPTY', status: 200, message: 'Claude returned an empty response', usage };
  return { ok: true, status: 200, content, usage };
}
