import type { StudioPod, StudioPodBucket, StudioPodSummary } from './types';

/**
 * Pure derivations behind the studio pod sections — no React, no MUI, so the
 * arithmetic exists once for both studios (rule 40).
 */

/** Rows both `venuePods` and `myClubPods` cap at, server-side. */
export const STUDIO_POD_LIST_CAP = 500;

/** Translation key per bucket, so a state chip and its count tile can never
 * word the same bucket differently. */
export const BUCKET_LABEL_KEY: Record<StudioPodBucket, string> = {
  UPCOMING: 'mweb.studioPods.bucketUpcoming',
  ONGOING: 'mweb.studioPods.bucketLive',
  COMPLETED: 'mweb.studioPods.bucketPast',
  CANCELLED: 'mweb.studioPods.bucketCancelled',
};

/** Framework-neutral intent per bucket; the renderer maps it to its palette. */
export type StudioPodTone = 'info' | 'success' | 'default' | 'error';

export const BUCKET_TONE: Record<StudioPodBucket, StudioPodTone> = {
  UPCOMING: 'info',
  ONGOING: 'success',
  COMPLETED: 'default',
  CANCELLED: 'error',
};

const EMPTY_COUNTS: Record<StudioPodBucket, number> = {
  UPCOMING: 0,
  ONGOING: 0,
  COMPLETED: 0,
  CANCELLED: 0,
};

/**
 * Client-side roll-up for a surface whose server query returns only the list
 * (Venue Studio). Club Studio receives the identical shape from
 * `myClubPodsSummary`, so both feed ONE figures component.
 *
 * Cancelled pods count in `cancelled` only: their spots were never sold, so
 * they stay out of capacity, fill and head-count — matching the server.
 */
export function summarizeStudioPods(
  pods: readonly StudioPod[],
  currencySymbol: string,
): StudioPodSummary {
  const counts = { ...EMPTY_COUNTS };
  // Venues these pods are actually spread across — the tile reads "Venues
  // booked", not every venue the owner has listed.
  const owners = new Set<string>();
  let totalSpots = 0;
  let filledSpots = 0;
  let totalAttendees = 0;
  let nextPod: string | null = null;

  for (const pod of pods) {
    owners.add(pod.owner_id);
    counts[pod.bucket] += 1;
    if (pod.bucket === 'CANCELLED') continue;
    totalSpots += pod.no_of_spots;
    filledSpots += pod.attendee_count;
    totalAttendees += pod.pod_attendees.length;
    // Server timestamps are ISO-8601 UTC, so a string compare is a time compare.
    const soonest = pod.bucket === 'UPCOMING' && (nextPod === null || pod.pod_date_time < nextPod);
    if (soonest) nextPod = pod.pod_date_time;
  }

  return {
    scope_count: owners.size,
    total: pods.length,
    upcoming: counts.UPCOMING,
    ongoing: counts.ONGOING,
    completed: counts.COMPLETED,
    cancelled: counts.CANCELLED,
    total_spots: totalSpots,
    filled_spots: filledSpots,
    total_attendees: totalAttendees,
    fill_rate: totalSpots > 0 ? filledSpots / totalSpots : 0,
    next_pod_date_time: nextPod,
    total_revenue: null,
    currency_symbol: currencySymbol,
  };
}

/** Whole-percent fill, for the meter and its caption. */
export function fillPercent(summary: Readonly<StudioPodSummary>): number {
  return Math.round(summary.fill_rate * 100);
}

/** Per-pod occupancy, 0..100, for the row meter. */
export function podFillPercent(pod: Readonly<StudioPod>): number {
  if (pod.no_of_spots <= 0) return 0;
  return Math.min(100, Math.round((pod.attendee_count / pod.no_of_spots) * 100));
}
