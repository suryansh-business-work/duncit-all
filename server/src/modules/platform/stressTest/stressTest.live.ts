import type { IStressLoadSample } from './stressTest.model';

/**
 * What each shard said most recently, held in memory.
 *
 * A shard reports every few seconds with the numbers for the window since its
 * last report. Only the newest report per shard matters for "right now", so
 * nothing here is persisted — the sampler folds the fresh reports into one
 * sample and THAT is what the database keeps. A server restart mid-run loses
 * at most one window; the next report refills it.
 */

export interface StressBotState {
  bot: string;
  kind: 'HTTP' | 'BROWSER';
  journey: string;
  page: string;
  status: string;
  load_ms: number;
  at: string;
}

export interface StressShardReport {
  shard: number;
  phase: string;
  elapsed_seconds: number;
  active_vus: number;
  active_bots: number;
  window_seconds: number;
  requests: number;
  errors: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  navigations: number;
  page_load_ms: number;
  status_counts: Array<{ code: string; count: number }>;
  bots: StressBotState[];
  received_at: number;
}

/** A shard silent for longer than this no longer counts towards "now". */
const FRESH_MS = 20_000;

const runs = new Map<string, Map<number, StressShardReport>>();

export function noteShardReport(runId: string, report: StressShardReport): void {
  let shards = runs.get(runId);
  if (!shards) {
    shards = new Map();
    runs.set(runId, shards);
  }
  shards.set(report.shard, report);
}

export function forgetRunLive(runId: string): void {
  runs.delete(runId);
}

function freshReports(runId: string): StressShardReport[] {
  const cutoff = Date.now() - FRESH_MS;
  return [...(runs.get(runId)?.values() ?? [])].filter((r) => r.received_at >= cutoff);
}

export function liveShards(runId: string): StressShardReport[] {
  const reports = [...(runs.get(runId)?.values() ?? [])];
  reports.sort((a, b) => a.shard - b.shard);
  return reports;
}

/**
 * Weighted by requests — exact for one shard, an approximation across several
 * (percentiles do not add). Good enough to watch a line move; the per-endpoint
 * table at the end is where precise numbers are read.
 */
function weighted(reports: StressShardReport[], pick: (r: StressShardReport) => number, weight: (r: StressShardReport) => number): number {
  const total = reports.reduce((acc, r) => acc + weight(r), 0);
  if (total === 0) return 0;
  return Math.round(reports.reduce((acc, r) => acc + pick(r) * weight(r), 0) / total);
}

/** Every fresh shard folded into one reading. Zeros when no shard is reporting. */
export function mergeLoad(runId: string): IStressLoadSample {
  const reports = freshReports(runId);
  const sum = (pick: (r: StressShardReport) => number) => reports.reduce((acc, r) => acc + pick(r), 0);
  const requests = sum((r) => r.requests);
  const errors = sum((r) => r.errors);
  const statusCounts: Record<string, number> = {};
  for (const report of reports) {
    for (const { code, count } of report.status_counts) {
      statusCounts[code] = (statusCounts[code] ?? 0) + count;
    }
  }
  const byRequests = (r: StressShardReport) => r.requests;
  return {
    active_vus: sum((r) => r.active_vus),
    active_bots: sum((r) => r.active_bots),
    rps: Math.round(sum((r) => (r.window_seconds > 0 ? r.requests / r.window_seconds : 0)) * 10) / 10,
    error_rate_pct: requests > 0 ? Math.round((errors / requests) * 1000) / 10 : 0,
    p50_ms: weighted(reports, (r) => r.p50_ms, byRequests),
    p95_ms: weighted(reports, (r) => r.p95_ms, byRequests),
    p99_ms: weighted(reports, (r) => r.p99_ms, byRequests),
    requests,
    errors,
    navigations: sum((r) => r.navigations),
    page_load_ms: weighted(reports, (r) => r.page_load_ms, (r) => r.navigations),
    status_counts: statusCounts,
  };
}
