import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs, SERVER_ENV } from '@observability/log';
import { readServerPulse } from '@observability/serverPulse';
import { getUrlConfigs } from '@config/url-configs';
import { hasRole } from '@middleware/rbac';
import type { AuthUser } from '@context';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  cancelWorkflowRun,
  dispatchWorkflow,
  githubRepoConfig,
  requireGithubRepoConfig,
} from '@utils/github-actions';
import {
  LIVE_STATUSES,
  StressRunModel,
  StressSampleModel,
  StressSettingsModel,
  STRESS_SETTINGS_KEY,
  nextStressRunNo,
  type IStressProfile,
  type IStressRun,
  type IStressSettings,
} from './stressTest.model';
import { STRESS_JOURNEYS, normaliseJourneys } from './stressTest.journeys';
import { hashTrafficKey, trafficKeyFor } from './stressTest.traffic';
import { liveShards } from './stressTest.live';
import { appendEvent, endRun, pubRun, pubSample, pubSettings, settingsDoc } from './stressTest.records';

/** The one workflow this module drives. */
export const STRESS_WORKFLOW_FILE = 'stress-test.yml';

/** Only production is guarded by a typed confirmation and the top role. */
const PRODUCTION = 'production';
export const PRODUCTION_CONFIRM_TEXT = 'PRODUCTION';

