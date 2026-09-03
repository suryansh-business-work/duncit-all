/**
 * The rules a venue owner's pod list runs on.
 *
 * Whether a pod can still be cancelled, why it cannot, and which tab a row
 * belongs to are decisions the Partners console, mWeb and the native app all
 * make over the same `venuePods` row. The console draws them in MUI and the
 * app in Tamagui, but the RULE is one and lives here so the three surfaces
 * cannot disagree (rules 27 + 40).
 *
 * No user-facing word lives in this module: every answer is a code the caller
 * maps to its own translated sentence.
 */

/** Where a pod sits in its life, as the server buckets it. */
export type VenuePodBucket = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/** The fields these rules read off a `venuePods` row. Callers pass their fuller row. */
export interface VenuePodRow {
  bucket: VenuePodBucket;
  cancelled_at?: string | null;
}

/** What `venueCancelPod` answers with — every number comes from the server. */
export interface VenueCancelPodResult {
  pod_id: string;
  health_penalty: number;
  venue_health_score: number;
  refunded_count: number;
}

/** Why the Cancel action is unavailable. */
export type VenueCancelDisabledReason = 'ALREADY_CANCELLED' | 'ALREADY_STARTED' | 'ALREADY_FINISHED';

/** A venue owner may only pull the plug before the pod starts. */
export const canCancelVenuePod = (row: VenuePodRow): boolean =>
  row.bucket === 'UPCOMING' && !row.cancelled_at;

/**
 * Why the Cancel action is unavailable, or null when it is available.
 *
 * A pod with `cancelled_at` set is already cancelled whatever its bucket says
 * — the bucket is computed from the clock, the timestamp from the fact.
 */
export function cancelDisabledReason(row: VenuePodRow): VenueCancelDisabledReason | null {
  if (canCancelVenuePod(row)) return null;
  if (row.cancelled_at || row.bucket === 'CANCELLED') return 'ALREADY_CANCELLED';
  if (row.bucket === 'ONGOING') return 'ALREADY_STARTED';
  return 'ALREADY_FINISHED';
}

/**
 * Which warning the cancel dialog opens with.
 *
 * The penalty is admin-configured server data. Until it lands the headline is
 * written without a number rather than with a guessed one, and when an admin
 * has set it to 0 the platform charges nothing, so promising a penalty of
 * "0 points" would be a lie.
 */
export type CancelPenaltyHeadline = 'UNKNOWN' | 'NONE' | 'POINTS';

export function cancelPenaltyHeadline(penalty: number | null | undefined): CancelPenaltyHeadline {
  if (penalty == null) return 'UNKNOWN';
  if (penalty === 0) return 'NONE';
  return 'POINTS';
}

/** Tab keys — Upcoming includes pods that are live right now. */
export type VenuePodTab = 'ALL' | 'UPCOMING' | 'CANCELLED' | 'COMPLETED';

export const TAB_ORDER: readonly VenuePodTab[] = ['ALL', 'UPCOMING', 'CANCELLED', 'COMPLETED'];

export function matchesTab(row: VenuePodRow, tab: VenuePodTab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'UPCOMING') return row.bucket === 'UPCOMING' || row.bucket === 'ONGOING';
  return row.bucket === tab;
}

/** How many rows each tab holds — the number beside its label. */
export const tabCounts = (rows: readonly VenuePodRow[]): Record<VenuePodTab, number> =>
  Object.fromEntries(
    TAB_ORDER.map((tab) => [tab, rows.filter((row) => matchesTab(row, tab)).length])
  ) as Record<VenuePodTab, number>;
