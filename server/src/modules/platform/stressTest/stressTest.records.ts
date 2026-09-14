import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  STRESS_SETTINGS_KEY,
  StressRunModel,
  StressSettingsModel,
  type IStressEndpoint,
  type IStressRun,
  type IStressSample,
  type IStressSettings,
  type IStressShardResult,
  type IStressSummary,
  type StressEventLevel,
  type StressRunStatus,
} from './stressTest.model';
import { forgetRunLive } from './stressTest.live';

/**
 * The pieces every half of the module shares: the settings singleton, the
 * public shapes, the run's log, and how a run ends. One place, so the portal
 * side, the CI side and the sampler cannot each end a run their own way.
 */

/** The run log keeps its newest lines; a long run must not grow the row without bound. */
const MAX_EVENTS = 1000;

export async function settingsDoc(): Promise<IStressSettings> {
  return StressSettingsModel.findOneAndUpdate(
    { key: STRESS_SETTINGS_KEY },
    { $setOnInsert: { key: STRESS_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec() as Promise<IStressSettings>;
}

export const pubSettings = (doc: IStressSettings) => ({
  max_virtual_users: doc.max_virtual_users,
  max_browser_bots: doc.max_browser_bots,
  max_runners: doc.max_runners,
  max_duration_minutes: doc.max_duration_minutes,
  abort_error_rate_pct: doc.abort_error_rate_pct,
  abort_p95_ms: doc.abort_p95_ms,
  abort_host_cpu_pct: doc.abort_host_cpu_pct,
  abort_breach_samples: doc.abort_breach_samples,
  sample_retention_days: doc.sample_retention_days,
  updated_at: doc.updated_at?.toISOString() ?? null,
});

const iso = (d: Date | null | undefined): string | null => d?.toISOString() ?? null;

/** Seconds the run has been (or was) generating load. */
function durationSeconds(doc: IStressRun): number | null {
  if (!doc.started_at) return null;
  const end = doc.ended_at ?? new Date();
  return Math.max(0, Math.round((end.getTime() - doc.started_at.getTime()) / 1000));
}

export const pubRun = (doc: IStressRun) => ({
  id: doc._id.toHexString(),
  run_no: doc.run_no,
  status: doc.status,
  environment: doc.environment,
  target_mweb_url: doc.target_mweb_url,
  target_graphql_url: doc.target_graphql_url,
  profile: doc.profile,
  triggered_by: doc.triggered_by ?? '',
  workflow_run_url: doc.workflow_run_url ?? '',
  ref: doc.ref ?? '',
  started_at: iso(doc.started_at),
  ended_at: iso(doc.ended_at),
  stop_requested_at: iso(doc.stop_requested_at),
  stop_reason: doc.stop_reason ?? '',
  last_report_at: iso(doc.last_report_at),
  duration_seconds: durationSeconds(doc),
  peaks: doc.peaks,
  summary: doc.summary ?? null,
  endpoints: doc.endpoints ?? [],
  shards_finished: (doc.shard_results ?? []).length,
  events: (doc.events ?? []).map((e) => ({ at: e.at.toISOString(), level: e.level, source: e.source, message: e.message })),
  error_message: doc.error_message ?? '',
  created_at: iso(doc.created_at),
});

export const pubSample = (doc: IStressSample) => ({
  at: doc.at.toISOString(),
  load: doc.load,
  server: doc.server,
  containers: doc.containers ?? [],
});

/** One line on the run's timeline. Best-effort: a log line must never fail the caller. */
export async function appendEvent(
  runId: Types.ObjectId | string,
  level: StressEventLevel,
  source: string,
  message: string
): Promise<void> {
  try {
    await StressRunModel.updateOne(
      { _id: runId },
      { $push: { events: { $each: [{ at: new Date(), level, source, message }], $slice: -MAX_EVENTS } } }
    );
  } catch (err) {
    logs.server.error('stressTest', 'appendEvent', { error: err, runId: String(runId) });
  }
}

/* ── merging what the shards said at the end ─────────────────────────────── */

function weightedBy<T>(rows: T[], value: (r: T) => number, weight: (r: T) => number): number {
  const total = rows.reduce((acc, r) => acc + weight(r), 0);
  if (total === 0) return 0;
  return Math.round(rows.reduce((acc, r) => acc + value(r) * weight(r), 0) / total);
}

function mergeSummaries(results: IStressShardResult[], seconds: number): IStressSummary {
  const summaries = results.map((r) => r.summary);
  const sum = (pick: (s: IStressSummary) => number) => summaries.reduce((acc, s) => acc + (pick(s) ?? 0), 0);
  const requests = sum((s) => s.requests);
  const errors = sum((s) => s.errors);
  const byRequests = (s: IStressSummary) => s.requests;
  const navigations = sum((s) => s.navigations);
  return {
    requests,
    errors,
    error_rate_pct: requests > 0 ? Math.round((errors / requests) * 1000) / 10 : 0,
    avg_rps: seconds > 0 ? Math.round((requests / seconds) * 10) / 10 : 0,
    avg_ms: weightedBy(summaries, (s) => s.avg_ms, byRequests),
    p50_ms: weightedBy(summaries, (s) => s.p50_ms, byRequests),
    p95_ms: weightedBy(summaries, (s) => s.p95_ms, byRequests),
    p99_ms: weightedBy(summaries, (s) => s.p99_ms, byRequests),
    navigations,
    navigation_errors: sum((s) => s.navigation_errors),
    avg_page_load_ms: weightedBy(summaries, (s) => s.avg_page_load_ms, (s) => s.navigations),
  };
}

function mergeEndpoints(results: IStressShardResult[]): IStressEndpoint[] {
  const byKey = new Map<string, IStressEndpoint[]>();
  for (const endpoint of results.flatMap((r) => r.endpoints ?? [])) {
    byKey.set(endpoint.key, [...(byKey.get(endpoint.key) ?? []), endpoint]);
  }
  const merged = [...byKey.entries()].map(([key, rows]) => {
    const byRequests = (e: IStressEndpoint) => e.requests;
    return {
      key,
      requests: rows.reduce((acc, e) => acc + e.requests, 0),
      errors: rows.reduce((acc, e) => acc + e.errors, 0),
      avg_ms: weightedBy(rows, (e) => e.avg_ms, byRequests),
      p50_ms: weightedBy(rows, (e) => e.p50_ms, byRequests),
      p95_ms: weightedBy(rows, (e) => e.p95_ms, byRequests),
      p99_ms: weightedBy(rows, (e) => e.p99_ms, byRequests),
    };
  });
  merged.sort((a, b) => b.p95_ms - a.p95_ms);
  return merged;
}

/** The terminal status the shards' outcomes add up to. */
function outcomeOf(run: IStressRun, results: IStressShardResult[]): StressRunStatus {
  if (results.some((r) => r.outcome === 'FAILED')) return 'FAILED';
  if (run.stop_requested_at || results.some((r) => r.outcome === 'ABORTED')) return 'ABORTED';
  return 'COMPLETED';
}

/**
 * Close a run whose shards have all reported. Written with a status guard, so a
 * late duplicate report cannot reopen or re-close a finished run.
 */
export async function finaliseRun(run: IStressRun): Promise<void> {
  const results = run.shard_results ?? [];
  const endedAt = new Date();
  const seconds = run.started_at ? (endedAt.getTime() - run.started_at.getTime()) / 1000 : 0;
  const status = outcomeOf(run, results);
  const errors = results.filter((r) => r.error).map((r) => `Runner ${r.shard + 1}: ${r.error}`);
  const closed = await StressRunModel.updateOne(
    { _id: run._id, status: { $in: ['RUNNING', 'STOPPING'] } },
    {
      $set: {
        status,
        ended_at: endedAt,
        summary: mergeSummaries(results, seconds),
        endpoints: mergeEndpoints(results),
        error_message: errors.join(' · '),
      },
    }
  );
  if (closed.modifiedCount === 0) return;
  forgetRunLive(run._id.toHexString());
  await appendEvent(run._id, status === 'FAILED' ? 'ERROR' : 'INFO', 'server', `Run finished: ${status}.`);
  logs.server.info('stressTest', 'finished', { run_no: run.run_no, status });
}

/**
 * End a run that cannot be finalised from shard reports — nobody claimed it, the
 * runners went silent, or a stop was never acknowledged. Guarded like
 * finaliseRun, so it never overwrites a run that closed properly meanwhile.
 */
export async function endRun(
  run: IStressRun,
  status: Extract<StressRunStatus, 'ABORTED' | 'FAILED'>,
  message: string
): Promise<boolean> {
  const closed = await StressRunModel.updateOne(
    { _id: run._id, status: { $in: ['QUEUED', 'RUNNING', 'STOPPING'] } },
    { $set: { status, ended_at: new Date(), error_message: message } }
  );
  if (closed.modifiedCount === 0) return false;
  forgetRunLive(run._id.toHexString());
  await appendEvent(run._id, status === 'FAILED' ? 'ERROR' : 'WARN', 'server', message);
  logs.server.warn('stressTest', 'ended', { run_no: run.run_no, status, message });
  return true;
}
