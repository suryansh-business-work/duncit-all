import {
  cancelDisabledReason,
  cancelPenaltyHeadline,
  type VenueCancelDisabledReason,
  type VenueCancelPodResult,
  type VenuePodRow,
} from './venue-pods';

/**
 * The sentences around cancelling a pod at a venue, assembled from the calling
 * surface's own translator.
 *
 * `venue-pods.ts` answers codes; this is the ONE place each code becomes a
 * sentence for mWeb and the native app. The two had each written this mapping
 * beside their own dialog, which is exactly how the same cancellation starts
 * reading differently on the two surfaces (rules 27 + 40).
 *
 * Every key is written out as a literal `t('mweb.venuePods.…')` rather than
 * built from the code, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails Shared Gates. Same shape, and the same
 * reason, as `pod-participation-copy.ts`.
 */
export type VenuePodsTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/**
 * The warning the cancel dialog opens with. Which of the three it is (no
 * number yet, no penalty at all, or the points) is `cancelPenaltyHeadline`'s
 * answer; this only puts the words to it.
 */
export function venueCancelPenaltyHeadline(
  penalty: number | null | undefined,
  t: VenuePodsTranslate,
): string {
  const headline = cancelPenaltyHeadline(penalty);
  if (headline === 'UNKNOWN') return t('mweb.venuePods.penaltyUnknown');
  if (headline === 'NONE') return t('mweb.venuePods.penaltyNone');
  // POINTS is only ever answered for a number, so nothing is lost coercing it.
  const points = Number(penalty);
  const unit = points === 1 ? t('mweb.venuePods.point') : t('mweb.venuePods.points');
  return t('mweb.venuePods.penaltyPoints', { vars: { penalty: points, unit } });
}

/** The notice after `venueCancelPod` succeeds — every number comes from the server. */
export function venueCancelSuccessMessage(
  result: VenueCancelPodResult,
  t: VenuePodsTranslate,
): string {
  const { refunded_count: count, venue_health_score: score } = result;
  const refunds =
    count === 1
      ? t('mweb.venuePods.refundedOne')
      : t('mweb.venuePods.refundedMany', { vars: { count } });
  return t('mweb.venuePods.cancelled', { vars: { refunds, score } });
}

/** One literal key per code, so the shipped-key gate sees each (rule 38). */
const DISABLED_REASON_KEY: Record<VenueCancelDisabledReason, string> = {
  ALREADY_CANCELLED: 'mweb.venuePods.alreadyCancelled',
  ALREADY_STARTED: 'mweb.venuePods.alreadyStarted',
  ALREADY_FINISHED: 'mweb.venuePods.alreadyFinished',
};

/**
 * Why the Cancel action is unavailable, as the row menu says it under the
 * disabled item — or null while the action is live.
 */
export function venueCancelDisabledText(row: VenuePodRow, t: VenuePodsTranslate): string | null {
  const reason = cancelDisabledReason(row);
  return reason ? t(DISABLED_REASON_KEY[reason]) : null;
}
