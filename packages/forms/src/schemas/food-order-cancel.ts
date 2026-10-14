import { z } from 'zod';

import type { Translate } from './translate';

/** The server's bounds on a food order's cancel reason — the guest is told it. */
export const FOOD_CANCEL_REASON_MIN = 3;
export const FOOD_CANCEL_REASON_MAX = 300;

/**
 * Calling a paid food order off with a full refund: the one thing the owner
 * gives is the reason the guest is told. One rule for the MUI dialog
 * (@duncit/venue-food — Partners, Venues console, mWeb) and the native sheet.
 */
export function makeFoodOrderCancelSchema(t: Translate) {
  return z.object({
    reason: z
      .string()
      .trim()
      .min(
        FOOD_CANCEL_REASON_MIN,
        t('venueFoodOwner.orders.cancelReasonTooShort', { vars: { min: FOOD_CANCEL_REASON_MIN } }),
      )
      .max(
        FOOD_CANCEL_REASON_MAX,
        t('venueFoodOwner.orders.cancelReasonTooLong', { vars: { max: FOOD_CANCEL_REASON_MAX } }),
      ),
  });
}

export type FoodOrderCancelValues = z.infer<ReturnType<typeof makeFoodOrderCancelSchema>>;

export const foodOrderCancelDefaults: FoodOrderCancelValues = { reason: '' };
