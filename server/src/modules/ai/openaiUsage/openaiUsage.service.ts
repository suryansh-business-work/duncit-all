import { GraphQLError } from 'graphql';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  OpenAiModelPriceModel,
  OpenAiUsageLogModel,
  seedModelPrices,
  type IOpenAiModelPrice,
  type IOpenAiUsageLog,
  type OpenAiCallStatus,
} from './openaiUsage.model';
import { OPENAI_TASKS, openAiModules, openAiTaskOptions, type OpenAiTaskKey } from './openaiUsage.tasks';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Long enough that a burst of calls shares one read, short enough that an edited rate lands. */
const PRICE_CACHE_MS = 60_000;

/* ------------------------------- rate card ------------------------------ */

interface Rate {
  input_per_1m: number;
  output_per_1m: number;
}

let priceCache: { at: number; rates: Map<string, Rate> } | null = null;

async function loadRates(): Promise<Map<string, Rate>> {
  const cached = priceCache;
  if (cached && Date.now() - cached.at < PRICE_CACHE_MS) return cached.rates;
  const docs = await OpenAiModelPriceModel.find().lean();
  const rates = new Map<string, Rate>(
    docs.map((d) => [d.model, { input_per_1m: d.input_per_1m, output_per_1m: d.output_per_1m }]),
  );
  priceCache = { at: Date.now(), rates };
  return rates;
}

/** Money is rounded once, here, so the stored figure is the one that gets summed. */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/* --------------------------- table allowlists --------------------------- */

const USAGE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['task_label', 'detail', 'model', 'error_message', 'request_preview', 'response_preview'],
  sortFields: {
    created_at: 'created_at',
    cost_usd: 'cost_usd',
    total_tokens: 'total_tokens',
    duration_ms: 'duration_ms',
    task: 'task',
    model: 'model',
    status: 'status',
    module: 'module',
  },
  filterFields: {
    task: { type: 'string' },
    module: { type: 'string' },
    model: { type: 'string' },
    status: { type: 'string' },
    created_at: { type: 'date' },
    cost_usd: { type: 'number' },
    total_tokens: { type: 'number' },
    duration_ms: { type: 'number' },
  },
  defaultSort: { created_at: -1 },
};

/* --------------------------------- mappers ------------------------------ */

const logPub = (d: IOpenAiUsageLog) => ({
  // toHexString, not String(): `_id` is a typed ObjectId here, and stringifying
  // an object is exactly what SonarQube S6551 exists to catch.
  id: d._id.toHexString(),
  task: d.task,
  task_label: d.task_label,
  module: d.module,
  detail: d.detail,
  model: d.model,
  status: d.status,
  http_status: d.http_status,
  prompt_tokens: d.prompt_tokens,
  completion_tokens: d.completion_tokens,
  total_tokens: d.total_tokens,
  cost_usd: d.cost_usd,
  priced: d.priced,
  duration_ms: d.duration_ms,
  request_preview: d.request_preview,
  response_preview: d.response_preview,
  error_message: d.error_message,
  user_id: d.user_id ?? null,
  created_at: d.created_at.toISOString(),
});

const pricePub = (d: IOpenAiModelPrice) => ({
  id: d._id.toHexString(),
  model: d.model,
  input_per_1m: d.input_per_1m,
  output_per_1m: d.output_per_1m,
  updated_at: d.updated_at.toISOString(),
});

/* ------------------------------ aggregation ----------------------------- */

interface SpendRow {
  _id: string;
  calls: number;
  tokens: number;
  cost: number;
  failures?: number;
  label?: string;
  module?: string;
  duration?: number;
}

const SPEND_ACCUMULATORS = {
  calls: { $sum: 1 },
  tokens: { $sum: '$total_tokens' },
  cost: { $sum: '$cost_usd' },
} as const;

async function spendBy(
  match: Record<string, unknown>,
  field: string,
): Promise<Array<{ key: string; calls: number; tokens: number; cost_usd: number }>> {
  const rows = await OpenAiUsageLogModel.aggregate<SpendRow>([
    { $match: match },
    { $group: { _id: field, ...SPEND_ACCUMULATORS } },
    { $sort: { cost: -1, calls: -1 } },
  ]);
  return rows.map((r) => ({
    key: String(r._id || '—'),
    calls: r.calls,
    tokens: r.tokens,
    cost_usd: round6(r.cost),
  }));
}

/** Per-task spend — the answer to "which feature is the bill". */
async function spendByTask(match: Record<string, unknown>) {
  const rows = await OpenAiUsageLogModel.aggregate<SpendRow>([
    { $match: match },
    {
      $group: {
        _id: '$task',
        ...SPEND_ACCUMULATORS,
        // $max, not $last: an unsorted group makes $last nondeterministic, and a
        // label that flickers between renders reads as two different tasks.
        label: { $max: '$task_label' },
        module: { $max: '$module' },
        duration: { $avg: '$duration_ms' },
        failures: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 0, 1] } },
      },
    },
    { $sort: { cost: -1, calls: -1 } },
  ]);
  return rows.map((r) => ({
    task: String(r._id),
    // The label is read off the row, not the catalogue: a task removed from the
    // catalogue still has spend, and a blank name would hide it.
    label: r.label || OPENAI_TASKS[r._id as OpenAiTaskKey]?.label || String(r._id),
    module: r.module || '—',
    calls: r.calls,
    tokens: r.tokens,
    cost_usd: round6(r.cost),
    failures: r.failures ?? 0,
    avg_duration_ms: Math.round(r.duration ?? 0),
  }));
}

