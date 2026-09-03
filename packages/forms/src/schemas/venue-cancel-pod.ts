import { z } from 'zod';

import type { Translate } from './translate';

/** The shortest reason the cancellation email can carry. */
const REASON_MIN = 5;

/**
 * The one thing a venue owner has to give before a pod at their venue is
 * cancelled: a reason, which goes into the email every attendee and the host
 * receive. mWeb and the native app each held this rule beside their own dialog
 * (rules 27 + 40); the refusal is the `mweb.venuePods.*` key both ship (rule 38).
 */
export function makeVenueCancelPodSchema(t: Translate) {
  return z.object({
    reason: z.string().trim().min(REASON_MIN, t('mweb.venuePods.reasonRequired')),
  });
}

export type VenueCancelPodValues = z.infer<ReturnType<typeof makeVenueCancelPodSchema>>;

export const venueCancelPodDefaults: VenueCancelPodValues = { reason: '' };
