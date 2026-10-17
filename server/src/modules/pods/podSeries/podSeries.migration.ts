import { logs } from '@observability/log';
import { PodModel } from '../pod/pod.model';
import { PodSeriesModel } from './podSeries.model';
import { createSeriesParent } from './podSeries.parent';

/**
 * Gives every recurring pod published before "one pod, many dates" its parent.
 *
 * Those series were published as one standalone pod per date, so feeds, the
 * shop and counts showed each date as its own pod. This writes the series'
 * parent (copied from its first date, as a fresh publish does) and marks the
 * existing pods as its dates. Nothing a date holds changes — its slot, seats,
 * bookings, payments and tickets stay exactly where they are — so a date that
 * already sold tickets merges as safely as one that did not.
 *
 * Idempotent: it only looks at series that have no parent yet. Gated by the
 * deploy (RUN_POD_SERIES_PARENT_MIGRATION) like the other data migrations.
 */
export async function migrateSeriesParents(): Promise<{ merged: number; failed: number }> {
  const orphans = await PodSeriesModel.find({ parent_pod_id: null, 'pod_ids.0': { $exists: true } })
    .select('_id pod_ids club_id pod_title')
    .lean();
  let merged = 0;
  let failed = 0;
  for (const series of orphans) {
    try {
      const dates = await PodModel.find({ _id: { $in: series.pod_ids } })
        .setOptions({ includeDeleted: true })
        .select('_id')
        .sort({ pod_date_time: 1 })
        .lean();
      if (dates.length === 0) continue;
      const parentId = await createSeriesParent(
        series._id,
        dates.map((d) => d._id),
        { club_id: series.club_id, pod_title: series.pod_title }
      );
      await PodSeriesModel.updateOne({ _id: series._id }, { $set: { parent_pod_id: parentId } });
      merged += 1;
    } catch (error) {
      failed += 1;
      logs.server.error('podSeries', 'migrateSeriesParents', { series_id: String(series._id), error });
    }
  }
  return { merged, failed };
}
