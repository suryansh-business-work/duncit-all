/**
 * The heartbeat of a live stress run.
 *
 * Every five seconds, while any run is live:
 *  1. refreshes which traffic keys the pulse and the rate limiter accept;
 *  2. folds the shards' newest reports, this server's pulse and the busiest
 *     containers into ONE sample — the time series the charts draw;
 *  3. raises the run's peaks atomically;
 *  4. enforces the guardrails, and ends runs nobody is driving any more.
 *
 * The guardrails live HERE, on the server under test, rather than in the
 * runner: the runner cannot see the host's CPU, and a runner that has crashed
 * cannot stop anything. A breach has to persist for the configured number of
 * samples before it trips, so one slow GC pause does not abort a run.
 *
 * With no live run the tick is a single indexed query. No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { readServerPulse } from '@observability/serverPulse';
import {
  LIVE_STATUSES,
  StressRunModel,
  StressSampleModel,
  type IStressContainerSample,
  type IStressLoadSample,
  type IStressRun,
  type IStressServerSample,
  type IStressSettings,
} from './stressTest.model';
import { setActiveTrafficKeys } from './stressTest.traffic';
import { mergeLoad } from './stressTest.live';
import { sampleContainers } from './stressTest.containers';
import { appendEvent, endRun, finaliseRun, settingsDoc } from './stressTest.records';
import { cancelRunWorkflow } from './stressTest.service';

const TICK_MS = 5_000;
/** GitHub can take a while to find a runner, but not this long. */
const QUEUE_TIMEOUT_MS = 20 * 60_000;
/** A running shard reports every five seconds; three minutes of nothing is a dead runner. */
const SILENCE_TIMEOUT_MS = 3 * 60_000;
/** How long shards get to acknowledge a stop before the workflow is cancelled. */
const STOP_GRACE_MS = 2 * 60_000;
/**
 * The same, for a host out of CPU or memory. Short on purpose: a server that
 * busy may not answer the runners' reports at all, so they would never read the
 * stop flag and the only way to take the load off is to cancel the workflow.
 */
const TERMINATE_GRACE_MS = 30_000;
/** Slack past the planned duration before the run is stopped for overrunning. */
const OVERRUN_GRACE_MS = 3 * 60_000;
/** A window this small says nothing about an error rate. */
const MIN_REQUESTS_FOR_ERROR_RATE = 20;

const breaches = new Map<string, number>();

const olderThan = (date: Date | null | undefined, ms: number) => date != null && Date.now() - date.getTime() > ms;

function toServerSample(): IStressServerSample {
  const pulse = readServerPulse();
  return {
    host_cpu_pct: pulse.host_cpu_pct,
    host_memory_pct: pulse.host_memory_pct,
    load_avg_1: pulse.load_avg_1,
    event_loop_lag_ms: pulse.event_loop_lag_ms,
    heap_used_mb: pulse.heap_used_mb,
    rss_mb: pulse.rss_mb,
    rps_total: pulse.rps_total,
    rps_stress: pulse.rps_stress,
    in_flight: pulse.in_flight,
    server_p95_ms: pulse.server_p95_ms,
    status_5xx: pulse.status_5xx,
    sockets: pulse.sockets,
    real_users: pulse.real_users,
    visitors: pulse.visitors,
  };
}

/** Which latency or error guardrail this reading breaks, or null. These must persist to trip. */
function breachOf(load: IStressLoadSample, settings: IStressSettings): string | null {
  if (load.requests >= MIN_REQUESTS_FOR_ERROR_RATE && load.error_rate_pct >= settings.abort_error_rate_pct) {
    return `error rate ${load.error_rate_pct}% ≥ ${settings.abort_error_rate_pct}%`;
  }
  if (load.p95_ms >= settings.abort_p95_ms) return `p95 latency ${load.p95_ms} ms ≥ ${settings.abort_p95_ms} ms`;
  return null;
}

/**
 * Which host resource this reading exhausts, or null. Trips on ONE sample: the
 * CPU figure is already a five-second average, and a host out of memory starts
 * killing processes — production's among them — long before a streak is counted.
 */
function exhaustionOf(server: IStressServerSample, settings: IStressSettings): string | null {
  if (server.host_memory_pct >= settings.abort_host_memory_pct) {
    return `host memory ${server.host_memory_pct}% ≥ ${settings.abort_host_memory_pct}%`;
  }
  if (server.host_cpu_pct >= settings.abort_host_cpu_pct) {
    return `host CPU ${server.host_cpu_pct}% ≥ ${settings.abort_host_cpu_pct}%`;
  }
  return null;
}

async function requestStop(run: IStressRun, reason: string, terminated = false): Promise<void> {
  const flagged = await StressRunModel.updateOne(
    { _id: run._id, status: 'RUNNING' },
    { $set: { status: 'STOPPING', stop_requested_at: new Date(), stop_reason: reason, terminated } }
  );
  if (flagged.modifiedCount === 0) return;
  const verb = terminated ? 'Terminating' : 'Stopping';
  await appendEvent(run._id, terminated ? 'ERROR' : 'WARN', 'guardrail', `${verb}: ${reason}.`);
  logs.server.warn('stressTest', 'guardrail', { run_no: run.run_no, reason, terminated });
}

