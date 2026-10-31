import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import type { z } from 'zod';
import { MarketingRunModel, type MarketingRunStatus } from '../runs/marketingRun.model';
import { userActor } from '../runs/marketingRun.service';
import {
  AGENTS,
  AGENT_KEYS,
  AGENT_SCHEDULE,
  isAgentKey,
  type AgentCadence,
  type AgentDefinition,
  type AgentParams,
  type AgentSchedule,
  type MarketingAgentKey,
} from './agent.catalog';
import { MarketingAgentConfigModel } from './agent.model';
import { startMarketingAgent } from './agent.runner';
import { nextRunAt } from './agent.schedule';

/**
 * Marketing › Automation › Agents: the catalogue merged with what a manager
 * saved about each agent, plus Run now and the two calls the orchestrator
 * makes — which agents are due, and that one has just run.
 */
export interface AgentScheduleInput {
  every: AgentCadence;
  hour: number;
  weekday?: number | null;
}

export interface AgentParamsInput {
  brief?: string | null;
  networks?: string[] | null;
  posts_per_week?: number | null;
}

export interface UpdateMarketingAgentInput {
  enabled?: boolean | null;
  schedule?: AgentScheduleInput | null;
  params?: AgentParamsInput | null;
}

/** A stored row as it is read back — every field optional, because a row saved before a field existed has none of it. */
interface ConfigRow {
  key: string;
  enabled?: boolean;
  schedule?: Partial<AgentSchedule> | null;
  params?: unknown;
  last_run_at?: Date | null;
  last_run_id?: string;
  next_run_at?: Date | null;
  updated_by?: string;
  updated_at?: Date | null;
}

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function notFound(key: string): never {
  throw new GraphQLError(`Unknown marketing agent "${key}"`, { extensions: { code: 'NOT_FOUND' } });
}

const issuesOf = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join('; ');

/** A stored schedule, whole — a row saved before a field existed reads as the catalogue default for it. */
const scheduleOf = (def: AgentDefinition, stored?: Partial<AgentSchedule> | null): AgentSchedule => ({
  every: stored?.every ?? def.schedule.every,
  hour: stored?.hour ?? def.schedule.hour,
  weekday: stored?.weekday ?? def.schedule.weekday,
});

/** Stored params, or the defaults when nothing valid was stored. */
const paramsOf = (def: AgentDefinition, stored: unknown): AgentParams => {
  const parsed = def.params.safeParse(stored ?? {});
  return parsed.success ? parsed.data : def.params.parse({});
};

function parseSchedule(input: AgentScheduleInput): AgentSchedule {
  const parsed = AGENT_SCHEDULE.safeParse({ every: input.every, hour: input.hour, weekday: input.weekday ?? 0 });
  if (!parsed.success) badInput(`The schedule is not valid: ${issuesOf(parsed.error)}`);
  return parsed.data;
}

function parseParams(def: AgentDefinition, input: AgentParamsInput): AgentParams {
  const parsed = def.params.safeParse({
    brief: input.brief ?? undefined,
    networks: input.networks ?? undefined,
    posts_per_week: input.posts_per_week ?? undefined,
  });
  if (!parsed.success) badInput(`The settings are not valid: ${issuesOf(parsed.error)}`);
  return parsed.data;
}

function pub(def: AgentDefinition, doc: ConfigRow | null, lastStatus: MarketingRunStatus | null) {
  return {
    key: def.key,
    name: def.name,
    description: def.description,
    enabled: !!doc?.enabled,
    schedule: scheduleOf(def, doc?.schedule),
    params: paramsOf(def, doc?.params),
    has_params: def.has_params,
    tools: [...def.tools],
    needs_approval: def.needs_approval,
    last_run_at: iso(doc?.last_run_at),
    last_run_id: doc?.last_run_id ?? '',
    last_run_status: lastStatus,
    next_run_at: iso(doc?.next_run_at),
    updated_at: iso(doc?.updated_at),
  };
}

