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

/**
 * COMPLETED as an AGGREGATION EXPRESSION — the same rule as
 * `podLifecycleFilter('COMPLETED')`, for a `$group` that counts completed pods
 * beside other buckets in one pass (a `$match` could only keep one bucket).
 * Callers run it over non-deleted pods (the model's aggregate hook drops the
 * rest), so the soft-delete half of the rule is already applied.
 */
export function podCompletedExpr(now: Date): Record<string, unknown> {
  return { $or: [{ $ne: [{ $ifNull: ['$completed_at', null] }, null] }, { $lt: [LIVE_END, now] }] };
}

/** UPCOMING as an aggregation expression — the twin of `podLifecycleFilter('UPCOMING')`. */
export function podUpcomingExpr(now: Date): Record<string, unknown> {
  return { $and: [{ $eq: [{ $ifNull: ['$completed_at', null] }, null] }, { $gt: ['$pod_date_time', now] }] };
}

/**
 * Pods whose END falls inside a window — the QUERY twin of {@link podLiveEnd}.
 *
 * A sweep that has to find "pods that finished about N hours ago" cannot state
 * the fallback as `{ pod_end_date_time: null, pod_date_time: window }`: that
 * treats an end-less pod as finishing when it STARTS, while every other reader
 * of the same pod — `podLiveEnd`, `attendanceLock`, the deadline the
 * complete-pod reminder prints — treats it as finishing POD_LIVE_TAIL_MS later.
 * The two disagreed by four hours, so the nudge and the four feedback asks went
 * out while a pod with no recorded end was arguably still running, quoting a
 * deadline computed off the other end.
 *
 * `pod_date_time` rides along as a plain range because the pod's end is never
 * before its start, so it narrows the scan the `$expr` would otherwise do
 * without changing which rows match.
 */
export function liveEndWithin(range: { $gte: Date; $lte: Date }) {
  return {
    pod_date_time: { $lte: range.$lte },
    $expr: { $and: [{ $gte: [LIVE_END, range.$gte] }, { $lte: [LIVE_END, range.$lte] }] },
  };
}

/**
 * When a pod is OVER, for a document already in memory.
 *
 * The in-memory twin of the `LIVE_END` expression above — same rule, same
 * fallback — so a caller holding a pod does not have to restate the tail. Null
 * when the pod carries no usable start, which means "cannot be placed on a
 * clock" rather than "already ended": every deadline derived from this must
 * treat null as no deadline at all.
 */
export function podLiveEnd(pod: {
  pod_date_time?: Date | string | null;
  pod_end_date_time?: Date | string | null;
}): Date | null {
  const start = pod?.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  if (Number.isNaN(start)) return null;
  const end = pod?.pod_end_date_time ? new Date(pod.pod_end_date_time).getTime() : Number.NaN;
  return new Date(Number.isNaN(end) ? start + POD_LIVE_TAIL_MS : end);
}

/**
 * Whether a pod's booking window has closed: it is past its end ({@link podLiveEnd}),
 * or Finance already settled it. A pod that has started but not ended can still
 * be joined (the app asks the member to confirm first), so this is the rule
 * `joinFree` and checkout refuse on. It is the server side of the client's
 * `podPhase(...) === 'PREVIOUS'`.
 *
 * A pod with no usable start never closes here, the same "cannot be placed on
 * a clock" reading `podLiveEnd` gives it.
 */
export function podBookingClosed(
  pod: {
    pod_date_time?: Date | string | null;
    pod_end_date_time?: Date | string | null;
    completed_at?: Date | null;
  },
  now: number = Date.now(),
): boolean {
  if (pod.completed_at) return true;
  const end = podLiveEnd(pod);
  return !!end && end.getTime() < now;
}
