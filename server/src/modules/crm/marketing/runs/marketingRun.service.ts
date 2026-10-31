import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import {
  MAX_API_LOG,
  MAX_STEPS,
  MarketingRunModel,
  OPEN_RUN_STATUSES,
  type MarketingRunActorKind,
  type MarketingRunDecision,
  type MarketingRunDoc,
  type MarketingRunStatus,
  type MarketingRunStepStatus,
  type MarketingRunTrigger,
  type MarketingRunWorkflow,
} from './marketingRun.model';

/**
 * The one place every marketing automation records itself. A workflow wraps
 * its work in {@link withRun}; the Activity timeline, Approval Centre and My
 * Tasks read what it wrote. Nothing is deleted: a run is the audit trail.
 */
export interface RunActor {
  kind: MarketingRunActorKind;
  id?: string;
  name?: string;
  email?: string;
}

export interface RunLinks {
  account_id?: string;
  campaign_id?: string;
  lead_id?: string;
  post_id?: string;
  reel_id?: string;
  agent_key?: string;
}

export interface StartRunInput {
  workflow: MarketingRunWorkflow;
  name: string;
  trigger?: MarketingRunTrigger;
  actor?: RunActor;
  links?: RunLinks;
  parent_run_id?: string;
  /** Start in AWAITING_APPROVAL rather than PENDING; the workflow's handler continues it once decided. */
  approval_required?: boolean;
}

export interface StepOutcome {
  status: MarketingRunStepStatus;
  label?: string;
  tool?: string;
  input_summary?: string;
  output_summary?: string;
  error?: string;
  ms?: number;
}

export interface ApiEntry {
  service: string;
  method: string;
  url: string;
  status: number;
  ms: number;
  summary?: string;
}

/** What a workflow may do while it runs, all of it recorded on the run. */
export interface RunContext {
  id: string;
  step<T>(key: string, label: string, work: () => Promise<T>, options?: StepOptions<T>): Promise<T>;
  api(entry: ApiEntry): Promise<void>;
  cost(delta: { tokens_in?: number; tokens_out?: number; amount?: number }): Promise<void>;
  cancelled(): Promise<boolean>;
}

export interface StepOptions<T> {
  tool?: string;
  input_summary?: string;
  summarize?: (result: T) => string;
}

/** How a workflow continues a run that was approved, or re-runs one that failed. */
export interface RunHandlers {
  onDecision?: (run: MarketingRunDoc, decision: MarketingRunDecision) => Promise<void>;
  retry?: (run: MarketingRunDoc) => Promise<void>;
}

export const SYSTEM_ACTOR: RunActor = { kind: 'SYSTEM' };

const SUMMARY_MAX = 500;
const ERROR_MAX = 1000;
const WEEK_MS = 7 * 86_400_000;

const handlers = new Map<MarketingRunWorkflow, RunHandlers>();

/** A workflow says how its runs are continued after approval and retried; without this, neither is offered. */
export function registerRunHandlers(workflow: MarketingRunWorkflow, workflowHandlers: RunHandlers): void {
  handlers.set(workflow, workflowHandlers);
}

const clip = (value: string | undefined, max: number) => (value ?? '').slice(0, max);
const reasonOf = (error: unknown) => clip(error instanceof Error ? error.message : String(error), ERROR_MAX);
const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function notFound(): never {
  throw new GraphQLError('Run not found', { extensions: { code: 'NOT_FOUND' } });
}

