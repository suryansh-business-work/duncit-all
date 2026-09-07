import { Schema, model, type Document } from 'mongoose';

/**
 * QUEUED is the portal's (or the scheduler's) doing: a run started from here
 * exists as a row BEFORE GitHub has a runner for it, because the dispatch REST
 * call answers 204 with no run id and whoever pressed the button still needs to
 * see that their click landed. CI moves it to RUNNING with the run url attached.
 *
 * A row can sit RUNNING forever if the runner is cancelled or killed mid-job —
 * nothing is left to report it — so treat an old RUNNING row as unknown, not live.
 */
export type E2eRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

/** What started the run. */
export type E2eRunTrigger = 'SCHEDULE' | 'PORTAL' | 'MANUAL';

/**
 * One suite's outcome. SKIPPED is not a failure: it is what a leg the operator
 * did not select reports, and telling it apart from PASSED is the difference
 * between "the admin suite is green" and "nobody ran the admin suite".
 */
export type E2eSuiteStatus = 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';

/** Daily or weekly — the same two shapes every other admin-configured job offers. */
export type E2eScheduleFrequency = 'DAILY' | 'WEEKLY';

/**
 * What one leg of the matrix did. The counts come from the JUnit report Cypress
 * writes; a leg that produced none still reports its status, so a suite that
 * died before Cypress started is a red row rather than a missing one.
 */
export interface IE2eSuiteResult {
  /** The matrix leg's name — `admin`, `mweb`, `native-web`, `no-surface`. */
  key: string;
  status: E2eSuiteStatus;
  /** How many spec files ran. Null when no report was produced. */
  specs: number | null;
  tests: number | null;
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  duration_seconds: number | null;
  /** Why it failed, in the runner's own words. Empty on every other status. */
  error: string;
  /** The GitHub job this leg ran as, so a red row leads straight to its log. */
  job_url: string;
  reported_at: Date;
}

/** A stage the workflow entered, stamped when it got there. */
export interface IE2eRunStage {
  name: string;
  at: Date;
}

