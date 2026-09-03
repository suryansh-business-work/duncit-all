import { z } from 'zod';
import type { Translate } from '../../../i18n/fallback';

/** The shortest reason the cancellation email can carry. */
const REASON_MIN = 5;

/**
 * The one thing a venue owner has to give before a pod is cancelled: a reason,
 * which goes into the email every attendee and the host receive. Built from
 * the reader's `t` so the refusal follows their language (rule 38).
 */
export const makeCancelPodSchema = (t: Translate) =>
  z.object({
    reason: z.string().trim().min(REASON_MIN, t('mweb.venuePods.reasonRequired')),
  });

export type CancelPodValues = z.infer<ReturnType<typeof makeCancelPodSchema>>;

export const cancelPodDefaults: CancelPodValues = { reason: '' };
