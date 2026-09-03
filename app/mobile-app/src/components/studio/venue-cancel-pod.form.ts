import { z } from 'zod';
import {
  cancelDisabledReason,
  cancelPenaltyHeadline,
  type VenueCancelDisabledReason,
  type VenueCancelPodResult,
  type VenuePodRow,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** The reason a venue owner gives for pulling a pod — it goes into the
 * cancellation email sent to the host and everyone booked in. */
export const makeVenueCancelPodSchema = (t: Translate) =>
  z.object({
    reason: z.string().trim().min(5, t('mweb.venuePods.reasonRequired')),
  });

export type VenueCancelPodValues = z.infer<ReturnType<typeof makeVenueCancelPodSchema>>;

export const venueCancelPodDefaults: VenueCancelPodValues = { reason: '' };

/**
 * The warning headline. Which of the three it is (no number yet, no penalty
 * at all, or the points) is the shared rule in @duncit/utils; the words are
 * the app's own keys (rules 27 + 40).
 */
export function penaltyHeadline(penalty: number | null, t: Translate): string {
  const headline = cancelPenaltyHeadline(penalty);
  if (headline === 'UNKNOWN') return t('mweb.venuePods.penaltyUnknown');
  if (headline === 'NONE') return t('mweb.venuePods.penaltyNone');
  const unit = penalty === 1 ? t('mweb.venuePods.point') : t('mweb.venuePods.points');
  return t('mweb.venuePods.penaltyPoints', { vars: { penalty: penalty ?? 0, unit } });
}

/** The success notice — every number comes from the server. */
export function cancelSuccessMessage(result: VenueCancelPodResult, t: Translate): string {
  const refunds =
    result.refunded_count === 1
      ? t('mweb.venuePods.refundedOne')
      : t('mweb.venuePods.refundedMany', { vars: { count: result.refunded_count } });
  return t('mweb.venuePods.cancelled', { vars: { refunds, score: result.venue_health_score } });
}

/** Literal keys, one per code, so the shipped-key gate sees each (rule 38). */
const DISABLED_REASON_KEYS: Record<VenueCancelDisabledReason, string> = {
  ALREADY_CANCELLED: 'mweb.venuePods.alreadyCancelled',
  ALREADY_STARTED: 'mweb.venuePods.alreadyStarted',
  ALREADY_FINISHED: 'mweb.venuePods.alreadyFinished',
};

/** Why the Cancel action is unavailable, or null when it is available. */
export function cancelDisabledText(row: VenuePodRow, t: Translate): string | null {
  const reason = cancelDisabledReason(row);
  return reason ? t(DISABLED_REASON_KEYS[reason]) : null;
}
