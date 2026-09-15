import { GraphQLError } from 'graphql';
import {
  GRAPHQL_MONITOR_SETTINGS_KEY,
  GraphqlMonitorSettingsModel,
  type IGraphqlMonitorSettings,
} from './graphqlMonitor.model';

/**
 * The monitor's settings, plus a synchronous copy of them.
 *
 * The plugin asks "am I on, and should this request be sampled?" on every
 * request, which cannot wait on the database. The copy is refreshed by every
 * flush (once a minute) and immediately by a save, and starts from the same
 * defaults the model writes — so a server whose settings row does not exist yet
 * already monitors.
 */

export interface GraphqlMonitorRuntime {
  enabled: boolean;
  field_sample_pct: number;
  retention_days: number;
  slow_threshold_ms: number;
}

export const runtime: GraphqlMonitorRuntime = {
  enabled: true,
  field_sample_pct: 10,
  retention_days: 14,
  slow_threshold_ms: 1000,
};

const BOUNDS = {
  field_sample_pct: { min: 0, max: 100, message: 'Resolver sampling must be between 0 and 100%.' },
  retention_days: { min: 1, max: 90, message: 'Retention must be between 1 and 90 days.' },
  slow_threshold_ms: { min: 50, max: 120_000, message: 'The slow threshold must be between 50 and 120000 ms.' },
} as const;

function intIn(value: unknown, bound: { min: number; max: number; message: string }): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < bound.min || n > bound.max) {
    throw new GraphQLError(bound.message, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return n;
}

const toPublic = (doc: IGraphqlMonitorSettings) => ({
  enabled: doc.enabled,
  field_sample_pct: doc.field_sample_pct,
  retention_days: doc.retention_days,
  slow_threshold_ms: doc.slow_threshold_ms,
  updated_at: doc.updated_at ? doc.updated_at.toISOString() : null,
});

function applyRuntime(doc: IGraphqlMonitorSettings): void {
  runtime.enabled = doc.enabled;
  runtime.field_sample_pct = doc.field_sample_pct;
  runtime.retention_days = doc.retention_days;
  runtime.slow_threshold_ms = doc.slow_threshold_ms;
}

async function settingsDoc(): Promise<IGraphqlMonitorSettings> {
  const doc = await GraphqlMonitorSettingsModel.findOneAndUpdate(
    { key: GRAPHQL_MONITOR_SETTINGS_KEY },
    { $setOnInsert: { key: GRAPHQL_MONITOR_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc as IGraphqlMonitorSettings;
}

/** Re-read the row into the synchronous copy. */
export async function refreshRuntime(): Promise<void> {
  applyRuntime(await settingsDoc());
}

export async function readSettings() {
  const doc = await settingsDoc();
  applyRuntime(doc);
  return toPublic(doc);
}

export async function updateSettings(input: Record<string, unknown>) {
  const set = {
    enabled: Boolean(input.enabled),
    field_sample_pct: intIn(input.field_sample_pct, BOUNDS.field_sample_pct),
    retention_days: intIn(input.retention_days, BOUNDS.retention_days),
    slow_threshold_ms: intIn(input.slow_threshold_ms, BOUNDS.slow_threshold_ms),
  };
  const doc = await GraphqlMonitorSettingsModel.findOneAndUpdate(
    { key: GRAPHQL_MONITOR_SETTINGS_KEY },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  applyRuntime(doc as IGraphqlMonitorSettings);
  return toPublic(doc as IGraphqlMonitorSettings);
}
