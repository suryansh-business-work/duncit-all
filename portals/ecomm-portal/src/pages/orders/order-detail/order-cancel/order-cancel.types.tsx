import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';

/** Mirrors `storeAdminCancelOrder(reason, refund_mode)`; the server keeps 500 characters of reason. */
export const makeOrderCancelSchema = (t: Translate) =>
  z.object({
    reason: makeRules(t).requiredText(500),
    refund_mode: z.enum(['ORIGINAL', 'COINS']),
  });

export type OrderCancelValues = z.infer<ReturnType<typeof makeOrderCancelSchema>>;

export const ORDER_CANCEL_DEFAULTS: OrderCancelValues = { reason: '', refund_mode: 'ORIGINAL' };
