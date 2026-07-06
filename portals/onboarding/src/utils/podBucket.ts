export type PodBucket = 'upcoming' | 'ongoing' | 'hosted';

export interface PodTiming {
  pod_date_time: string;
  pod_end_date_time?: string | null;
}

/** Classify a pod by its schedule relative to `now`:
 * - `upcoming`  — starts in the future
 * - `ongoing`   — already started and (if it has an end) not yet ended
 * - `hosted`    — already finished / started with no end still running */
export function podBucket(pod: PodTiming, now: number = Date.now()): PodBucket {
  const start = new Date(pod.pod_date_time).getTime();
  if (start > now) return 'upcoming';
  const end = pod.pod_end_date_time ? new Date(pod.pod_end_date_time).getTime() : null;
  if (end !== null && end >= now) return 'ongoing';
  return 'hosted';
}
