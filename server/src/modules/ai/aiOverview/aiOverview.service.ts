import type { Types } from 'mongoose';
import { getAppTimeZone } from '@utils/app-time';
import { userDisplayMap } from '@modules/access/user/user.display';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { OPENAI_TASKS, isOpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { aiFeatureService, featureRangeDays } from '@modules/ai/aiFeature/aiFeature.service';
import { dayKeys, featureAreas, fillDays } from '@modules/ai/aiFeature/aiFeature.dashboard';
import {
  MONITORING_ACTIONS,
  MONITORING_RESULTS,
  MONITORING_STATUSES,
} from '@modules/ai/aiMonitoring/aiMonitoring.model';
import {
  AUTOMATION_CHANNELS,
  AutomationFlowModel,
  AutomationRunModel,
  RUN_STATUSES,
} from '@modules/ai/automation/automation.model';
import { loadScanMix } from '@modules/platform/analytics/entity/aiUsage.data';
import { tallyOf, type Tally } from '@modules/platform/analytics/entity/aggregates';
import {
  automationSummary,
  changeBetween,
  distinctUsers,
  emptyOverviewDay,
  errorRate,
  monitoringSummary,
  toTotals,
  trimError,
  type OverviewDay,
  type PeriodRow,
} from './aiOverview.math';

/**
 * The AI portal Dashboard — one read of everything the AI portal runs: OpenAI
 * calls, tokens, cost, speed and failures (against the previous window of the
 * same length), the models and features behind them, who used AI, the AI
 * Monitoring image checks, the automation runs and the feature switches.
 *
 * Every figure is read from the collection that already records it — the
 * OpenAI usage log, the media scan log, the automation runs — and every
 * aggregation starts with a `created_at` match so it rides that index. The
 * independent reads run in parallel. The per-feature rows are the AI Features
 * list itself, so this page and AI Features can never disagree.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** How many models, users and recent calls the page lists. */
const MODEL_LIMIT = 20;
const USER_LIMIT = 10;
const RECENT_LIMIT = 10;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const statusIs = (status: string) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });
/** Tokens spent on a model with no rate: the cost shown beside them is a floor. */
const UNPRICED = {
  $sum: { $cond: [{ $and: [{ $eq: ['$priced', false] }, { $gt: ['$total_tokens', 0] }] }, 1, 0] },
};

/** The current and the previous window in ONE pass over the index, split by `since`. */
async function periodTotals(previousSince: Date, since: Date) {
  const rows = await OpenAiUsageLogModel.aggregate<PeriodRow & { _id: 'current' | 'previous' }>([
    { $match: { created_at: { $gte: previousSince } } },
    {
      $group: {
        _id: { $cond: [{ $gte: ['$created_at', since] }, 'current', 'previous'] },
        calls: { $sum: 1 },
        success: statusIs('SUCCESS'),
        failed: statusIs('FAILED'),
        skipped: statusIs('SKIPPED'),
        prompt_tokens: { $sum: '$prompt_tokens' },
        completion_tokens: { $sum: '$completion_tokens' },
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
        unpriced: UNPRICED,
        users: { $addToSet: '$user_id' },
      },
    },
  ]);
  const current = toTotals(rows.find((row) => row._id === 'current'));
  const previous = toTotals(rows.find((row) => row._id === 'previous'));
  return { current, previous, change: changeBetween(current, previous) };
}

type DayRow = Omit<PeriodRow, 'prompt_tokens' | 'completion_tokens' | 'unpriced'> & { _id: string };

/** Every day of the window in the admin's time zone, zero-filled, with the people active that day. */
async function dailySeries(since: Date, now: Date): Promise<OverviewDay[]> {
  const zone = getAppTimeZone();
  const rows = await OpenAiUsageLogModel.aggregate<DayRow>([
    { $match: { created_at: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: zone } },
        calls: { $sum: 1 },
        success: statusIs('SUCCESS'),
        failed: statusIs('FAILED'),
        skipped: statusIs('SKIPPED'),
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
        users: { $addToSet: '$user_id' },
      },
    },
  ]);
  const days = rows.map((row) => ({
    date: row._id,
    calls: row.calls,
    success_calls: row.success,
    failed_calls: row.failed,
    skipped_calls: row.skipped,
    total_tokens: row.total_tokens,
    cost_usd: round6(row.cost),
    avg_duration_ms: Math.round(row.duration ?? 0),
    active_users: distinctUsers(row.users),
  }));
  return fillDays(dayKeys(since, now, zone), days, emptyOverviewDay);
}

interface GroupRow {
  _id: string | null;
  calls: number;
  failed: number;
  total_tokens: number;
  cost: number;
  duration: number | null;
}