export type MarketingAgentView = ReturnType<typeof pub>;

async function lastStatuses(docs: ConfigRow[]): Promise<Map<string, MarketingRunStatus>> {
  const ids = docs.map((doc) => doc.last_run_id ?? '').filter((id) => isValidObjectId(id));
  if (ids.length === 0) return new Map();
  const runs = await MarketingRunModel.find({ _id: { $in: ids } }).select('status').lean<{ _id: unknown; status: MarketingRunStatus }[]>();
  return new Map(runs.map((run) => [String(run._id), run.status]));
}

const definitionOf = (key: string): AgentDefinition => (isAgentKey(key) ? AGENTS[key] : notFound(key));

export const marketingAgentService = {
  /** Every agent in the catalogue, with its saved switch, schedule, params and last run. */
  async list(): Promise<MarketingAgentView[]> {
    const docs = await MarketingAgentConfigModel.find({ key: { $in: AGENT_KEYS } }).lean<ConfigRow[]>();
    const byKey = new Map(docs.map((doc) => [doc.key, doc]));
    const statuses = await lastStatuses(docs);
    return AGENT_KEYS.map((key) => {
      const doc = byKey.get(key) ?? null;
      return pub(AGENTS[key], doc, statuses.get(doc?.last_run_id ?? '') ?? null);
    });
  },

  /** Switch, reschedule or reconfigure one agent. Validated here; the next run time follows the new schedule. */
  async update(key: string, input: UpdateMarketingAgentInput, userId: string): Promise<MarketingAgentView> {
    const def = definitionOf(key);
    const current = await MarketingAgentConfigModel.findOne({ key: def.key }).lean<ConfigRow | null>();
    const schedule = input.schedule ? parseSchedule(input.schedule) : scheduleOf(def, current?.schedule);
    const params = input.params ? parseParams(def, input.params) : paramsOf(def, current?.params);
    const enabled = input.enabled ?? !!current?.enabled;
    const doc = await MarketingAgentConfigModel.findOneAndUpdate(
      { key: def.key },
      { $set: { enabled, schedule, params, next_run_at: enabled ? nextRunAt(schedule, new Date()) : null, updated_by: userId } },
      { upsert: true, returnDocument: 'after' }
    ).lean<ConfigRow>();
    const statuses = await lastStatuses([doc]);
    return pub(def, doc, statuses.get(doc.last_run_id ?? '') ?? null);
  },

  /** Run one agent now, as the signed-in person. The run id comes back at once; the work goes on in the background. */
  async runNow(key: string, user: { id: string; email?: string | null }): Promise<string> {
    const def = definitionOf(key);
    const actor = await userActor(user);
    const started = await startMarketingAgent(def.key, 'USER', actor, { user_id: user.id });
    await marketingAgentService.markRan(def.key, started.run_id, new Date());
    return started.run_id;
  },

  /** The enabled agents whose time has come. */
  async dueAgents(now: Date): Promise<MarketingAgentKey[]> {
    const docs = await MarketingAgentConfigModel.find({ enabled: true, next_run_at: { $ne: null, $lte: now } })
      .select('key')
      .lean<{ key: string }[]>();
    return docs.map((doc) => doc.key).filter((key): key is MarketingAgentKey => isAgentKey(key));
  },

  /** Record that an agent just ran and book its next time. An agent never saved gets a row, switched off. */
  async markRan(key: MarketingAgentKey, runId: string, now: Date): Promise<void> {
    const def = AGENTS[key];
    const current = await MarketingAgentConfigModel.findOne({ key }).select('enabled schedule').lean<ConfigRow | null>();
    const schedule = scheduleOf(def, current?.schedule);
    await MarketingAgentConfigModel.updateOne(
      { key },
      {
        $set: { last_run_at: now, last_run_id: runId, next_run_at: current?.enabled ? nextRunAt(schedule, now) : null },
        $setOnInsert: { enabled: false, schedule: def.schedule, params: {} },
      },
      { upsert: true }
    );
  },
};
