import { z } from 'zod';
import type { Translate } from '../../brand-wizard/wizard-steps';

/** The longest reason the server keeps on a cancelled order. */
export const CANCEL_REASON_MAX = 500;

/** Why the brand is calling the order off — required, because the buyer is told it. */
export const makeOrderCancelSchema = (t: Translate) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('partners.orders.cancelReasonRequired'))
      .max(CANCEL_REASON_MAX, t('partners.orders.cancelReasonTooLong')),
  });

export type OrderCancelValues = z.infer<ReturnType<typeof makeOrderCancelSchema>>;

export const orderCancelDefaults: OrderCancelValues = { reason: '' };
