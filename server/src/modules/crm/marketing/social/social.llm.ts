import { GraphQLError } from 'graphql';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';

/**
 * One marketer-asked AI call: both turns and the model from the AI Library,
 * strict JSON back. Unlike the comment review (which fails quietly and
 * retries on the next sync), these answer a button — so a missing key or an
 * unreadable answer is an error the marketer sees.
 */
interface JsonCall {
  task: OpenAiTaskKey;
  systemKey: string;
  userKey: string;
  variables: Record<string, string>;
  detail: string;
  maxTokens: number;
}

export async function askForJson(call: JsonCall): Promise<Record<string, unknown>> {
  const [system, user] = await Promise.all([resolvePrompt(call.systemKey), resolvePrompt(call.userKey, call.variables)]);
  const res = await openaiChat({
    task: call.task,
    detail: call.detail,
    model: system.model,
    temperature: 0.4,
    max_tokens: call.maxTokens,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  if (!res.ok) throw new GraphQLError(res.message, { extensions: { code: 'AI_UNAVAILABLE' } });
  const parsed = parseObject(res.content);
  if (!parsed) {
    throw new GraphQLError('The AI answered in a form that could not be read — try again.', { extensions: { code: 'AI_UNREADABLE' } });
  }
  return parsed;
}

function parseObject(content: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** A list of short strings from the answer, whatever else the model put there. */
export const stringList = (value: unknown, limit = 6): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, limit) : [];

export const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
