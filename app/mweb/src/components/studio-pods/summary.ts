import { formatMoney } from '@duncit/utils';
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
/**
 * Blank figures while the query is in flight.
 *
 * The roll-up itself is gone: it lived here AND in the native app AND on the
 * server for clubs — three versions of one set of rules. Worse, the client
 * copies folded the CAPPED list, so a venue past 500 pods reported a total of
 * 500 under a caption promising the figures counted them all. Both studios now
 * read the server figure, computed over every pod in scope.
 */
export const EMPTY_STUDIO_SUMMARY: StudioPodSummary = {
  scope_count: 0,
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  total_spots: 0,
  filled_spots: 0,
  total_attendees: 0,
  fill_rate: 0,
  next_pod_date_time: null,
  total_revenue: 0,
  currency_symbol: '',
};

/** Whole-percent fill, for the meter and its caption. */
export function fillPercent(summary: Readonly<StudioPodSummary>): number {
  return Math.round(summary.fill_rate * 100);
}

/** Per-pod occupancy, 0..100, for the row meter. */
export function podFillPercent(pod: Readonly<StudioPod>): number {
  if (pod.no_of_spots <= 0) return 0;
  return Math.min(100, Math.round((pod.attendee_count / pod.no_of_spots) * 100));
}

/**
 * What a seat costs, as the row and the detail sheet both word it: a FREE pod
 * reads as free, never as a zero price — native already did this (rule 27).
 * `freeLabel` arrives translated; this module holds no copy.
 */
export function podPriceLabel(
  pod: Readonly<Pick<StudioPod, 'pod_type' | 'pod_amount'>>,
  currencySymbol: string,
  freeLabel: string
): string {
  if (pod.pod_type === 'FREE') return freeLabel;
  return formatMoney(pod.pod_amount, { symbol: currencySymbol });
}
