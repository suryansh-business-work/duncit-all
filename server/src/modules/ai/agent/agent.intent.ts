import { GraphQLError } from 'graphql';
import { getSystemPrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat, type OpenAiMessage } from '@services/openai/openai.client';
import { logs } from '@observability/log';
import { AGENT_ACTIONS, MAX_BATCH, type AgentAction, type AgentTurn } from './agent.types';

/**
 * Turning a sentence into a plan.
 *
 * The model decides WHAT was asked for and says it back in the person's own
 * language; it never touches the database. Everything it returns is treated as
 * a suggestion from an untrusted source — the action is checked against a
 * fixed list, the count is clamped, and the topic is trimmed to a length a
 * title can hold. That split is the whole safety story: a model that
 * hallucinates can only ever mis-plan, never mis-create.
 */

const HISTORY_TURNS = 8;
const MAX_MESSAGE = 1000;
const MAX_TOPIC = 60;

/** What the prompt tells the model it can plan. Kept here, beside the parser
 * that has to accept it back, so the two cannot drift. */
const ACTION_MENU = [
  '- "CREATE_PODS": make new pods (events). The server picks the club, the host, the venue, the time slot and the cover image.',
  '- "CREATE_CLUBS": make new clubs. The server picks the cover image.',
  '- "NONE": no action — you are only replying.',
].join('\n');

const ACTION_SET = new Set<string>(AGENT_ACTIONS);

export interface AgentPlan {
  action: AgentAction;
  count: number;
  topic: string;
  reply: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** A count the model wrote, made safe: whole, at least one, never over the cap. */
function clampCount(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_BATCH, n);
}

/** The thread as OpenAI wants it, newest last and capped. */
function toMessages(history: AgentTurn[] | null | undefined, message: string): OpenAiMessage[] {
  const turns = (history ?? [])
    .filter((turn) => text(turn?.content))
    .slice(-HISTORY_TURNS)
    .map<OpenAiMessage>((turn) => ({
      role: turn.role === 'AGENT' ? 'assistant' : 'user',
      content: text(turn.content).slice(0, MAX_MESSAGE),
    }));
  return [...turns, { role: 'user', content: message }];
}

export async function planFromMessage(
  message: string,
  history: AgentTurn[] | null | undefined,
  userId: string,
): Promise<AgentPlan> {
  const systemContext = await getSystemPrompt('agent.console', {
    max_batch: String(MAX_BATCH),
    actions: ACTION_MENU,
  });

  const result = await openaiChat({
    task: 'agent.console',
    messages: [{ role: 'system', content: systemContext }, ...toMessages(history, message)],
    // The reply is a contract this file parses, not a voice — a near-zero
    // temperature keeps the model choosing from the menu instead of inventing.
    temperature: 0.1,
    max_tokens: 400,
    json: true,
    detail: 'agent',
    user_id: userId,
  });

  if (!result.ok) {
    const code = result.code === 'NOT_CONFIGURED' ? 'AI_NOT_CONFIGURED' : 'AI_UPSTREAM_ERROR';
    throw new GraphQLError(result.message, { extensions: { code } });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(result.content) as Record<string, unknown>;
  } catch (err) {
    logs.server.error('agent', 'plan', { error: err, msg: 'Agent plan was not JSON' });
    throw new GraphQLError('The agent returned a plan that could not be read', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }

  const rawAction = text(parsed.action).toUpperCase();
  // An action off the menu is not an error to shout about — it is a model that
  // wandered, and the honest reading is that nothing was asked to be done.
  const action = (ACTION_SET.has(rawAction) ? rawAction : 'NONE') as AgentAction;
  return {
    action,
    count: action === 'NONE' ? 0 : clampCount(parsed.count),
    topic: text(parsed.topic).slice(0, MAX_TOPIC),
    reply: text(parsed.reply),
  };
}
