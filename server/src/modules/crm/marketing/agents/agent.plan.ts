import { z } from 'zod';
import { openaiChat, type OpenAiUsage } from '@services/openai/openai.client';
import { claudeDefaultModel } from '@services/anthropic/anthropic.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { appDateTime, getAppTimeZone } from '@utils/app-time';
import { socialService } from '../social/social.service';
import { PUBLISH_RULES } from '../social/social.rules';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../social/social.types';
import type { AgentDefinition, AgentParams } from './agent.catalog';

/**
 * The one AI call an agent run makes: Claude reads the brief, the connected
 * accounts, the date and the limits, and answers with a plan — a summary and
 * up to ten tool calls. Nothing here acts; the runner does, one step per
 * action, against the tool registry.
 */
export interface PlannedAction {
  tool: string;
  input: unknown;
  why: string;
}

export interface AgentPlan {
  summary: string;
  actions: PlannedAction[];
}

export interface PlanOutcome {
  plan: AgentPlan;
  model: string;
  usage?: OpenAiUsage;
}

export const MAX_ACTIONS = 10;
const MAX_SUMMARY = 1000;
const MAX_TOKENS = 4000;
const WEEK_DAYS = 7;
const DAY_MS = 86_400_000;

const PLAN = z.object({
  summary: z.string().default(''),
  actions: z
    .array(
      z.object({
        tool: z.string(),
        input: z.unknown().default({}),
        why: z.string().default(''),
      })
    )
    .default([]),
});

const issuesOf = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'plan'} ${issue.message}`).join('; ');

/** The answer as a plan, or a thrown reason the run log can show. */
export function parsePlan(content: string): AgentPlan {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error('The plan was not valid JSON');
  }
  const parsed = PLAN.safeParse(raw);
  if (!parsed.success) throw new Error(`The plan did not match the contract: ${issuesOf(parsed.error)}`);
  return {
    summary: parsed.data.summary.trim().slice(0, MAX_SUMMARY),
    actions: parsed.data.actions.slice(0, MAX_ACTIONS).map((a) => ({ tool: a.tool.trim(), input: a.input ?? {}, why: a.why.trim() })),
  };
}

/** The prompt pair's keys: `agents.content_planner` and `agents.content_planner.user`. */
export const promptKeyFor = (def: AgentDefinition): string => `agents.${def.key.toLowerCase()}`;

const isPlatform = (value: string): value is SocialPlatform => (SOCIAL_PLATFORMS as readonly string[]).includes(value);
const needsMedia = (platform: string): boolean => isPlatform(platform) && PUBLISH_RULES[platform].mediaRequired;

/** One line per connected account, with whether its network takes a post without media. */
async function accountsText(): Promise<string> {
  const accounts = await socialService.accounts();
  if (accounts.length === 0) return '(no connected accounts)';
  return accounts
    .map((a) => {
      const text = needsMedia(String(a.platform)) ? 'needs media (DRAFT only)' : 'takes a text-only post';
      const health = a.health_ok === false ? `; health: ${a.health_message || 'needs a look'}` : '';
      const handle = a.handle ? ` (@${a.handle})` : '';
      return `- id: ${a.id} | ${a.platform} | "${a.name}"${handle} | ${a.status} | ${a.followers} followers | ${text}${health}`;
    })
    .join('\n');
}

function limitsText(def: AgentDefinition, params: AgentParams, now: Date): string {
  const lines = [`At most ${MAX_ACTIONS} actions.`];
  if (def.has_params) {
    const from = new Date(now.getTime() + DAY_MS);
    const to = new Date(now.getTime() + WEEK_DAYS * DAY_MS);
    lines.push(
      `Create at most ${params.posts_per_week} post(s), spread across the coming week.`,
      `Networks: ${params.networks.length > 0 ? params.networks.join(', ') : 'every connected network'}.`,
      `Schedule each post between ${from.toISOString()} and ${to.toISOString()} (ISO 8601 with offset), never in the past.`
    );
  }
  if (def.needs_approval) lines.push('Everything you create waits for a person on Approvals; nothing goes out on its own.');
  return lines.join('\n');
}

/**
 * Ask Claude for the plan. The prompt pair comes from the AI Library (an
 * operator may have edited it); the model is the one the prompt pins, else
 * the configured Claude default.
 */
export async function planAgent(def: AgentDefinition, params: AgentParams, userId: string): Promise<PlanOutcome> {
  const now = new Date();
  const key = promptKeyFor(def);
  const accounts = await accountsText();
  const [system, user] = await Promise.all([
    resolvePrompt(key),
    resolvePrompt(`${key}.user`, {
      brief: params.brief || 'Anything on-brand',
      accounts,
      today: `${appDateTime(now)} (${getAppTimeZone()}; now is ${now.toISOString()})`,
      limits: limitsText(def, params, now),
    }),
  ]);
  const model = system.model || (await claudeDefaultModel());
  const result = await openaiChat({
    task: 'marketing.agent_plan',
    model,
    json: true,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
    detail: def.key,
    user_id: userId || undefined,
  });
  if (!result.ok) throw new Error(result.message);
  return { plan: parsePlan(result.content), model: result.model, usage: result.usage };
}
