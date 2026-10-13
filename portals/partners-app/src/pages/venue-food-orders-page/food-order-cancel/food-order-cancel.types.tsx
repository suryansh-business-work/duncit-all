import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** The server's bounds on a cancel reason — the guest is told it. */
export const FOOD_CANCEL_REASON_MIN = 3;
export const FOOD_CANCEL_REASON_MAX = 300;

export const makeFoodOrderCancelSchema = (t: Translate) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        FOOD_CANCEL_REASON_MIN,
        t('partners.foodOrders.cancelReasonTooShort', { vars: { min: FOOD_CANCEL_REASON_MIN } }),
      )
      .max(
        FOOD_CANCEL_REASON_MAX,
        t('partners.foodOrders.cancelReasonTooLong', { vars: { max: FOOD_CANCEL_REASON_MAX } }),
      ),
  });

export type FoodOrderCancelValues = z.infer<ReturnType<typeof makeFoodOrderCancelSchema>>;

export const foodOrderCancelDefaults: FoodOrderCancelValues = { reason: '' };
