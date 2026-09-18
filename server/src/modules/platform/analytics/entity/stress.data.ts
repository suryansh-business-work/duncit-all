import type { Types } from 'mongoose';
import {
  StressRunModel,
  type IStressEndpoint,
  type IStressPeaks,
  type IStressProfile,
  type IStressSummary,
  type StressRunStatus,
  type StressVerdictGrade,
} from '@modules/platform/stressTest/stressTest.model';
import { inRange } from './window';
import { average, pct, peak, total, type AnalyticsLeaderboard } from './shapes';

/** Every stress run started in a period, with just what the Stress Testing analytics page reads. */

export interface StressRow {
  _id: Types.ObjectId;
  status: StressRunStatus;
  created_at: Date;
  profile: Pick<IStressProfile, 'virtual_users'>;
  peaks: Partial<IStressPeaks> | null;
  summary: IStressSummary | null;
  endpoints: IStressEndpoint[] | null;
  verdict: { grade: StressVerdictGrade; safe_concurrent_users: number } | null;
}

export const loadStressRuns = (from: Date, to: Date) =>
  StressRunModel.find({ created_at: inRange(from, to) })
    .select('status created_at profile.virtual_users peaks summary endpoints verdict.grade verdict.safe_concurrent_users')
    .sort({ created_at: 1 })
    .lean<StressRow[]>();

const FINISHED = new Set<StressRunStatus>(['COMPLETED', 'ABORTED', 'FAILED']);

export const summariesOf = (rows: readonly StressRow[]) => rows.flatMap((row) => (row.summary ? [row.summary] : []));

/** Each tile's value for one period — computed identically for both periods. */
export function stressFigures(rows: readonly StressRow[]) {
  const summaries = summariesOf(rows);
  const finished = rows.filter((row) => FINISHED.has(row.status));
  return {
    runs: rows.length,
    completion: pct(finished.filter((row) => row.status === 'COMPLETED').length, finished.length),
    peak_users: peak(rows.map((row) => row.peaks?.virtual_users ?? 0)),
    peak_rps: peak(rows.map((row) => row.peaks?.rps ?? 0)),
    p95: average(summaries.map((summary) => summary.p95_ms)),
    error_rate: average(summaries.map((summary) => summary.error_rate_pct)),
    requests: total(summaries.map((summary) => summary.requests)),
  };
}

/** The newest verdict's safe number of concurrent users, or null when no run in the period has one. */
export function latestSafeUsers(rows: readonly StressRow[]): number | null {
  const judged = rows.filter((row) => row.verdict?.safe_concurrent_users !== undefined);
  return judged.at(-1)?.verdict?.safe_concurrent_users ?? null;
}

interface EndpointTotals {
  requests: number;
  errors: number;
  /** p95 × requests, so the combined p95 weighs each run by the traffic it carried. */
  weightedP95: number;
  p99: number;
}

/** The endpoints that were slowest under load, across every run in the period. */
export function endpointLeaderboard(rows: readonly StressRow[]): AnalyticsLeaderboard {
  const totals = new Map<string, EndpointTotals>();
  for (const endpoint of rows.flatMap((row) => row.endpoints ?? [])) {
    const sums = totals.get(endpoint.key) ?? { requests: 0, errors: 0, weightedP95: 0, p99: 0 };
    sums.requests += endpoint.requests;
    sums.errors += endpoint.errors;
    sums.weightedP95 += endpoint.p95_ms * endpoint.requests;
    sums.p99 = Math.max(sums.p99, endpoint.p99_ms);
    totals.set(endpoint.key, sums);
  }
  const ranked = [...totals.entries()]
    .map(([key, sums]) => ({ key, sums, p95: sums.requests > 0 ? Math.round(sums.weightedP95 / sums.requests) : 0 }))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 10);
  return {
    key: 'stress_endpoints',
    columns: [
      { key: 'requests', format: 'COUNT' },
      { key: 'error_rate', format: 'PERCENT' },
      { key: 'p95', format: 'DURATION' },
      { key: 'p99', format: 'DURATION' },
    ],
    rows: ranked.map(({ key, sums, p95 }) => ({
      id: key,
      name: key,
      caption: null,
      values: [sums.requests, pct(sums.errors, sums.requests), p95, sums.p99],
    })),
  };
}