/** A run's samples are read in one go; a 30-minute run at 5s is 360 of them. */
const MAX_SAMPLES = 1500;

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const STRESS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['run_no', 'triggered_by', 'environment', 'stop_reason', 'error_message'],
  sortFields: {
    run_no: 'run_no',
    status: 'status',
    environment: 'environment',
    triggered_by: 'triggered_by',
    started_at: 'started_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    environment: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** The branch the workflow is dispatched on — the one this environment deploys from. */
const refForEnvironment = () => (SERVER_ENV === PRODUCTION ? 'main' : 'staging');

function intIn(value: unknown, min: number, max: number, message: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badInput(message);
  return n;
}

/** The requested profile, checked against the admin-configured ceilings. */
function validateProfile(input: any, settings: IStressSettings): IStressProfile {
  const virtualUsers = intIn(
    input.virtual_users,
    1,
    settings.max_virtual_users,
    `Virtual users must be between 1 and ${settings.max_virtual_users}.`
  );
  const runners = intIn(input.runners, 1, settings.max_runners, `Runners must be between 1 and ${settings.max_runners}.`);
  if (runners > virtualUsers) throw badInput('Every runner needs at least one virtual user.');
  const profile: IStressProfile = {
    virtual_users: virtualUsers,
    browser_bots: intIn(input.browser_bots, 0, settings.max_browser_bots, `Browser bots must be between 0 and ${settings.max_browser_bots}.`),
    runners,
    ramp_up_seconds: intIn(input.ramp_up_seconds, 0, 1800, 'Ramp-up must be between 0 and 1800 seconds.'),
    hold_seconds: intIn(input.hold_seconds, 10, 7200, 'Hold must be between 10 and 7200 seconds.'),
    ramp_down_seconds: intIn(input.ramp_down_seconds, 0, 600, 'Ramp-down must be between 0 and 600 seconds.'),
    think_time_ms: intIn(input.think_time_ms, 0, 60_000, 'Think time must be between 0 and 60000 ms.'),
    journeys: normaliseJourneys(input.journeys),
  };
  const total = profile.ramp_up_seconds + profile.hold_seconds + profile.ramp_down_seconds;
  if (total > settings.max_duration_minutes * 60) {
    throw badInput(`The whole run must fit in ${settings.max_duration_minutes} minutes.`);
  }
  return profile;
}

/**
 * True when a staging server's own URLs point somewhere other than staging.
 * Production and staging share a box and a config shape; a staging env file
 * missing its URLs falls back to production's, and a stress run started from
 * staging would then quietly load production.
 */
function targetsLeaveStaging(target: { mweb: string; server: string }): boolean {
  if (SERVER_ENV !== 'staging') return false;
  const isStagingHost = (url: string) => new URL(url).host.startsWith('staging.');
  return !(isStagingHost(target.mweb) && isStagingHost(target.server));
}

async function targets() {
  const { mwebUrl, serverUrl } = await getUrlConfigs();
  const server = serverUrl.replace(/\/$/, '');
  return { mweb: mwebUrl.replace(/\/$/, ''), server, graphql: `${server}/graphql` };
}

export const stressTestService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IStressRun>(
      StressRunModel,
      {},
      input,
      STRESS_TABLE_CONFIG
    );
    return { rows: docs.map(pubRun), total, page, page_size };
  },

  async run(id: string) {
    const doc = await StressRunModel.findById(id);
    if (!doc) throw badInput('That stress run no longer exists.');
    return pubRun(doc);
  },

  async samples(id: string) {
    const docs = await StressSampleModel.find({ run_id: id }).sort({ at: 1 }).limit(MAX_SAMPLES);
    return docs.map(pubSample);
  },

  /** What the shards are doing this second — never persisted, read while a run is live. */
  live(id: string) {
    return liveShards(id).map((shard) => ({
      ...shard,
      received_at: new Date(shard.received_at).toISOString(),
    }));
  },

  pulse() {
    return readServerPulse();
  },

  async settings() {
    return pubSettings(await settingsDoc());
  },

  async updateSettings(input: any) {
    const set = {
      max_virtual_users: intIn(input.max_virtual_users, 1, 20_000, 'Max virtual users must be between 1 and 20000.'),
      max_browser_bots: intIn(input.max_browser_bots, 0, 50, 'Max browser bots must be between 0 and 50.'),
      max_runners: intIn(input.max_runners, 1, 20, 'Max runners must be between 1 and 20.'),
      max_duration_minutes: intIn(input.max_duration_minutes, 1, 120, 'Max duration must be between 1 and 120 minutes.'),
      abort_error_rate_pct: intIn(input.abort_error_rate_pct, 1, 100, 'Error-rate guardrail must be between 1 and 100%.'),
      abort_p95_ms: intIn(input.abort_p95_ms, 100, 120_000, 'Latency guardrail must be between 100 and 120000 ms.'),
      abort_host_cpu_pct: intIn(input.abort_host_cpu_pct, 10, 100, 'CPU guardrail must be between 10 and 100%.'),
      abort_host_memory_pct: intIn(input.abort_host_memory_pct, 10, 100, 'Memory guardrail must be between 10 and 100%.'),
      abort_breach_samples: intIn(input.abort_breach_samples, 1, 60, 'Breach count must be between 1 and 60.'),
      sample_retention_days: intIn(input.sample_retention_days, 1, 365, 'Retention must be between 1 and 365 days.'),
    };
    const doc = await StressSettingsModel.findOneAndUpdate(
      { key: STRESS_SETTINGS_KEY },
      { $set: set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return pubSettings(doc as IStressSettings);
  },

  async triggerConfig(user: AuthUser) {
    const [cfg, settings, target] = await Promise.all([githubRepoConfig(), settingsDoc(), targets()]);
    const live = await StressRunModel.findOne({ status: { $in: LIVE_STATUSES } }, { run_no: 1 });
    let blockedReason = '';
    if (SERVER_ENV === 'localhost') blockedReason = 'LOCAL';
    else if (targetsLeaveStaging(target)) blockedReason = 'TARGET';
    else if (!cfg) blockedReason = 'GITHUB';
    return {
      configured: blockedReason === '',
      blocked_reason: blockedReason,
      environment: SERVER_ENV,
      requires_confirmation: SERVER_ENV === PRODUCTION,
      confirm_text: PRODUCTION_CONFIRM_TEXT,
      can_start: SERVER_ENV !== PRODUCTION || hasRole(user, ['SUPER_ADMIN']),
      live_run_no: live?.run_no ?? null,
      target_mweb_url: target.mweb,
      target_graphql_url: target.graphql,
      repository: cfg ? `${cfg.owner}/${cfg.repo}` : '',
      ref: refForEnvironment(),
      journeys: [...STRESS_JOURNEYS],
      limits: pubSettings(settings),
    };
  },

  /**
   * Start a run against THIS server's own environment. A run always targets
   * the environment it was started from — a production portal stresses
   * production, a staging portal staging — so no server ever needs another
   * environment's credentials to watch the load it caused.
   */
  async trigger(input: any, user: AuthUser) {
    if (SERVER_ENV === 'localhost') throw badInput('Stress runs cannot target a local server — GitHub runners cannot reach it.');
    if (SERVER_ENV === PRODUCTION) {
      if (!hasRole(user, ['SUPER_ADMIN'])) {
        throw new GraphQLError('Only a Super Admin can stress production.', { extensions: { code: 'FORBIDDEN' } });
      }
      if (String(input.confirm_text ?? '').trim() !== PRODUCTION_CONFIRM_TEXT) {
        throw badInput(`Type ${PRODUCTION_CONFIRM_TEXT} to confirm a run against production.`);
      }
    }
    const settings = await settingsDoc();
    const profile = validateProfile(input, settings);
    const live = await StressRunModel.findOne({ status: { $in: LIVE_STATUSES } }, { run_no: 1 });
    if (live) throw badInput(`${live.run_no} is still running. Stop it before starting another.`);

    const cfg = await requireGithubRepoConfig();
    const target = await targets();
    if (targetsLeaveStaging(target)) {
      throw badInput(`This staging server's URLs point at ${target.mweb} and ${target.server} — refusing to send staging's load there.`);
    }
    const dispatchId = randomUUID();
    const ref = refForEnvironment();
    const run = await StressRunModel.create({
      run_no: await nextStressRunNo(),
      status: 'QUEUED',
      environment: SERVER_ENV,
      target_mweb_url: target.mweb,
      target_graphql_url: target.graphql,
      profile,
      triggered_by: user.email ?? user.id,
      dispatch_id: dispatchId,
      traffic_key_hash: hashTrafficKey(trafficKeyFor(dispatchId)),
      ref,
      events: [{ at: new Date(), level: 'INFO', source: 'portal', message: `Queued by ${user.email ?? user.id}.` }],
    });
    const plannedMinutes = Math.ceil((profile.ramp_up_seconds + profile.hold_seconds + profile.ramp_down_seconds) / 60);
    try {
      await dispatchWorkflow(cfg, STRESS_WORKFLOW_FILE, ref, {
        dispatch_id: dispatchId,
        report_url: `${target.server}/graphql`,
        runners: String(profile.runners),
        // The job's own ceiling: the plan, plus installing Chrome and winding down.
        timeout_minutes: String(plannedMinutes + 10),
      });
    } catch (err) {
      await StressRunModel.deleteOne({ _id: run._id });
      throw err;
    }
    logs.server.warn('stressTest', 'trigger', {
      userId: user.id,
      run_no: run.run_no,
      environment: SERVER_ENV,
      virtual_users: profile.virtual_users,
      browser_bots: profile.browser_bots,
    });
    return pubRun(run);
  },

  /**
   * Ask a run to stop. A queued run ends at once; a running one is flagged and
   * its shards wind down on their next report — the sampler cancels the
   * workflow if they do not.
   */
  async stop(id: string, user: AuthUser) {
    const run = await StressRunModel.findById(id);
    if (!run) throw badInput('That stress run no longer exists.');
    const who = user.email ?? user.id;
    if (run.status === 'QUEUED') {
      await endRun(run, 'ABORTED', `Cancelled by ${who} before a runner picked it up.`);
    } else if (run.status === 'RUNNING') {
      await StressRunModel.updateOne(
        { _id: run._id, status: 'RUNNING' },
        { $set: { status: 'STOPPING', stop_requested_at: new Date(), stop_reason: `Stopped by ${who}` } }
      );
      await appendEvent(run._id, 'WARN', 'portal', `Stop requested by ${who}.`);
    }
    logs.server.warn('stressTest', 'stop', { userId: user.id, run_no: run.run_no, from: run.status });
    return pubRun((await StressRunModel.findById(id)) as IStressRun);
  },

  async remove(id: string) {
    const run = await StressRunModel.findById(id, { status: 1 });
    if (!run) return true;
    if (LIVE_STATUSES.includes(run.status)) throw badInput('Stop the run before deleting it.');
    await StressSampleModel.deleteMany({ run_id: run._id });
    await StressRunModel.deleteOne({ _id: run._id });
    return true;
  },
};

/** Cancel the run's workflow on GitHub. Best-effort — the row is closed either way. */
export async function cancelRunWorkflow(run: IStressRun): Promise<void> {
  if (!run.workflow_run_id) return;
  const cfg = await githubRepoConfig();
  if (!cfg) return;
  try {
    await cancelWorkflowRun(cfg, run.workflow_run_id);
    await appendEvent(run._id, 'WARN', 'server', 'Cancelled the GitHub workflow run.');
  } catch (err) {
    logs.server.error('stressTest', 'cancelWorkflow', { error: err, run_no: run.run_no });
  }
}
