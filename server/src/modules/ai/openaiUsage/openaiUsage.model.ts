import { Schema, model, type Types } from 'mongoose';

/**
 * Every OpenAI call the product makes, and what each one cost.
 *
 * One row per request — including the ones that failed and the ones that never
 * left because no key is configured. A provider dashboard can only show the
 * requests that reached it and only totals them by API key; the questions this
 * collection answers are "which feature is spending the money" and "why did
 * that AI action do nothing", and neither has a record anywhere else.
 *
 * Written by the single funnel in services/openai/openai.client.ts. Nothing
 * else may call OpenAI directly — an un-funnelled call is invisible here and
 * its spend silently disappears.
 *
 * This file is coverage-excluded (`*.model.ts`), so the lazy price seed lives
 * here alongside the schemas (mirrors telemetry/settings singletons).
 */

export type OpenAiCallStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

/** 180 days — the dashboard ranges top out at 90, so nothing on screen is lost. */
const RETENTION_SECONDS = 180 * 24 * 60 * 60;

/* -------------------------------- usage log ----------------------------- */

/**
 * Deliberately NOT `extends Document`: this row has a `model` field (the OpenAI
 * model), and mongoose's Document declares `model` as a method — extending would
 * force the field to be renamed to something nobody calls it.
 */
export interface IOpenAiUsageLog {
  _id: Types.ObjectId;
  /** Stable task key from the catalogue, e.g. `moderation.pod`. */
  task: string;
  /** Human label for the task, denormalised so an old row keeps its own wording. */
  task_label: string;
  /** Owning area, e.g. `Moderation` — what the dashboard groups spend by. */
  module: string;
  /** Free-form context for this one call (entity name, template key, lead id …). */
  detail: string;
  model: string;
  status: OpenAiCallStatus;
  /** HTTP status from OpenAI; 0 when the request never got a response. */
  http_status: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /**
   * USD, computed at write time from the rate card. Frozen on the row on
   * purpose: re-deriving it later would re-price historic calls at today's
   * rates and quietly rewrite what a month actually cost.
   */
  cost_usd: number;
  /** False when the model had no rate card entry — the row's cost is a floor, not a fact. */
  priced: boolean;
  duration_ms: number;
  /** Truncated prompt/response so a bad answer can be read back without storing everything. */
  request_preview: string;
  response_preview: string;
  /** Why a FAILED/SKIPPED call produced nothing. */
  error_message: string;
  user_id?: string;
  created_at: Date;
}

const openAiUsageLogSchema = new Schema<IOpenAiUsageLog>(
  {
    task: { type: String, required: true, index: true },
    task_label: { type: String, default: '' },
    module: { type: String, default: '', index: true },
    detail: { type: String, default: '' },
    model: { type: String, default: '', index: true },
    status: { type: String, required: true, index: true },
    http_status: { type: Number, default: 0 },
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 },
    cost_usd: { type: Number, default: 0 },
    priced: { type: Boolean, default: false },
    duration_ms: { type: Number, default: 0 },
    request_preview: { type: String, default: '' },
    response_preview: { type: String, default: '' },
    error_message: { type: String, default: '' },
    user_id: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

openAiUsageLogSchema.index({ created_at: -1 });
openAiUsageLogSchema.index({ created_at: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const OpenAiUsageLogModel = model<IOpenAiUsageLog>(
  'OpenAiUsageLog',
  openAiUsageLogSchema,
);

/* ------------------------------- rate card ------------------------------ */

/** Plain interface for the same reason as {@link IOpenAiUsageLog}. */
export interface IOpenAiModelPrice {
  _id: Types.ObjectId;
  model: string;
  /** USD per 1,000,000 prompt tokens. */
  input_per_1m: number;
  /** USD per 1,000,000 completion tokens. */
  output_per_1m: number;
  updated_at: Date;
  created_at: Date;
}

const openAiModelPriceSchema = new Schema<IOpenAiModelPrice>(
  {
    model: { type: String, required: true, unique: true },
    input_per_1m: { type: Number, required: true, min: 0 },
    output_per_1m: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const OpenAiModelPriceModel = model<IOpenAiModelPrice>(
  'OpenAiModelPrice',
  openAiModelPriceSchema,
);

/**
 * Published OpenAI list prices at the time this shipped, seeded once so the
 * cost column is right on day one. They are seeded, not hard-coded at the
 * point of use: OpenAI re-prices models, so the rate card is editable from the
 * AI portal and `$setOnInsert` keeps an edit from being overwritten on reboot.
 */
export const DEFAULT_MODEL_PRICES: ReadonlyArray<{
  model: string;
  input_per_1m: number;
  output_per_1m: number;
}> = [
  { model: 'gpt-4o-mini', input_per_1m: 0.15, output_per_1m: 0.6 },
  { model: 'gpt-4o', input_per_1m: 2.5, output_per_1m: 10 },
  { model: 'gpt-4.1', input_per_1m: 2, output_per_1m: 8 },
  { model: 'gpt-4.1-mini', input_per_1m: 0.4, output_per_1m: 1.6 },
  { model: 'gpt-4.1-nano', input_per_1m: 0.1, output_per_1m: 0.4 },
  { model: 'o4-mini', input_per_1m: 1.1, output_per_1m: 4.4 },
];

/** Insert any missing default rate, leaving edited rows untouched. */
export async function seedModelPrices(): Promise<void> {
  await OpenAiModelPriceModel.bulkWrite(
    DEFAULT_MODEL_PRICES.map((price) => ({
      updateOne: {
        filter: { model: price.model },
        update: { $setOnInsert: price },
        upsert: true,
      },
    })),
  );
}
