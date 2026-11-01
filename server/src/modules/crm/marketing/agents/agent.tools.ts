import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import type { RunActor, RunContext } from '../runs/marketingRun.service';
import { socialService } from '../social/social.service';
import { socialIdeasService } from '../social/social.ideas';
import { socialPublishService } from '../social/social.publish.service';
import { analyzePendingComments } from '../social/social.ai';
import { runHealthChecks } from '../social/social.health';
import { SOCIAL_PLATFORMS } from '../social/social.types';
import { MAX_BRIEF, TOOL_KEYS, type AgentDefinition, type AgentToolKey } from './agent.catalog';

/**
 * The in-process tools a marketing agent's plan may call. Each one is a thin,
 * typed door onto a service the console already uses — the same code path a
 * person takes, so the same checks apply — and every call is a step on the
 * run. A plan names a tool and an input; the input is validated here before
 * anything runs, and a tool the agent is not allowed is refused outright.
 */
export interface ToolContext {
  run: RunContext;
  actor: RunActor;
  /** Whose work it is filed as: the person who pressed Run now, or the manager who switched the agent on. */
  user_id: string;
  agent: AgentDefinition;
}

export interface ToolResult {
  /** One line for the step's summary and the report. */
  summary: string;
  data?: unknown;
}

export interface AgentTool<S extends z.ZodType = z.ZodType> {
  key: AgentToolKey;
  description: string;
  input: S;
  run(input: z.output<S>, ctx: ToolContext): Promise<ToolResult>;
}

/** A plan asked for something it may not have: the wrong tool, a forbidden one, or an input the tool refuses. */
export class ToolRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolRefusedError';
  }
}

const MAX_IDEAS = 10;
const MAX_POST_TEXT = 5000;
const MAX_POST_ACCOUNTS = 20;
const SUMMARY_NAMES = 6;

const isoInFuture = (value: string): boolean => {
  const at = new Date(value).getTime();
  return !Number.isNaN(at) && at > Date.now();
};

const accountId = z.string().refine((id) => isValidObjectId(id), 'must be an account id');

/** Tools that write a record need a person to file it under. */
function requireUser(ctx: ToolContext): string {
  if (!ctx.user_id) {
    throw new ToolRefusedError(`${ctx.agent.name} has nobody to file its work under — save it from Marketing › Automation › Agents first.`);
  }
  return ctx.user_id;
}

const define = <S extends z.ZodType>(tool: AgentTool<S>): AgentTool<S> => tool;

const listAccounts = define({
  key: 'social.list_accounts',
  description: 'The connected social accounts with their ids, networks and health.',
  input: z.object({}),
  async run() {
    const accounts = await socialService.accounts();
    const rows = accounts.map((a) => ({
      id: a.id,
      platform: a.platform,
      name: a.name,
      handle: a.handle,
      status: a.status,
      followers: a.followers,
      health_ok: a.health_ok,
      health_message: a.health_message,
    }));
    const named = rows.slice(0, SUMMARY_NAMES).map((r) => `${r.platform} ${r.name} (${r.status})`);
    return { summary: rows.length === 0 ? 'No connected accounts' : `${rows.length} account(s): ${named.join(', ')}`, data: rows };
  },
});

const generateIdeas = define({
  key: 'social.generate_ideas',
  description: 'Writes post ideas onto the Ideas board for the team.',
  input: z.object({
    brief: z.string().trim().max(MAX_BRIEF).default(''),
    platforms: z.array(z.enum(SOCIAL_PLATFORMS)).max(SOCIAL_PLATFORMS.length).default([]),
    count: z.number().int().min(1).max(MAX_IDEAS).default(5),
  }),
  async run(input, ctx) {
    const ideas = await socialIdeasService.generate({ brief: input.brief, platforms: input.platforms, count: input.count }, requireUser(ctx));
    return {
      summary: `${ideas.length} idea(s) on the board: ${ideas.map((idea) => idea.title).join(' | ')}`,
      data: ideas.map((idea) => ({ id: idea.id, title: idea.title, caption: idea.caption, platforms: idea.platforms, format: idea.format })),
    };
  },
});

