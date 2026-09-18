import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import { SETTABLE_ORDER_STATUSES } from '../../../../lib/status';
import type { Translate } from '../../../../lib/translate';

/** Mirrors `storeUpdateOrderStatus(status, note)` — any status but CANCELLED, which has its own action. */
export const makeOrderStatusSchema = (t: Translate) =>
  z.object({
    status: z.enum(SETTABLE_ORDER_STATUSES),
    note: makeRules(t).optionalText(500),
  });

export type OrderStatusValues = z.infer<ReturnType<typeof makeOrderStatusSchema>>;

/** Start from the order's own status (or the first settable one when it is not settable). */
export const toOrderStatusValues = (status: string): OrderStatusValues => ({
  status: SETTABLE_ORDER_STATUSES.find((value) => value === status) ?? SETTABLE_ORDER_STATUSES[0],
  note: '',
});
