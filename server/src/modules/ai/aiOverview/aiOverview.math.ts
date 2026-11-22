import type { Tally } from '@modules/platform/analytics/entity/aggregates';
import type { DayUsage } from '@modules/ai/aiFeature/aiFeature.dashboard';

/**
 * The pure half of the AI portal Dashboard: turning aggregation rows into the
 * headline totals, the change against the previous window, and the AI
 * Monitoring and Automation summaries. No database here, so every rule is
 * unit-tested on its own.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** One window's OpenAI usage log rows, grouped by the service. */
export interface PeriodRow {
  calls: number;
  success: number;
  failed: number;
  skipped: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  duration: number | null;
  unpriced: number;
  /** Every user id that made a call — blanks and nulls included, dropped here. */
  users: ReadonlyArray<string | null | undefined>;
}

export interface OverviewTotals {
  calls: number;
  success_calls: number;
  failed_calls: number;
  skipped_calls: number;
  error_rate: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  active_users: number;
  unpriced_calls: number;
}

export interface OverviewChange {
  calls: number | null;
  cost_usd: number | null;
  total_tokens: number | null;
  active_users: number | null;
  avg_duration_ms: number | null;
  error_rate_points: number | null;
}

/** Percent of calls that failed, to one decimal. No calls is 0, not a division by zero. */
export const errorRate = (failed: number, calls: number): number =>
  calls === 0 ? 0 : round1((failed / calls) * 100);

/** How many distinct people a set of user ids names — a call with no user is not a person. */
export const distinctUsers = (ids: ReadonlyArray<string | null | undefined>): number =>
  new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')).size;

export function toTotals(row: PeriodRow | undefined): OverviewTotals {
  if (!row) {
    return {
      calls: 0,
      success_calls: 0,
      failed_calls: 0,
      skipped_calls: 0,
      error_rate: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      avg_duration_ms: 0,
      active_users: 0,
      unpriced_calls: 0,
    };
  }
  return {
    calls: row.calls,
    success_calls: row.success,
    failed_calls: row.failed,
    skipped_calls: row.skipped,
    error_rate: errorRate(row.failed, row.calls),
    prompt_tokens: row.prompt_tokens,
    completion_tokens: row.completion_tokens,
    total_tokens: row.total_tokens,
    cost_usd: round6(row.cost),
    avg_duration_ms: Math.round(row.duration ?? 0),
    active_users: distinctUsers(row.users),
    unpriced_calls: row.unpriced,
  };
}

/**
 * Percent change against the previous window, to one decimal. With nothing in
 * the previous window there is no baseline, so the answer is null — "up
 * infinity percent" is not a number anyone can act on.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return round1(((current - previous) / previous) * 100);
}

/**
 * Every headline figure against the previous window of the same length. The
 * error rate is already a percentage, so its change is in points (3% → 5% is
 * +2 points, not +66%); it too is null when the previous window had no calls.
 */
export function changeBetween(current: OverviewTotals, previous: OverviewTotals): OverviewChange {
  return {
    calls: percentChange(current.calls, previous.calls),
    cost_usd: percentChange(current.cost_usd, previous.cost_usd),
    total_tokens: percentChange(current.total_tokens, previous.total_tokens),
    active_users: percentChange(current.active_users, previous.active_users),
    avg_duration_ms: percentChange(current.avg_duration_ms, previous.avg_duration_ms),
    error_rate_points: previous.calls === 0 ? null : round1(current.error_rate - previous.error_rate),
  };
}

/** One day of the Dashboard's series: the AI Features day plus answered calls and active people. */
export interface OverviewDay extends DayUsage {
  success_calls: number;
  active_users: number;
}

export const emptyOverviewDay = (date: string): OverviewDay => ({
  date,
  calls: 0,
  success_calls: 0,
  failed_calls: 0,
  skipped_calls: 0,
  total_tokens: 0,
  cost_usd: 0,
  avg_duration_ms: 0,
  active_users: 0,
});

export interface OverviewCount {
  key: string;
  count: number;
}

/**
 * Tallies as `{ key, count }` in the enum's own order, every known value
 * present (a zero is an answer, an absent bar is a question), and any value the
 * enum no longer lists kept at the end rather than silently dropped.
 */
export function orderedCounts(
  tallies: readonly Tally[] | undefined,
  order: readonly string[],
): OverviewCount[] {
  const counts = new Map<string, number>();
  for (const tally of tallies ?? []) {
    const key = String(tally._id);
    counts.set(key, (counts.get(key) ?? 0) + tally.count);
  }
  const known = order.map((key) => ({ key, count: counts.get(key) ?? 0 }));
  const extra = [...counts]
    .filter(([key]) => !order.includes(key))
    .map(([key, count]) => ({ key, count }));
  return [...known, ...extra];
}

const countOf = (counts: readonly OverviewCount[], key: string) =>
  counts.find((count) => count.key === key)?.count ?? 0;

export interface ScanMix {
  risk: Tally[];
  action: Tally[];
  status: Tally[];
}

/** AI Monitoring over the window: images checked, passed to a person, blocked, and checks that failed. */
export function monitoringSummary(
  mix: ScanMix | undefined,
  riskOrder: readonly string[],
  actionOrder: readonly string[],
  statusOrder: readonly string[],
) {
  const byRisk = orderedCounts(mix?.risk, riskOrder);
  const byAction = orderedCounts(mix?.action, actionOrder);
  const byStatus = orderedCounts(mix?.status, statusOrder);
  return {
    scanned: byStatus.reduce((total, count) => total + count.count, 0),
    flagged: countOf(byAction, 'FLAGGED'),
    blocked: countOf(byAction, 'BLOCKED'),
    failed: countOf(byStatus, 'FAILED'),
    by_risk: byRisk,
  };
}

/** Run states that are still going: the flow is mid-step or waiting on a reply or a delay. */
const IN_PROGRESS = new Set(['RUNNING', 'WAITING_REPLY', 'WAITING_DELAY']);

export interface RunMix {
  status: Tally[];
  channel: Tally[];
}

/** Live automation runs started in the window, by state and by channel, and the flows switched on. */
export function automationSummary(
  mix: RunMix | undefined,
  flows: { active: number; total: number },
  statusOrder: readonly string[],
  channelOrder: readonly string[],
) {
  const byStatus = orderedCounts(mix?.status, statusOrder);
  return {
    runs: byStatus.reduce((total, count) => total + count.count, 0),
    completed: countOf(byStatus, 'COMPLETED'),
    failed: countOf(byStatus, 'FAILED'),
    in_progress: byStatus
      .filter((count) => IN_PROGRESS.has(count.key))
      .reduce((total, count) => total + count.count, 0),
    by_status: byStatus,
    by_channel: orderedCounts(mix?.channel, channelOrder),
    active_flows: flows.active,
    total_flows: flows.total,
  };
}

/** A failure reason trimmed for a one-line list; the full text is one click away in the log. */
export const ERROR_PREVIEW_CHARS = 160;
export const trimError = (message: string | null | undefined): string => {
  const text = (message ?? '').trim();
  return text.length > ERROR_PREVIEW_CHARS ? `${text.slice(0, ERROR_PREVIEW_CHARS - 1)}…` : text;
};