const createPost = define({
  key: 'social.create_post',
  description: 'Creates one post for the given accounts at a future time; it always waits for a person on Approvals.',
  input: z.object({
    text: z.string().trim().min(1).max(MAX_POST_TEXT),
    account_ids: z.array(accountId).min(1).max(MAX_POST_ACCOUNTS),
    scheduled_at: z.string().refine(isoInFuture, 'must be an ISO 8601 date-time in the future'),
    idea_id: z.string().default(''),
    mode: z.enum(['SCHEDULE', 'DRAFT']).default('SCHEDULE'),
  }),
  async run(input, ctx) {
    const post = await socialPublishService.create(
      {
        text: input.text,
        media: [],
        account_ids: input.account_ids,
        mode: input.mode,
        scheduled_at: input.scheduled_at,
        idea_id: input.idea_id || null,
        // An agent never sends anything on its own: a person says yes on Approvals first.
        needs_approval: true,
      },
      requireUser(ctx)
    );
    const outcome = input.mode === 'DRAFT' ? 'saved as a draft (needs media before it can go out)' : 'waits on Approvals';
    return {
      summary: `Post ${post.id} for ${post.targets.length} account(s) at ${post.scheduled_at ?? 'no time'} — ${outcome}`,
      data: { id: post.id, status: post.status, scheduled_at: post.scheduled_at },
    };
  },
});

const analyzeComments = define({
  key: 'comments.analyze',
  description: 'Runs the AI review over comments not yet reviewed, for one account or all of them.',
  input: z.object({ account_id: accountId.optional() }),
  async run(input) {
    const result = await analyzePendingComments(input.account_id);
    if (result.error) throw new Error(result.error);
    return {
      summary:
        `${result.analyzed} comment(s) reviewed, ${result.flagged} flagged. No reply was sent: the Meta reply permission is not held, ` +
        'so flagged comments wait for a person on Social Accounts › Monitoring.',
      data: result,
    };
  },
});

const healthCheck = define({
  key: 'accounts.health_check',
  description: 'Checks every connected account: token, profile read and expiry.',
  input: z.object({}),
  async run() {
    const results = await runHealthChecks();
    const needing = results.filter((r) => !r.ok);
    const detail = needing.length > 0 ? `: ${needing.map((r) => `${r.name} (${r.message})`).join('; ')}` : '';
    return {
      summary: `${results.length} account(s) checked; ${needing.length} need a person${detail}`,
      data: results.map((r) => ({
        account_id: r.account_id,
        platform: r.platform,
        name: r.name,
        ok: r.ok,
        expired: r.expired,
        message: r.message,
        expires_in_days: r.expires_in_days,
      })),
    };
  },
});

export const TOOLS: Readonly<Record<AgentToolKey, AgentTool>> = {
  'social.list_accounts': listAccounts,
  'social.generate_ideas': generateIdeas,
  'social.create_post': createPost,
  'comments.analyze': analyzeComments,
  'accounts.health_check': healthCheck,
};

export const isToolKey = (value: unknown): value is AgentToolKey =>
  typeof value === 'string' && (TOOL_KEYS as readonly string[]).includes(value);

const issuesOf = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'input'} ${issue.message}`).join('; ');

/**
 * Run one planned call. Refused — without running anything — when the tool
 * is unknown, not on the agent's list, or handed an input its schema rejects.
 */
export async function runTool(key: string, rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (!isToolKey(key)) throw new ToolRefusedError(`Unknown tool "${key}"`);
  if (!ctx.agent.tools.includes(key)) throw new ToolRefusedError(`${ctx.agent.name} may not use ${key}`);
  const tool = TOOLS[key];
  const parsed = tool.input.safeParse(rawInput ?? {});
  if (!parsed.success) throw new ToolRefusedError(`Bad input for ${key}: ${issuesOf(parsed.error)}`);
  return tool.run(parsed.data, ctx);
}
