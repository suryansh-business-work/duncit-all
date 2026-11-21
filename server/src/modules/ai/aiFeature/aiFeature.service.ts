import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { auditActorName } from '@utils/audit-actor';
import { getAppTimeZone } from '@utils/app-time';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import {
  OPENAI_TASKS,
  OPENAI_TASK_KEYS,
  isOpenAiTaskKey,
  type OpenAiTaskKey,
} from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { codePromptsForTask, promptlessReason } from '@modules/ai/prompt/catalog/byTask';
import { AiFeatureSettingModel, type IAiFeatureSetting } from './aiFeature.model';
import { clearAiFeatureCache } from './aiFeature.guard';
import { dayKeys, featureAreas, featureTotals, fillDays, type DayUsage } from './aiFeature.dashboard';

/**
 * AI Features — every AI feature in the product (the `OPENAI_TASKS`
 * catalogue), its On/Off switch, and what it used and cost over a range.
 *
 * Usage is read from `OpenAiUsageLog`, which `openaiChat` already writes for
 * every call with its tokens and a cost frozen at the rate card in force — no
 * second accounting store. One aggregation per request groups the whole range
 * by task (on the `created_at` index), one read fetches every switch and one
 * reads the library bodies of the features' code prompts, so the list is three
 * queries however many features there are. Which prompts a feature runs on is
 * read from the catalogue (`catalog/byTask.ts`), never stored a second time.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** The usage log keeps 180 days; the console offers up to 90, like the dashboard. */
const MAX_RANGE_DAYS = 90;
const DEFAULT_RANGE_DAYS = 30;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The range every AI Features read uses: 30 days by default, at most 90. */
export function featureRangeDays(input?: number | null): number {
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

/** The live body of each named code prompt in the library, by key. */
async function libraryBodies(features: readonly OpenAiTaskKey[]): Promise<Map<string, string>> {
  const keys = features.flatMap((feature) => codePromptsForTask(feature).map((prompt) => prompt.key));
  if (keys.length === 0) return new Map();
  const rows = await AiPromptModel.find({ key: { $in: keys } })
    .select('key content')
    .lean<Array<{ key: string; content?: string }>>();
  return new Map(rows.map((row) => [row.key, row.content ?? '']));
}

/**
 * The code prompts a feature runs on, from the catalogue, with where each stands
 * in the library. A body that differs from the code default is either an
 * operator edit or a catalogue change the seed never writes over (it only sets
 * `content` on create), and both are worth seeing next to the feature.
 */
function featurePrompts(key: OpenAiTaskKey, library: ReadonlyMap<string, string>) {
  return codePromptsForTask(key).map((prompt) => {
    const live = library.get(prompt.key);
    return {
      key: prompt.key,
      name: prompt.name,
      role: prompt.role,
      in_library: live !== undefined,
      matches_default: live === undefined || live === prompt.content,
    };
  });
}

function featurePub(
  key: OpenAiTaskKey,
  rangeDays: number,
  usage: UsageRow | undefined,
  setting: IAiFeatureSetting | undefined,
  library: ReadonlyMap<string, string>,
) {
  const meta = OPENAI_TASKS[key];
  return {
    key,
    label: meta.label,
    module: meta.module,
    description: meta.description,
    when_off: meta.when_off,
    prompts: featurePrompts(key, library),
    prompts_note: promptlessReason(key),
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

/**
 * Calls per day over the range, in the admin's time zone, for catalogue features
 * only, so the days add up to the same totals as the feature rows.
 */
async function usageByDay(since: Date, now: Date): Promise<DayUsage[]> {
  const zone = getAppTimeZone();
  const rows = await OpenAiUsageLogModel.aggregate<DayUsage & { _id: string; duration: number }>([
    { $match: { created_at: { $gte: since }, task: { $in: OPENAI_TASK_KEYS } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: zone } },
        calls: { $sum: 1 },
        failed_calls: { $sum: statusIs('FAILED') },
        skipped_calls: { $sum: statusIs('SKIPPED') },
        total_tokens: { $sum: '$total_tokens' },
        cost_usd: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
      },
    },
  ]);
  const days = rows.map((row) => ({
    date: row._id,
    calls: row.calls,
    failed_calls: row.failed_calls,
    skipped_calls: row.skipped_calls,
    total_tokens: row.total_tokens,
    cost_usd: round6(row.cost_usd),
    avg_duration_ms: Math.round(row.duration ?? 0),
  }));
  return fillDays(dayKeys(since, now, zone), days);
}

export const aiFeatureService = {
  /** Every catalogue feature with its switch and its usage over the range. */
  async list(rangeDays?: number | null) {
    const days = featureRangeDays(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const [usage, switches, library] = await Promise.all([
      usageByTask(since),
      switchesFor(OPENAI_TASK_KEYS),
      libraryBodies(OPENAI_TASK_KEYS),
    ]);
    return OPENAI_TASK_KEYS.map((key) =>
      featurePub(key, days, usage.get(key), switches.get(key), library),
    );
  },

  /** One feature — the header of its logs page. */
  async one(rawKey: string, rangeDays?: number | null) {
    const key = assertKey(rawKey);
    const days = featureRangeDays(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const [usage, switches, library] = await Promise.all([
      usageByTask(since, key),
      switchesFor([key]),
      libraryBodies([key]),
    ]);
    return featurePub(key, days, usage.get(key), switches.get(key), library);
  },

  /**
   * The AI Features dashboard: the feature list itself, its totals and per-area
   * rollups (summed from those rows), and calls per day over the same range.
   */
  async dashboard(rangeDays?: number | null) {
    const days = featureRangeDays(rangeDays);
    const now = new Date();
    const since = new Date(now.getTime() - days * DAY_MS);
    const [features, series] = await Promise.all([this.list(days), usageByDay(since, now)]);
    return {
      range_days: days,
      ...featureTotals(features),
      by_area: featureAreas(features),
      series,
      features,
    };
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