function refused(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** The signed-in person as a run's actor, named so the timeline reads well. */
export async function userActor(user: { id: string; email?: string | null }): Promise<RunActor> {
  const doc = await UserModel.findById(user.id).select('profile.first_name profile.last_name auth.email').lean<{
    profile?: { first_name?: string; last_name?: string };
    auth?: { email?: string };
  }>();
  const name = [doc?.profile?.first_name, doc?.profile?.last_name].filter(Boolean).join(' ');
  return { kind: 'USER', id: user.id, name, email: doc?.auth?.email ?? user.email ?? '' };
}

const RUN_TABLE: TableEntityConfig = {
  searchFields: ['name', 'error', 'actor.name'],
  sortFields: { created_at: 'created_at', finished_at: 'finished_at', status: 'status', workflow: 'workflow' },
  filterFields: {
    workflow: { type: 'enum' },
    status: { type: 'enum' },
    trigger: { type: 'enum' },
    actor_id: { path: 'actor.id', type: 'string' },
    actor_kind: { path: 'actor.kind', type: 'enum' },
    account_id: { path: 'links.account_id', type: 'string' },
    campaign_id: { path: 'links.campaign_id', type: 'string' },
    lead_id: { path: 'links.lead_id', type: 'string' },
    post_id: { path: 'links.post_id', type: 'string' },
    parent_run_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

type RunStep = MarketingRunDoc['steps'][number];
type RunApiEntry = MarketingRunDoc['api_log'][number];

const pubStep = (s: RunStep) => ({
  key: s.key,
  label: s.label ?? '',
  status: s.status,
  tool: s.tool ?? '',
  input_summary: s.input_summary ?? '',
  output_summary: s.output_summary ?? '',
  error: s.error ?? '',
  started_at: iso(s.started_at),
  finished_at: iso(s.finished_at),
  ms: s.ms ?? 0,
});

export const pubRun = (o: MarketingRunDoc) => {
  const workflowHandlers = handlers.get(o.workflow);
  return {
    id: String(o._id),
    workflow: o.workflow,
    name: o.name,
    trigger: o.trigger,
    status: o.status,
    actor: { kind: o.actor?.kind ?? 'SYSTEM', id: o.actor?.id ?? '', name: o.actor?.name ?? '', email: o.actor?.email ?? '' },
    links: {
      account_id: o.links?.account_id ?? '',
      campaign_id: o.links?.campaign_id ?? '',
      lead_id: o.links?.lead_id ?? '',
      post_id: o.links?.post_id ?? '',
      reel_id: o.links?.reel_id ?? '',
      agent_key: o.links?.agent_key ?? '',
    },
    steps: (o.steps ?? []).map(pubStep),
    api_log: (o.api_log ?? []).map((e: RunApiEntry) => ({
      at: iso(e.at),
      service: e.service ?? '',
      method: e.method ?? '',
      url: e.url ?? '',
      status: e.status ?? 0,
      ms: e.ms ?? 0,
      summary: e.summary ?? '',
    })),
    retries: o.retries ?? 0,
    error: o.error ?? '',
    approval: {
      required: !!o.approval?.required,
      requested_at: iso(o.approval?.requested_at),
      decision: o.approval?.decision ?? null,
      decided_by: o.approval?.decided_by ?? '',
      decided_by_name: o.approval?.decided_by_name ?? '',
      decided_at: iso(o.approval?.decided_at),
      note: o.approval?.note ?? '',
    },
    cost: {
      tokens_in: o.cost?.tokens_in ?? 0,
      tokens_out: o.cost?.tokens_out ?? 0,
      amount: o.cost?.amount ?? 0,
      currency: o.cost?.currency ?? 'INR',
    },
    parent_run_id: o.parent_run_id ?? '',
    cancel_requested: !!o.cancel_requested,
    can_retry: !!workflowHandlers?.retry && (o.status === 'FAILED' || o.status === 'PARTIAL'),
    started_at: iso(o.started_at),
    finished_at: iso(o.finished_at),
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

async function load(id: string) {
  const doc = isValidObjectId(id) ? await MarketingRunModel.findById(id).lean<MarketingRunDoc>() : null;
  if (!doc) notFound();
  return doc;
}

/** Record one step's outcome, replacing an earlier record of the same key. */
export async function recordStep(runId: string, key: string, outcome: StepOutcome): Promise<void> {
  const now = new Date();
  const fields = {
    'steps.$[s].status': outcome.status,
    ...(outcome.label === undefined ? {} : { 'steps.$[s].label': outcome.label }),
    ...(outcome.tool === undefined ? {} : { 'steps.$[s].tool': outcome.tool }),
    ...(outcome.input_summary === undefined ? {} : { 'steps.$[s].input_summary': clip(outcome.input_summary, SUMMARY_MAX) }),
    ...(outcome.output_summary === undefined ? {} : { 'steps.$[s].output_summary': clip(outcome.output_summary, SUMMARY_MAX) }),
    'steps.$[s].error': clip(outcome.error, ERROR_MAX),
    'steps.$[s].ms': outcome.ms ?? 0,
    ...(outcome.status === 'RUNNING' ? { 'steps.$[s].started_at': now } : { 'steps.$[s].finished_at': now }),
  };
  const updated = await MarketingRunModel.updateOne(
    { _id: runId, 'steps.key': key },
    { $set: fields },
    { arrayFilters: [{ 's.key': key }] }
  );
  if (updated.matchedCount > 0) return;
  await MarketingRunModel.updateOne(
    { _id: runId },
    {
      $push: {
        steps: {
          $each: [
            {
              key,
              label: outcome.label ?? key,
              status: outcome.status,
              tool: outcome.tool ?? '',
              input_summary: clip(outcome.input_summary, SUMMARY_MAX),
              output_summary: clip(outcome.output_summary, SUMMARY_MAX),
              error: clip(outcome.error, ERROR_MAX),
              started_at: outcome.status === 'RUNNING' || outcome.status === 'OK' || outcome.status === 'FAILED' ? now : null,
              finished_at: outcome.status === 'RUNNING' || outcome.status === 'PENDING' ? null : now,
              ms: outcome.ms ?? 0,
            },
          ],
          $slice: -MAX_STEPS,
        },
      },
    }
  );
}

export async function logApi(runId: string, entry: ApiEntry): Promise<void> {
  await MarketingRunModel.updateOne(
    { _id: runId },
    { $push: { api_log: { $each: [{ ...entry, summary: clip(entry.summary, SUMMARY_MAX), at: new Date() }], $slice: -MAX_API_LOG } } }
  );
}

export async function addCost(runId: string, delta: { tokens_in?: number; tokens_out?: number; amount?: number }): Promise<void> {
  await MarketingRunModel.updateOne(
    { _id: runId },
    { $inc: { 'cost.tokens_in': delta.tokens_in ?? 0, 'cost.tokens_out': delta.tokens_out ?? 0, 'cost.amount': delta.amount ?? 0 } }
  );
}

/** Open a run. It starts PENDING, or AWAITING_APPROVAL when a person must say yes first. */
export async function startRun(input: StartRunInput): Promise<string> {
  const doc = await MarketingRunModel.create({
    workflow: input.workflow,
    name: clip(input.name, 200),
    trigger: input.trigger ?? 'USER',
    status: input.approval_required ? 'AWAITING_APPROVAL' : 'PENDING',
    actor: { kind: input.actor?.kind ?? 'SYSTEM', id: input.actor?.id ?? '', name: input.actor?.name ?? '', email: input.actor?.email ?? '' },
    links: { ...input.links },
    parent_run_id: input.parent_run_id ?? '',
    approval: input.approval_required ? { required: true, requested_at: new Date() } : { required: false },
  });
  return String(doc._id);
}

export async function beginRun(runId: string): Promise<void> {
  await MarketingRunModel.updateOne({ _id: runId, status: { $in: ['PENDING', 'RUNNING'] } }, { $set: { status: 'RUNNING', started_at: new Date() } });
}

export async function finishRun(runId: string, status: MarketingRunStatus, error = ''): Promise<void> {
  await MarketingRunModel.updateOne({ _id: runId }, { $set: { status, error: clip(error, ERROR_MAX), finished_at: new Date() } });
}

/** The outcome a run's steps add up to once its body returned without throwing. */
export function statusFromSteps(steps: readonly { status: string }[]): MarketingRunStatus {
  const failed = steps.filter((s) => s.status === 'FAILED').length;
  if (failed === 0) return 'COMPLETED';
  return failed === steps.length ? 'FAILED' : 'PARTIAL';
}

function contextFor(runId: string): RunContext {
  return {
    id: runId,
    async step(key, label, work, options) {
      const started = Date.now();
      await recordStep(runId, key, { status: 'RUNNING', label, tool: options?.tool, input_summary: options?.input_summary });
      try {
        const result = await work();
        const output_summary = options?.summarize ? options.summarize(result) : '';
        await recordStep(runId, key, { status: 'OK', output_summary, ms: Date.now() - started });
        return result;
      } catch (error) {
        await recordStep(runId, key, { status: 'FAILED', error: reasonOf(error), ms: Date.now() - started });
        throw error;
      }
    },
    api: (entry) => logApi(runId, entry),
    cost: (delta) => addCost(runId, delta),
    async cancelled() {
      const doc = await MarketingRunModel.findById(runId).select('cancel_requested').lean<{ cancel_requested?: boolean }>();
      return !!doc?.cancel_requested;
    },
  };
}

/**
 * Run a piece of work as a recorded run. The body's steps decide the final
 * status (COMPLETED, PARTIAL when some failed, FAILED when the body threw);
 * the thrown error is recorded and rethrown, so callers behave as before.
 */
export async function withRun<T>(input: StartRunInput, body: (ctx: RunContext) => Promise<T>): Promise<T> {
  const runId = await startRun(input);
  return continueRun(runId, body);
}

/** Pick up an existing run (one that was just approved, or is being retried) and run its body. */
export async function continueRun<T>(runId: string, body: (ctx: RunContext) => Promise<T>): Promise<T> {
  await beginRun(runId);
  const ctx = contextFor(runId);
  try {
    const result = await body(ctx);
    const doc = await MarketingRunModel.findById(runId).select('steps cancel_requested').lean<{ steps: { status: string }[]; cancel_requested?: boolean }>();
    const status = doc?.cancel_requested ? 'CANCELLED' : statusFromSteps(doc?.steps ?? []);
    await finishRun(runId, status);
    return result;
  } catch (error) {
    await finishRun(runId, 'FAILED', reasonOf(error));
    logs.server.warn('marketing-runs', 'run', { error, run_id: runId, msg: 'a marketing run failed' });
    throw error;
  }
}

/** A person's yes or no on a run that waited for one. */
export async function decideRun(
  id: string,
  decision: MarketingRunDecision,
  decider: { id: string; name: string },
  note: string
): Promise<ReturnType<typeof pubRun>> {
  const doc = await load(id);
  if (doc.status !== 'AWAITING_APPROVAL') refused('This run is not waiting for a decision.');
  if (decision !== 'APPROVED' && !note.trim()) refused('Say why — a note is required when a run is not approved.');
  const status: MarketingRunStatus = decision === 'APPROVED' ? 'PENDING' : 'CANCELLED';
  await MarketingRunModel.updateOne(
    { _id: id, status: 'AWAITING_APPROVAL' },
    {
      $set: {
        status,
        'approval.decision': decision,
        'approval.decided_by': decider.id,
        'approval.decided_by_name': decider.name,
        'approval.decided_at': new Date(),
        'approval.note': clip(note, ERROR_MAX),
        ...(status === 'CANCELLED' ? { finished_at: new Date() } : {}),
      },
    }
  );
  const updated = await load(id);
  const onDecision = handlers.get(doc.workflow)?.onDecision;
  if (onDecision) {
    // The workflow carries on in the background; the decision itself is already recorded.
    onDecision(updated, decision).catch((error: unknown) => {
      logs.server.error('marketing-runs', 'onDecision', { error, run_id: id, msg: 'continuing a decided run failed' });
    });
  }
  return pubRun(updated);
}

/** Stop a run. One not yet running stops at once; a running one is asked to stop at its next step. */
export async function cancelRun(id: string): Promise<ReturnType<typeof pubRun>> {
  const doc = await load(id);
  if (!OPEN_RUN_STATUSES.includes(doc.status)) refused('This run has already finished.');
  const immediate = doc.status !== 'RUNNING';
  await MarketingRunModel.updateOne(
    { _id: id },
    { $set: { cancel_requested: true, ...(immediate ? { status: 'CANCELLED', finished_at: new Date() } : {}) } }
  );
  return pubRun(await load(id));
}

/** Run a failed or partial run again, through the workflow's own retry. */
export async function retryRun(id: string): Promise<ReturnType<typeof pubRun>> {
  const doc = await load(id);
  const retry = handlers.get(doc.workflow)?.retry;
  if (!retry) refused('This kind of run cannot be retried from here.');
  if (doc.status !== 'FAILED' && doc.status !== 'PARTIAL') refused('Only a failed or partly completed run can be retried.');
  await MarketingRunModel.updateOne({ _id: id }, { $set: { status: 'PENDING', error: '', cancel_requested: false, finished_at: null }, $inc: { retries: 1 } });
  const updated = await load(id);
  retry(updated).catch(async (error: unknown) => {
    logs.server.error('marketing-runs', 'retry', { error, run_id: id, msg: 'retrying a run failed' });
    await finishRun(id, 'FAILED', error instanceof Error ? error.message : String(error));
  });
  return pubRun(updated);
}

/**
 * The standing counts plus the window's failures, completions and AI spend —
 * what the dashboard's Automation card and the summary both lead with.
 */
export async function runFigures(since: Date) {
  const [awaiting_approval, running, failed, finished] = await Promise.all([
    MarketingRunModel.countDocuments({ status: 'AWAITING_APPROVAL' }),
    MarketingRunModel.countDocuments({ status: { $in: ['PENDING', 'RUNNING'] } }),
    MarketingRunModel.countDocuments({ status: { $in: ['FAILED', 'PARTIAL'] }, finished_at: { $gte: since } }),
    MarketingRunModel.aggregate<{ completed: number; spend: number }>([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: null,
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          spend: { $sum: { $ifNull: ['$cost.amount', 0] } },
        },
      },
    ]).exec(),
  ]);
  return {
    awaiting_approval,
    running,
    failed,
    completed: finished[0]?.completed ?? 0,
    // Rupees. Each step's cost is already rounded; their sum is not.
    spend: Math.round((finished[0]?.spend ?? 0) * 100) / 100,
  };
}

export const marketingRunService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<MarketingRunDoc>(MarketingRunModel, {}, input, RUN_TABLE);
    return { rows: docs.map(pubRun), total, page, page_size };
  },

  async get(id: string) {
    return pubRun(await load(id));
  },

  /** The numbers My Tasks leads with: what waits, what runs, what failed this week, and what is mine. */
  async summary(userId: string) {
    const [figures, mine_open] = await Promise.all([
      runFigures(new Date(Date.now() - WEEK_MS)),
      MarketingRunModel.countDocuments({ 'actor.id': userId, status: { $in: OPEN_RUN_STATUSES } }),
    ]);
    return { awaiting_approval: figures.awaiting_approval, running: figures.running, failed_7d: figures.failed, mine_open };
  },

  decide: decideRun,
  cancel: cancelRun,
  retry: retryRun,
};
