import { Schema, model, type InferSchemaType } from 'mongoose';
import { AGENT_CADENCES, AGENT_KEYS } from './agent.catalog';

/**
 * What a manager changed about one code-defined agent: whether it runs, when,
 * and with which params. One row per agent key, created the first time the
 * agent is saved or run; an agent with no row is the catalogue default and
 * switched off. `next_run_at` is what the orchestrator polls, recomputed on
 * every save and after every run.
 */
const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

const scheduleSchema = new Schema(
  {
    every: { type: String, enum: AGENT_CADENCES, default: 'DAY' },
    hour: { type: Number, default: 9, min: 0, max: 23 },
    weekday: { type: Number, default: 0, min: 0, max: 6 },
  },
  { _id: false }
);

const configSchema = new Schema(
  {
    key: { type: String, enum: AGENT_KEYS, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    schedule: { type: scheduleSchema, default: () => ({}) },
    /** Validated against the agent's zod schema before it is stored. */
    params: { type: Schema.Types.Mixed, default: {} },
    last_run_at: { type: Date, default: null },
    last_run_id: { type: String, default: '' },
    next_run_at: { type: Date, default: null, index: true },
    /** The manager who last saved it — also who the agent's posts and ideas are filed under when it runs on its own. */
    updated_by: { type: String, default: '' },
  },
  { timestamps, minimize: false }
);

export type MarketingAgentConfigDoc = InferSchemaType<typeof configSchema> & { _id: unknown };

export const MarketingAgentConfigModel = model('MarketingAgentConfig', configSchema, 'marketing_agent_configs');
