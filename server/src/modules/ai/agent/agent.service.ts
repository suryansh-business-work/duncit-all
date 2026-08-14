import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { createClubBatch } from './agent.clubs';
import { planFromMessage } from './agent.intent';
import { createPodBatch } from './agent.pods';
import {
  AGENT_ACT_ROLES,
  MAX_BATCH,
  type AgentChatArgs,
  type AgentResultItem,
} from './agent.types';

/**
 * The Agent: one turn of "tell me what to make, and I will make it".
 *
 * The model plans, this file carries the plan out, and what comes back is what
 * actually happened — not what was intended. That ordering is the point: the
 * answer a person reads is assembled AFTER the rows exist, so it can never
 * promise ten pods and leave seven.
 */

const MAX_MESSAGE = 1000;

/** Topics for a batch nobody gave a theme to. Read from the plan first; this
 * is only the floor, so a run never dies for want of a noun. */
const FALLBACK_TOPIC = 'Community Meetup';

const badRequest = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export async function availability(roles: readonly string[]) {
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  return {
    is_available: !!apiKey.trim(),
    can_act: roles.some((role) => AGENT_ACT_ROLES.includes(role)),
    max_batch: MAX_BATCH,
  };
}

/** `Created 9 of 10 pods. 1 could not be created.` — the run, in one line. */
function summarize(items: AgentResultItem[], requested: number, noun: string): string {
  const created = items.filter((item) => item.ok).length;
  const failed = items.length - created;
  const head = `Created ${created} of ${requested} ${noun}.`;
  return failed > 0 ? `${head} ${failed} could not be created — see the list.` : head;
}

async function runAction(
  action: string,
  count: number,
  topic: string,
  actorUserId: string,
): Promise<{ items: AgentResultItem[]; noun: string }> {
  if (action === 'CREATE_PODS') {
    return { items: await createPodBatch({ count, topic, actorUserId }), noun: 'pods' };
  }
  return { items: await createClubBatch({ count, topic }), noun: 'clubs' };
}

export async function chat(
  args: AgentChatArgs,
  actor: { id: string; roles?: readonly string[] },
) {
  const message = String(args.message ?? '').trim().slice(0, MAX_MESSAGE);
  if (!message) throw badRequest('Type what you would like the agent to do');

  const plan = await planFromMessage(message, args.history, actor.id);
  const empty = { requested: 0, created: 0, failed: 0, items: [] as AgentResultItem[] };

  if (plan.action === 'NONE') {
    return { answer: plan.reply || 'I could not tell what to create.', action: 'NONE', ...empty };
  }

  // The plan is the model's; the permission is not. A person who may not create
  // pods is told so plainly rather than watching ten failures scroll past.
  const canAct = (actor.roles ?? []).some((role) => AGENT_ACT_ROLES.includes(role));
  if (!canAct) {
    return {
      answer: 'You do not have permission to create these, so nothing was made.',
      action: plan.action,
      ...empty,
    };
  }

  const topic = plan.topic || FALLBACK_TOPIC;
  try {
    const { items, noun } = await runAction(plan.action, plan.count, topic, actor.id);
    const created = items.filter((item) => item.ok).length;
    const lead = plan.reply ? `${plan.reply}\n\n` : '';
    return {
      answer: `${lead}${summarize(items, plan.count, noun)}`,
      action: plan.action,
      requested: plan.count,
      created,
      failed: items.length - created,
      items,
    };
  } catch (err) {
    // A missing club, venue slot or image — or an ImageKit that was never set
    // up — stops the run before anything is written. Each of those already
    // names what to go and fix, so it is carried through as the answer rather
    // than raised as a failed request the console can only call "an error".
    const code = err instanceof GraphQLError ? err.extensions?.code : null;
    if (code === 'AGENT_NO_RESOURCE' || code === 'CONFIG_ERROR') {
      return { answer: err instanceof Error ? err.message : '', action: plan.action, ...empty };
    }
    logs.server.error('agent', 'chat', { error: err, msg: 'Agent run failed', action: plan.action });
    throw err;
  }
}

export const agentService = { availability, chat };