/** Each model's calls, tokens, cost, failure rate and speed — the busiest first. */
async function byModel(since: Date) {
  const rows = await OpenAiUsageLogModel.aggregate<GroupRow>([
    { $match: { created_at: { $gte: since } } },
    {
      $group: {
        _id: '$model',
        calls: { $sum: 1 },
        failed: statusIs('FAILED'),
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
      },
    },
    { $sort: { calls: -1, cost: -1, _id: 1 } },
    { $limit: MODEL_LIMIT },
  ]);
  return rows.map((row) => ({
    model: row._id ?? '',
    calls: row.calls,
    failed_calls: row.failed,
    failure_rate: errorRate(row.failed, row.calls),
    total_tokens: row.total_tokens,
    cost_usd: round6(row.cost),
    avg_duration_ms: Math.round(row.duration ?? 0),
  }));
}

/**
 * The people who used AI the most, by calls, named at read time. Only the name
 * is returned — the dashboard needs who, not how to reach them.
 */
async function topUsers(since: Date) {
  const rows = await OpenAiUsageLogModel.aggregate<GroupRow>([
    { $match: { created_at: { $gte: since }, user_id: { $nin: [null, ''] } } },
    {
      $group: {
        _id: '$user_id',
        calls: { $sum: 1 },
        failed: statusIs('FAILED'),
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
      },
    },
    { $sort: { calls: -1, cost: -1, _id: 1 } },
    { $limit: USER_LIMIT },
  ]);
  const names = await userDisplayMap(rows.map((row) => String(row._id)));
  return rows.map((row) => ({
    user_id: String(row._id),
    name: names.get(String(row._id))?.name ?? '',
    calls: row.calls,
    total_tokens: row.total_tokens,
    cost_usd: round6(row.cost),
  }));
}

/** Live automation runs started in the window, by state and channel, and how many flows are on. */
async function automation(since: Date) {
  const [[mix], active, total] = await Promise.all([
    AutomationRunModel.aggregate<{ status: Tally[]; channel: Tally[] }>([
      { $match: { mode: 'LIVE', created_at: { $gte: since } } },
      { $facet: { status: [tallyOf('$status')], channel: [tallyOf('$channel')] } },
    ]),
    AutomationFlowModel.countDocuments({ status: 'ACTIVE' }),
    AutomationFlowModel.countDocuments({}),
  ]);
  return automationSummary(mix, { active, total }, RUN_STATUSES, AUTOMATION_CHANNELS);
}

interface RecentRow {
  _id: Types.ObjectId;
  task: string;
  task_label?: string;
  module?: string;
  model?: string;
  status: string;
  total_tokens?: number;
  cost_usd?: number;
  duration_ms?: number;
  error_message?: string;
  created_at: Date;
}

/** The latest calls, newest first — never the prompt or the answer, only what happened. */
async function recentCalls() {
  const rows = await OpenAiUsageLogModel.find({})
    .sort({ created_at: -1 })
    .limit(RECENT_LIMIT)
    .select('task task_label module model status total_tokens cost_usd duration_ms error_message created_at')
    .lean<RecentRow[]>();
  return rows.map((row) => ({
    id: row._id.toHexString(),
    task: row.task,
    task_label: row.task_label || (isOpenAiTaskKey(row.task) ? OPENAI_TASKS[row.task].label : row.task),
    module: row.module ?? '',
    model: row.model ?? '',
    status: row.status,
    total_tokens: row.total_tokens ?? 0,
    cost_usd: row.cost_usd ?? 0,
    duration_ms: row.duration_ms ?? 0,
    error_message: trimError(row.error_message),
    created_at: row.created_at.toISOString(),
  }));
}

export const aiOverviewService = {
  /** The whole Dashboard over the last `rangeDays` days (default 30, at most 90). */
  async dashboard(rangeDays?: number | null) {
    const days = featureRangeDays(rangeDays);
    const now = new Date();
    const since = new Date(now.getTime() - days * DAY_MS);
    const previousSince = new Date(since.getTime() - days * DAY_MS);
    const [periods, series, models, features, users, scans, runs, recent] = await Promise.all([
      periodTotals(previousSince, since),
      dailySeries(since, now),
      byModel(since),
      aiFeatureService.list(days),
      topUsers(since),
      loadScanMix(since, now),
      automation(since),
      recentCalls(),
    ]);
    const used = features.filter((feature) => feature.calls > 0);
    return {
      range_days: days,
      from: since.toISOString(),
      to: now.toISOString(),
      generated_at: now.toISOString(),
      totals: periods.current,
      previous: periods.previous,
      change: periods.change,
      series,
      by_model: models,
      // Only what was used: an idle feature is not "the cheapest", it is absent.
      by_feature: used,
      by_module: featureAreas(used),
      features_total: features.length,
      features_enabled: features.filter((feature) => feature.enabled).length,
      top_users: users,
      monitoring: monitoringSummary(scans, MONITORING_RESULTS, MONITORING_ACTIONS, MONITORING_STATUSES),
      automation: runs,
      recent,
    };
  },
};
