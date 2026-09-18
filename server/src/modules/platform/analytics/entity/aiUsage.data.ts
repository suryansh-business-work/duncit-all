import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { MediaScanLogModel } from '@modules/ai/aiMonitoring/aiMonitoring.model';
import { inRange, type AnalyticsWindow } from './window';
import { perDay, tallyOf, type PeriodDayKey, type Tally } from './aggregates';

/**
 * What the AI usage analytics page reads: the OpenAI call log (one row per
 * request, failed and skipped ones included) and the AI Monitoring image
 * checks. Ask Bot and the Agent console keep no conversation records of their
 * own, so their use is read from the calls they made.
 */

const ASK_BOT_TASK: OpenAiTaskKey = 'askbot.navigation';
const AGENT_TASK: OpenAiTaskKey = 'agent.console';

/**
 * OpenAI bills in US dollars and the platform keeps no exchange rate, so spend
 * stays in dollars — shown as US cents, because a quiet day costs less than a
 * dollar and would otherwise round to nothing.
 */
const CENTS = { $multiply: ['$cost_usd', 100] };
const ANSWERED = { $eq: ['$status', 'SUCCESS'] };
const whenTrue = (condition: object, value: number | string) => ({ $sum: { $cond: [condition, value, 0] } });

/** A blank field is one bucket, "not recorded", rather than a nameless slice. */
const named = (field: string) => ({ $cond: [{ $eq: [{ $ifNull: [field, ''] }, ''] }, 'none', field] });

export interface UsageDayRow {
  _id: PeriodDayKey;
  requests: number;
  /** Calls that came back with no answer — failed, or never sent because no key is set. */
  failed: number;
  input_tokens: number;
  output_tokens: number;
  cents: number;
  /** Summed duration of the answered calls, for their average. */
  answer_ms: number;
  ask_bot: number;
  agent: number;
}

export const loadUsageDays = (window: AnalyticsWindow) =>
  OpenAiUsageLogModel.aggregate<UsageDayRow>(
    perDay('created_at', window, {
      requests: { $sum: 1 },
      failed: whenTrue({ $ne: ['$status', 'SUCCESS'] }, 1),
      input_tokens: { $sum: '$prompt_tokens' },
      output_tokens: { $sum: '$completion_tokens' },
      cents: { $sum: CENTS },
      answer_ms: whenTrue(ANSWERED, '$duration_ms'),
      ask_bot: whenTrue({ $eq: ['$task', ASK_BOT_TASK] }, 1),
      agent: whenTrue({ $eq: ['$task', AGENT_TASK] }, 1),
    })
  );

export interface SpendRow {
  _id: string;
  cents: number;
}

export interface TaskRow {
  _id: string;
  label: string;
  module: string;
  requests: number;
  tokens: number;
  cents: number;
  failed: number;
  answer_ms: number;
}

const spendBy = (field: string) => ({ $group: { _id: named(field), cents: { $sum: CENTS } } });

/** The period's calls by area, model and outcome, and the ten tasks that cost the most. */
export async function loadUsageMix(from: Date, to: Date) {
  const [mix] = await OpenAiUsageLogModel.aggregate<{
    module: SpendRow[];
    model: SpendRow[];
    status: Tally[];
    tasks: TaskRow[];
  }>([
    { $match: { created_at: inRange(from, to) } },
    // Oldest first, so `$last` below is the task's label as the newest call wrote it.
    { $sort: { created_at: 1 } },
    {
      $facet: {
        module: [spendBy('$module')],
        model: [spendBy('$model')],
        status: [tallyOf('$status')],
        tasks: [
          {
            $group: {
              _id: '$task',
              label: { $last: '$task_label' },
              module: { $last: '$module' },
              requests: { $sum: 1 },
              tokens: { $sum: '$total_tokens' },
              cents: { $sum: CENTS },
              failed: whenTrue({ $ne: ['$status', 'SUCCESS'] }, 1),
              answer_ms: whenTrue(ANSWERED, '$duration_ms'),
            },
          },
          { $sort: { cents: -1, requests: -1, _id: 1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);
  return mix;
}

export interface ScanDayRow {
  _id: PeriodDayKey;
  scanned: number;
  /** Checks whose verdict was passed to a person, or blocked. */
  flagged: number;
}

export const loadScanDays = (window: AnalyticsWindow) =>
  MediaScanLogModel.aggregate<ScanDayRow>(
    perDay('created_at', window, {
      scanned: { $sum: 1 },
      flagged: whenTrue({ $in: ['$action', ['FLAGGED', 'BLOCKED']] }, 1),
    })
  );

/** The period's image checks by verdict, by what was done, and by the surface the upload came from. */
export async function loadScanMix(from: Date, to: Date) {
  const [mix] = await MediaScanLogModel.aggregate<{ risk: Tally[]; action: Tally[]; surface: Tally[] }>([
    { $match: { created_at: inRange(from, to) } },
    { $facet: { risk: [tallyOf('$risk')], action: [tallyOf('$action')], surface: [tallyOf(named('$surface'))] } },
  ]);
  return mix;
}
