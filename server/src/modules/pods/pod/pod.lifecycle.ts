/**
 * The four lifecycle buckets a pod sits in — expressed as a MONGO PREDICATE.
 *
 * `bucketForPod` (finance/breakdown.service) answers the same question for a
 * document already in memory; this answers it for a query, so a table can page
 * over one bucket without loading the rest. The two must agree, so the rule is
 * stated once here and mirrored there:
 *
 *   CANCELLED  soft-deleted
 *   COMPLETED  finance-settled OR past its end
 *   ONGOING    started, not settled and not past its end
 *   UPCOMING   everything else
 *
 * "End" is `pod_end_date_time` when the host set one, otherwise the start plus
 * POD_LIVE_TAIL_MS — the same tail the pod chat room and the host donut use,
 * which is why the constant lives here rather than a third copy of the number.
 */
export const POD_LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

export type PodLifecycle = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/** `pod_end_date_time ?? pod_date_time + tail`, as an aggregation expression.
 * A stored field could not express the fallback, hence `$expr` over `$ifNull`. */
const LIVE_END = {
  $ifNull: ['$pod_end_date_time', { $add: ['$pod_date_time', POD_LIVE_TAIL_MS] }],
};

/**
 * Mongo filter fragment for one bucket, evaluated against `now`.
 *
 * CANCELLED reads soft-deleted rows, so the caller must ALSO opt into
 * `includeDeleted` — the model's pre-find hook would otherwise pin
 * `deleted_at: null` and the two conditions would cancel each other out.
 */
export function podLifecycleFilter(bucket: PodLifecycle, now: Date): Record<string, unknown> {
  if (bucket === 'CANCELLED') return { deleted_at: { $ne: null } };
  if (bucket === 'COMPLETED') {
    return {
      deleted_at: null,
      $or: [{ completed_at: { $ne: null } }, { $expr: { $lt: [LIVE_END, now] } }],
    };
  }
  if (bucket === 'ONGOING') {
    return {
      deleted_at: null,
      completed_at: null,
      pod_date_time: { $lte: now },
      $expr: { $gte: [LIVE_END, now] },
    };
  }
  return { deleted_at: null, completed_at: null, pod_date_time: { $gt: now } };
}
