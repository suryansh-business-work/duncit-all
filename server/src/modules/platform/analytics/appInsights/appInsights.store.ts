import { AppInsightDayModel, AppInsightSourceModel } from './appInsights.model';
import type { AppInsightDimension, AppInsightStore, MetricRow } from './appInsights.metrics';

/**
 * Writing a report into the history.
 *
 * A report owns some metrics over some days (a month file owns its month, an
 * Apple instance its day). Writing it first clears those metrics over those
 * days, then sets what the report says — so a slice the store has since
 * dropped does not linger, and running the same report twice leaves the
 * history exactly as running it once. Other reports' metrics on the same
 * documents are never touched.
 */

const BATCH = 500;

export interface ReplaceScope {
  store: AppInsightStore;
  dimension: AppInsightDimension;
  owns: readonly string[];
  /** Inclusive yyyy-MM-dd bounds of the days the report covers. */
  fromDay: string;
  toDay: string;
}

/** Replaces the owned metrics in the scope with `rows`. Returns how many store-days were written. */
export async function replaceMetrics(scope: ReplaceScope, rows: readonly MetricRow[]): Promise<number> {
  const unset = Object.fromEntries(scope.owns.map((metric) => [`m.${metric}`, '']));
  await AppInsightDayModel.updateMany(
    { store: scope.store, dimension: scope.dimension, day: { $gte: scope.fromDay, $lte: scope.toDay } },
    { $unset: unset }
  );
  const now = new Date();
  const ops = rows
    .filter((row) => row.dimension === scope.dimension && row.day >= scope.fromDay && row.day <= scope.toDay)
    .map((row) => {
      const set: Record<string, unknown> = { updated_at: now };
      for (const [metric, value] of Object.entries(row.metrics)) {
        if (scope.owns.includes(metric)) set[`m.${metric}`] = value;
      }
      return {
        updateOne: {
          filter: { store: scope.store, dimension: row.dimension, day: row.day, key: row.key },
          update: { $set: set },
          upsert: true,
        },
      };
    });
  for (let start = 0; start < ops.length; start += BATCH) {
    await AppInsightDayModel.bulkWrite(ops.slice(start, start + BATCH), { ordered: false });
  }
  return ops.length;
}

/** The refs of `store` already read, with the version each was read at. */
export async function readSources(store: AppInsightStore): Promise<Map<string, string>> {
  const rows = await AppInsightSourceModel.find({ store }).select('ref version').lean<Array<{ ref: string; version: string }>>();
  return new Map(rows.map((row) => [row.ref, row.version]));
}

/** Records that a source was read at `version`, so the next sync skips it until it changes. */
export async function markSource(store: AppInsightStore, ref: string, version: string): Promise<void> {
  await AppInsightSourceModel.updateOne(
    { store, ref },
    { $set: { version, read_at: new Date() } },
    { upsert: true }
  );
}
