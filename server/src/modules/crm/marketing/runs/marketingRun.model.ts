import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One automation, job or agent run in the Marketing console — a post going
 * out, an account sync, a lead search, a sequence step, an agent's plan.
 *
 * Every run is a document so that what was planned, which tools ran, what the
 * platforms answered and who approved it can be read back later, from the
 * Activity timeline, the Approval Centre and My Tasks. The row is the audit
 * trail: nothing here is ever deleted by the application.
 */
export const RUN_STATUSES = [
  'PENDING',
  'RUNNING',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
] as const;
export type MarketingRunStatus = (typeof RUN_STATUSES)[number];

/** The runs that are still going; anything else is history. */
export const OPEN_RUN_STATUSES: readonly MarketingRunStatus[] = ['PENDING', 'RUNNING', 'AWAITING_APPROVAL'];

/** What kind of work a run is — the Activity filter and the retry handler key. */
export const RUN_WORKFLOWS = [
  'SOCIAL_PUBLISH',
  'SOCIAL_SYNC',
  'SOCIAL_HEALTH',
  'REEL',
  'LEAD_SEARCH',
  'LEAD_IMPORT',
  'OUTREACH',
  'AGENT',
  'ORCHESTRATOR',
  'CAMPAIGN',
  'OTHER',
] as const;
export type MarketingRunWorkflow = (typeof RUN_WORKFLOWS)[number];

export const RUN_TRIGGERS = ['USER', 'SCHEDULE', 'WEBHOOK', 'AGENT', 'SYSTEM'] as const;
export type MarketingRunTrigger = (typeof RUN_TRIGGERS)[number];

export const RUN_ACTOR_KINDS = ['USER', 'AGENT', 'SYSTEM'] as const;
export type MarketingRunActorKind = (typeof RUN_ACTOR_KINDS)[number];

export const RUN_STEP_STATUSES = ['PENDING', 'RUNNING', 'OK', 'FAILED', 'SKIPPED', 'WAITING'] as const;
export type MarketingRunStepStatus = (typeof RUN_STEP_STATUSES)[number];

export const RUN_DECISIONS = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const;
export type MarketingRunDecision = (typeof RUN_DECISIONS)[number];

/** The most steps and provider calls one run keeps; older ones fall off the end. */
export const MAX_STEPS = 200;
export const MAX_API_LOG = 50;

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

const stepSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    status: { type: String, enum: RUN_STEP_STATUSES, default: 'PENDING' },
    /** The tool or operation behind the step, when there is one. */
    tool: { type: String, default: '' },
    input_summary: { type: String, default: '' },
    output_summary: { type: String, default: '' },
    error: { type: String, default: '' },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
    ms: { type: Number, default: 0 },
  },
  { _id: false }
);

/** One call to an outside service, as the run saw it — never a token, never a full body. */
const apiLogSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    service: { type: String, default: '' },
    method: { type: String, default: '' },
    url: { type: String, default: '' },
    status: { type: Number, default: 0 },
    ms: { type: Number, default: 0 },
    summary: { type: String, default: '' },
  },
  { _id: false }
);

const runSchema = new Schema(
  {
    workflow: { type: String, enum: RUN_WORKFLOWS, required: true, index: true },
    /** What a person reads in the timeline — "Publish: Diwali reel to 3 accounts". */
    name: { type: String, required: true },
    trigger: { type: String, enum: RUN_TRIGGERS, default: 'USER' },
    status: { type: String, enum: RUN_STATUSES, default: 'PENDING', index: true },
    actor: {
      kind: { type: String, enum: RUN_ACTOR_KINDS, default: 'SYSTEM' },
      /** A user id, an agent key, or '' for the system. */
      id: { type: String, default: '', index: true },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    /** What the run touched, each one a string id so the table filters can match it. */
    links: {
      account_id: { type: String, default: '', index: true },
      campaign_id: { type: String, default: '', index: true },
      lead_id: { type: String, default: '', index: true },
      post_id: { type: String, default: '', index: true },
      reel_id: { type: String, default: '' },
      agent_key: { type: String, default: '' },
    },
    steps: { type: [stepSchema], default: [] },
    api_log: { type: [apiLogSchema], default: [] },
    retries: { type: Number, default: 0 },
    error: { type: String, default: '' },
    approval: {
      required: { type: Boolean, default: false },
      requested_at: { type: Date, default: null },
      decision: { type: String, enum: [...RUN_DECISIONS, null], default: null },
      decided_by: { type: String, default: '' },
      decided_by_name: { type: String, default: '' },
      decided_at: { type: Date, default: null },
      note: { type: String, default: '' },
    },
    cost: {
      tokens_in: { type: Number, default: 0 },
      tokens_out: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    /** The orchestrator run this one is a part of, when it is. */
    parent_run_id: { type: String, default: '', index: true },
    cancel_requested: { type: Boolean, default: false },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
  },
  { timestamps, minimize: false }
);

runSchema.index({ status: 1, created_at: -1 });
runSchema.index({ workflow: 1, created_at: -1 });
runSchema.index({ 'actor.id': 1, created_at: -1 });

export type MarketingRunDoc = InferSchemaType<typeof runSchema> & { _id: unknown };
export type MarketingRunStep = InferSchemaType<typeof stepSchema>;
export type MarketingRunApiEntry = InferSchemaType<typeof apiLogSchema>;

export const MarketingRunModel = model('MarketingRun', runSchema, 'marketing_runs');