async function dailySpend(since: Date) {
  const rows = await OpenAiUsageLogModel.aggregate<{ _id: string; calls: number; cost: number; tokens: number }>([
    { $match: { created_at: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        calls: { $sum: 1 },
        cost: { $sum: '$cost_usd' },
        tokens: { $sum: '$total_tokens' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, calls: r.calls, tokens: r.tokens, cost_usd: round6(r.cost) }));
}

interface TotalsRow {
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  duration: number;
  success: number;
  failed: number;
  skipped: number;
}

const statusSum = (status: OpenAiCallStatus) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });

async function totalsFor(match: Record<string, unknown>): Promise<TotalsRow> {
  const [row] = await OpenAiUsageLogModel.aggregate<TotalsRow>([
    { $match: match },
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        prompt_tokens: { $sum: '$prompt_tokens' },
        completion_tokens: { $sum: '$completion_tokens' },
        total_tokens: { $sum: '$total_tokens' },
        cost: { $sum: '$cost_usd' },
        duration: { $avg: '$duration_ms' },
        success: statusSum('SUCCESS'),
        failed: statusSum('FAILED'),
        skipped: statusSum('SKIPPED'),
      },
    },
  ]);
  return (
    row ?? {
      calls: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost: 0,
      duration: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    }
  );
}

function clampRange(input?: number | null): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(90, n);
}

/* -------------------------------- service ------------------------------- */

export interface RecordUsageInput {
  task: string;
  task_label: string;
  module: string;
  detail: string;
  model: string;
  status: OpenAiCallStatus;
  http_status: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  request_preview: string;
  response_preview: string;
  error_message: string;
  user_id?: string;
}

export const openAiUsageService = {
  async seedDefaults() {
    await seedModelPrices();
    priceCache = null;
  },

  /**
   * Write one call's row, pricing it against the rate card as it stands now.
   *
   * A model with no rate is stored at zero cost and flagged `priced: false`
   * rather than guessed at — the dashboard surfaces those models by name so the
   * gap is visible, instead of a plausible-looking total that is quietly short.
   */
  async recordUsage(input: RecordUsageInput): Promise<void> {
    const rates = await loadRates();
    const rate = rates.get(input.model);
    const cost = rate
      ? (input.prompt_tokens / 1e6) * rate.input_per_1m +
        (input.completion_tokens / 1e6) * rate.output_per_1m
      : 0;
    await OpenAiUsageLogModel.create({
      ...input,
      cost_usd: round6(cost),
      priced: !!rate,
    });
  },

  async logsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IOpenAiUsageLog>(
      OpenAiUsageLogModel,
      {},
      input,
      USAGE_TABLE_CONFIG,
    );
    return { rows: docs.map(logPub), total, page, page_size };
  },

  async log(id: string) {
    const doc = await OpenAiUsageLogModel.findById(id);
    return doc ? logPub(doc) : null;
  },

  async prices() {
    const docs = await OpenAiModelPriceModel.find().sort({ model: 1 });
    return docs.map(pricePub);
  },

  /** Upsert one model's rate. Creating a rate for a model already in the logs is the point. */
  async upsertPrice(input: { model: string; input_per_1m: number; output_per_1m: number }) {
    const model = input.model.trim();
    if (!model) {
      throw new GraphQLError('Model is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (input.input_per_1m < 0 || input.output_per_1m < 0) {
      throw new GraphQLError('Rates cannot be negative', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await OpenAiModelPriceModel.findOneAndUpdate(
      { model },
      { $set: { input_per_1m: input.input_per_1m, output_per_1m: input.output_per_1m } },
      { new: true, upsert: true },
    );
    priceCache = null;
    return pricePub(doc);
  },

  /** The catalogue the Logs page filters by — task and module options come from the server. */
  taskCatalogue() {
    return { tasks: openAiTaskOptions(), modules: openAiModules() };
  },

  async dashboard(rangeDays?: number | null) {
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const match = { created_at: { $gte: since } };
    const [totals, allTime, by_task, by_module, by_model, series, unpriced, prices] =
      await Promise.all([
        totalsFor(match),
        totalsFor({}),
        spendByTask(match),
        spendBy(match, '$module'),
        spendBy(match, '$model'),
        dailySpend(since),
        OpenAiUsageLogModel.distinct('model', { ...match, priced: false, total_tokens: { $gt: 0 } }),
        this.prices(),
      ]);
    return {
      range_days: days,
      total_calls: totals.calls,
      success_calls: totals.success,
      failed_calls: totals.failed,
      skipped_calls: totals.skipped,
      prompt_tokens: totals.prompt_tokens,
      completion_tokens: totals.completion_tokens,
      total_tokens: totals.total_tokens,
      total_cost_usd: round6(totals.cost),
      avg_duration_ms: Math.round(totals.duration),
      all_time_calls: allTime.calls,
      all_time_cost_usd: round6(allTime.cost),
      by_task,
      by_module,
      by_model,
      series,
      unpriced_models: unpriced.map(String).filter(Boolean),
      prices,
    };
  },
};