/** The run's arithmetic, summed from the suite results as they land. */
export interface IE2eRunTotals {
  suites: number;
  suites_passed: number;
  suites_failed: number;
  suites_skipped: number;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface IE2eRun extends Document {
  /** Permanent, human-readable id (DUN-E2E-000001) — never reused. */
  run_no: string;
  status: E2eRunStatus;
  trigger_source: E2eRunTrigger;
  /** The portal account that started it, or the GitHub actor who did. */
  triggered_by: string;
  /** The branch the suite ran against. */
  ref: string;
  commit_sha: string;
  /**
   * Which suites were asked for. EMPTY MEANS EVERY SUITE — the same convention
   * the workflow's filter uses, so "all" is one shape rather than a list that
   * has to be kept in step with the matrix.
   */
  requested_suites: string[];
  results: IE2eSuiteResult[];
  totals: IE2eRunTotals;
  workflow_run_id: string;
  workflow_run_url: string;
  /**
   * Correlates the row written at dispatch with the reports the runner sends
   * afterwards. It travels as a workflow input, so it is the only join key
   * available BEFORE a run id exists.
   */
  dispatch_id: string;
  duration_seconds: number | null;
  /** What the workflow is doing now. Empty once the run is over. */
  stage: string;
  stages: IE2eRunStage[];
  /** Why the run failed. Empty on every other status. */
  error_message: string;
  /** Who the CI authenticated as when it reported. */
  reported_by: string;
  /**
   * The dynamic half of this run's identity — `ddMMyyyyHHmm` in the platform's
   * own timezone. Stored because it is the only way to find, weeks later, the
   * account a given run created.
   */
  identity_stamp: string;
  /** The account the suite signs IN as. Stable across runs. */
  login_email: string;
  /** The account the suite signs UP as. Unique to this run. */
  signup_email: string;
  identity_phone: string;
  /**
   * What happened to the Slack announcement. Slack is a NOTIFICATION, not the
   * store of record — the row is. A run nobody could be told about stays
   * visible here, with the reason it was not posted.
   */
  slack_channel: string | null;
  slack_ts: string | null;
  slack_error: string | null;
  created_at: Date;
  updated_at: Date;
}

const suiteResultSchema = new Schema<IE2eSuiteResult>(
  {
    key: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['RUNNING', 'PASSED', 'FAILED', 'SKIPPED'],
      default: 'RUNNING',
    },
    specs: { type: Number, default: null },
    tests: { type: Number, default: null },
    passed: { type: Number, default: null },
    failed: { type: Number, default: null },
    skipped: { type: Number, default: null },
    duration_seconds: { type: Number, default: null },
    error: { type: String, default: '' },
    job_url: { type: String, default: '' },
    reported_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stageSchema = new Schema<IE2eRunStage>(
  {
    name: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const totalsSchema = new Schema<IE2eRunTotals>(
  {
    suites: { type: Number, default: 0 },
    suites_passed: { type: Number, default: 0 },
    suites_failed: { type: Number, default: 0 },
    suites_skipped: { type: Number, default: 0 },
    tests: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
  },
  { _id: false }
);

const e2eRunSchema = new Schema<IE2eRun>(
  {
    run_no: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    trigger_source: {
      type: String,
      enum: ['SCHEDULE', 'PORTAL', 'MANUAL'],
      default: 'MANUAL',
      index: true,
    },
    triggered_by: { type: String, default: '' },
    ref: { type: String, default: '', index: true },
    commit_sha: { type: String, default: '' },
    requested_suites: { type: [String], default: [] },
    results: { type: [suiteResultSchema], default: [] },
    totals: { type: totalsSchema, default: () => ({}) },
    workflow_run_id: { type: String, default: '' },
    workflow_run_url: { type: String, default: '' },
    dispatch_id: { type: String, default: '' },
    duration_seconds: { type: Number, default: null },
    stage: { type: String, default: '' },
    stages: { type: [stageSchema], default: [] },
    error_message: { type: String, default: '' },
    reported_by: { type: String, default: '' },
    identity_stamp: { type: String, default: '' },
    login_email: { type: String, default: '' },
    signup_email: { type: String, default: '' },
    identity_phone: { type: String, default: '' },
    slack_channel: { type: String, default: null },
    slack_ts: { type: String, default: null },
    slack_error: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The table reads newest-first and nothing else.
e2eRunSchema.index({ created_at: -1 });

// How the reports of one workflow find each other and stay one row. NOT unique:
// workflow_run_id is '' on a row that was dispatched and never picked up, and a
// unique index would let only one of those exist at a time.
e2eRunSchema.index({ workflow_run_id: 1 });

// How a dispatched row finds the reports of the run it started. Checked BEFORE
// workflow_run_id, because the row exists before the run does.
e2eRunSchema.index({ dispatch_id: 1 }, { sparse: true });

export const E2eRunModel = model<IE2eRun>('E2eRun', e2eRunSchema);

/**
 * The schedule and the identity the suite runs as, as a singleton.
 *
 * `last_run_at` is the scheduler's memory: it is stamped when a run is
 * dispatched, whether or not that run then passes, so a server that cannot
 * reach GitHub does not re-dispatch every minute for a day.
 */
export interface IE2eRunSettings extends Document {
  key: string;
  enabled: boolean;
  frequency: E2eScheduleFrequency;
  /** Wall-clock `HH:mm` in the platform's configured timezone, not the container's UTC. */
  time_of_day: string;
  /** 0-6, Sunday first. Only read when frequency is WEEKLY. */
  weekday: number;
  /** The branch scheduled runs are dispatched against. */
  ref: string;
  /** Which suites a scheduled run asks for. Empty means every one of them. */
  suites: string[];
  /** How many runs to keep. Older rows are pruned after each scheduled run. */
  keep_last: number;
  /** The local part the run identities are built from, e.g. `suryansh`. */
  email_prefix: string;
  email_domain: string;
  /**
   * The password both identities use. Stored because the runner has to be told
   * it and there is nowhere else it could come from; never returned to a
   * client, which only ever learns whether one is set.
   */
  password: string;
  identity_phone: string;
  last_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const e2eRunSettingsSchema = new Schema<IE2eRunSettings>(
  {
    key: { type: String, required: true, unique: true },
    // OFF until an operator turns it on, the same as the nightly database
    // backup. The singleton is created by the first read — a default of true
    // would mean deploying this feature silently starts a forty-minute CI
    // sweep before anyone has opened the page.
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['DAILY', 'WEEKLY'], default: 'DAILY' },
    // The quiet hour the platform's own users are asleep through, which is the
    // whole reason a nightly suite is nightly.
    time_of_day: { type: String, default: '03:00' },
    weekday: { type: Number, default: 1 },
    ref: { type: String, default: 'staging' },
    suites: { type: [String], default: [] },
    keep_last: { type: Number, default: 100 },
    email_prefix: { type: String, default: '' },
    email_domain: { type: String, default: '' },
    password: { type: String, default: '' },
    identity_phone: { type: String, default: '' },
    last_run_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const E2eRunSettingsModel = model<IE2eRunSettings>('E2eRunSettings', e2eRunSettingsSchema);

export const E2E_SETTINGS_KEY = 'e2e_run';

// Atomic sequential counter for run ids (the same pattern as AppBuildCounter).
interface IE2eRunCounter extends Document {
  singleton_key: string;
  seq: number;
}

const e2eRunCounterSchema = new Schema<IE2eRunCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const E2eRunCounterModel = model<IE2eRunCounter>('E2eRunCounter', e2eRunCounterSchema);

/** Next globally unique run id, e.g. `DUN-E2E-000001` — never reused. */
export async function nextRunNo(): Promise<string> {
  const doc = await E2eRunCounterModel.findOneAndUpdate(
    { singleton_key: 'e2e_run' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `DUN-E2E-${String(doc.seq).padStart(6, '0')}`;
}
