/**
 * The four buckets a pod moves through, as the All Pods filter offers them.
 *
 * `''` is the absence of the filter (every bucket), not a fifth state — the
 * server takes `lifecycle: null` for that and derives the rest from the pod's
 * dates, so nothing here needs to know how a bucket is decided.
 */
export type PodLifecycleFilter = '' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/** Option rows for the toolbar select, in the order a pod passes through them. */
export const POD_LIFECYCLE_OPTIONS: ReadonlyArray<{
  value: PodLifecycleFilter;
  labelKey: string;
}> = [
  { value: '', labelKey: 'admin.filters.podLifecycleAll' },
  { value: 'UPCOMING', labelKey: 'admin.filters.podLifecycleUpcoming' },
  { value: 'ONGOING', labelKey: 'admin.filters.podLifecycleOngoing' },
  { value: 'COMPLETED', labelKey: 'admin.filters.podLifecycleCompleted' },
  { value: 'CANCELLED', labelKey: 'admin.filters.podLifecycleCancelled' },
];