async function recordSample(
  run: IStressRun,
  settings: IStressSettings,
  server: IStressServerSample,
  containers: IStressContainerSample[]
): Promise<IStressLoadSample> {
  const load = mergeLoad(run._id.toHexString());
  const at = new Date();
  await StressSampleModel.create({
    run_id: run._id,
    at,
    load,
    server,
    containers,
    expires_at: new Date(at.getTime() + settings.sample_retention_days * 86_400_000),
  });
  await StressRunModel.updateOne(
    { _id: run._id },
    {
      $max: {
        'peaks.virtual_users': load.active_vus,
        'peaks.browser_bots': load.active_bots,
        'peaks.rps': load.rps,
        'peaks.p95_ms': load.p95_ms,
        'peaks.error_rate_pct': load.error_rate_pct,
        'peaks.host_cpu_pct': server.host_cpu_pct,
        'peaks.host_memory_pct': server.host_memory_pct,
        'peaks.event_loop_lag_ms': server.event_loop_lag_ms,
        'peaks.real_users': server.real_users,
      },
    }
  );
  return load;
}

async function guard(run: IStressRun, load: IStressLoadSample, server: IStressServerSample, settings: IStressSettings) {
  const id = run._id.toHexString();
  const exhausted = exhaustionOf(server, settings);
  if (exhausted) {
    await requestStop(run, `Terminated — ${exhausted}`, true);
    return;
  }
  const breach = breachOf(load, settings);
  const count = breach ? (breaches.get(id) ?? 0) + 1 : 0;
  breaches.set(id, count);
  if (breach && count >= settings.abort_breach_samples) {
    await requestStop(run, `Guardrail tripped — ${breach}`);
    return;
  }
  const { ramp_up_seconds, hold_seconds, ramp_down_seconds } = run.profile;
  const plannedMs = (ramp_up_seconds + hold_seconds + ramp_down_seconds) * 1000;
  if (olderThan(run.started_at, plannedMs + OVERRUN_GRACE_MS)) {
    await requestStop(run, 'The run went past its planned duration');
  }
}

/**
 * Close a run its runners have stopped driving, cancelling the workflow first.
 * When some shards did report back — a runner GitHub never started, or one that
 * died — the run closes on what arrived rather than throwing those totals away.
 */
async function closeAbandoned(
  run: IStressRun,
  status: 'ABORTED' | 'FAILED',
  message: string
): Promise<boolean> {
  await cancelRunWorkflow(run);
  const finished = (run.shard_results ?? []).length;
  if (finished === 0) return endRun(run, status, message);
  const partial = `Only ${finished} of ${run.profile.runners} runners reported back; closing the run on their results.`;
  await appendEvent(run._id, 'WARN', 'server', `${message} ${partial}`);
  await finaliseRun(run);
  return true;
}

/** Runs nobody is driving any more: never claimed, gone silent, or ignoring a stop. */
async function sweep(run: IStressRun): Promise<boolean> {
  if (run.status === 'QUEUED' && olderThan(run.created_at, QUEUE_TIMEOUT_MS)) {
    return endRun(run, 'FAILED', 'No GitHub runner picked the run up within 20 minutes.');
  }
  const grace = run.terminated ? TERMINATE_GRACE_MS : STOP_GRACE_MS;
  if (run.status === 'STOPPING' && olderThan(run.stop_requested_at, grace)) {
    const reason = run.stop_reason || 'Stopped';
    return closeAbandoned(run, 'ABORTED', `${reason} — the runners did not acknowledge in time.`);
  }
  if (run.status !== 'QUEUED' && olderThan(run.last_report_at, SILENCE_TIMEOUT_MS)) {
    return closeAbandoned(run, 'FAILED', 'The runners stopped reporting for three minutes.');
  }
  return false;
}

async function tick(): Promise<void> {
  const live = await StressRunModel.find({ status: { $in: LIVE_STATUSES } });
  setActiveTrafficKeys(live.map((run) => run.traffic_key_hash));
  if (live.length === 0) {
    breaches.clear();
    return;
  }
  const settings = await settingsDoc();
  const server = toServerSample();
  const loading = live.filter((run) => run.status !== 'QUEUED');
  const containers = loading.length > 0 ? await sampleContainers() : [];
  for (const run of live) {
    if (await sweep(run)) continue;
    if (run.status === 'QUEUED') continue;
    const load = await recordSample(run, settings, server, containers);
    if (run.status === 'RUNNING') await guard(run, load, server, settings);
  }
}

/** Start the sampler. Returns a stop function. */
export function startStressTestSampler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const interval = setInterval(() => {
    // One tick at a time: a slow Docker socket must not stack samples up.
    if (running) return;
    running = true;
    tick()
      .catch((err) => logs.server.error('stressTest', 'sampler', { error: err }))
      .finally(() => {
        running = false;
      });
  }, TICK_MS);
  interval.unref?.();
  return () => clearInterval(interval);
}
