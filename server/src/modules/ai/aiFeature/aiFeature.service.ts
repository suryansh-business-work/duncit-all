import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { auditActorName } from '@utils/audit-actor';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import {
  OPENAI_TASKS,
  OPENAI_TASK_KEYS,
  isOpenAiTaskKey,
  type OpenAiTaskKey,
} from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { AiFeatureSettingModel, type IAiFeatureSetting } from './aiFeature.model';
import { clearAiFeatureCache } from './aiFeature.guard';

/**
 * AI Features — every AI feature in the product (the `OPENAI_TASKS`
 * catalogue), its On/Off switch, and what it used and cost over a range.
 *
 * Usage is read from `OpenAiUsageLog`, which `openaiChat` already writes for
 * every call with its tokens and a cost frozen at the rate card in force — no
 * second accounting store. One aggregation per request groups the whole range
 * by task (on the `created_at` index), and one read fetches every switch, so
 * the list is two queries however many features there are.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** The usage log keeps 180 days; the console offers up to 90, like the dashboard. */
const MAX_RANGE_DAYS = 90;
const DEFAULT_RANGE_DAYS = 30;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function clampRange(input?: number | null): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_RANGE_DAYS;
  return Math.min(MAX_RANGE_DAYS, n);
}

interface UsageRow {
  _id: string;
  calls: number;
  failures: number;
  skipped: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  duration: number;
  unpriced: number;
  last_at: Date | null;
}

const statusIs = (status: string) => ({ $cond: [{ $eq: ['$status', status] }, 1, 0] });

async function usageByTask(since: Date, key?: OpenAiTaskKey): Promise<Map<string, UsageRow>> {
  const match: Record<string, unknown> = { created_at: { $gte: since } };
  if (key) match.task = key;
  const rows = await OpenAiUsageLogModel.aggregate<UsageRow>([
    { $match: match },
    {
      $group: {
        _id: '$task',
        calls: { $sum: 1 },
        failures: { $sum: statusIs('FAILED') },
        skipped: { $sum: statusIs('SKIPPED') },
        prompt_tokens: { $sum: '$prompt_tokens' },
        completion_tokens: { $sum: '$completion_tokens' },
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
        // Tokens spent on a model with no rate: the cost shown is a floor.
        unpriced: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$priced', false] }, { $gt: ['$total_tokens', 0] }] }, 1, 0],
          },
        },
        last_at: { $max: '$created_at' },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

async function switchesFor(keys: readonly string[]): Promise<Map<string, IAiFeatureSetting>> {
  const docs = await AiFeatureSettingModel.find({ key: { $in: keys } }).lean<IAiFeatureSetting[]>();
  return new Map(docs.map((doc) => [doc.key, doc]));
}

function featurePub(
  key: OpenAiTaskKey,
  rangeDays: number,
  usage: UsageRow | undefined,
  setting: IAiFeatureSetting | undefined,
) {
  const meta = OPENAI_TASKS[key];
  return {
    key,
    label: meta.label,
    module: meta.module,
    description: meta.description,
    when_off: meta.when_off,
    enabled: setting?.enabled ?? true,
    updated_by_name: setting?.updated_by_name || null,
    updated_at: setting?.updated_at ? setting.updated_at.toISOString() : null,
    range_days: rangeDays,
    calls: usage?.calls ?? 0,
    failed_calls: usage?.failures ?? 0,
    skipped_calls: usage?.skipped ?? 0,
    prompt_tokens: usage?.prompt_tokens ?? 0,
    completion_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
    cost_usd: round6(usage?.cost ?? 0),
    avg_duration_ms: Math.round(usage?.duration ?? 0),
    unpriced_calls: usage?.unpriced ?? 0,
    last_called_at: usage?.last_at ? usage.last_at.toISOString() : null,
  };
}

function assertKey(key: string): OpenAiTaskKey {
  if (!isOpenAiTaskKey(key)) {
    throw new GraphQLError('Unknown AI feature', { extensions: { code: 'NOT_FOUND' } });
  }
  return key;
}

export const aiFeatureService = {
  /** Every catalogue feature with its switch and its usage over the range. */
  async list(rangeDays?: number | null) {
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const [usage, switches] = await Promise.all([
      usageByTask(since),
      switchesFor(OPENAI_TASK_KEYS),
    ]);
    return OPENAI_TASK_KEYS.map((key) => featurePub(key, days, usage.get(key), switches.get(key)));
  },

  /** One feature — the header of its logs page. */
  async one(rawKey: string, rangeDays?: number | null) {
    const key = assertKey(rawKey);
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const [usage, switches] = await Promise.all([usageByTask(since, key), switchesFor([key])]);
    return featurePub(key, days, usage.get(key), switches.get(key));
  },

  /**
   * Switch one feature on or off. Idempotent: saving the state a feature is
   * already in rewrites the same value and the change log records no change.
   */
  async setEnabled(rawKey: string, enabled: boolean, actorId: string) {
    const key = assertKey(rawKey);
    const actorName = await auditActorName(actorId);
    await AiFeatureSettingModel.findOneAndUpdate(
      { key },
      { $set: { enabled, updated_by_id: actorId, updated_by_name: actorName } },
      { upsert: true, new: true },
    );
    clearAiFeatureCache();
    logs.server.info('aiFeature', 'toggle', { feature: key, enabled, user_id: actorId });
    return this.one(key);
  },
};
