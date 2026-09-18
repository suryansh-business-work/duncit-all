import { z } from 'zod';
import { numberText, toNumber } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { StoreReturn } from '../../queries';

/** Mirrors `StoreReturnUpdateInput`. The status list is the return's own `next_statuses`. */
export const makeReturnUpdateSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    status: z.string().min(1, t('ecommPortal.form.required')),
    note: r.optionalText(1000),
    refund_amount: r.amount(),
    refund_mode: z.enum(['ORIGINAL', 'COINS']),
    restock: z.boolean(),
  });
};

export type ReturnUpdateValues = z.infer<ReturnType<typeof makeReturnUpdateSchema>>;

export const toReturnUpdateValues = (item: StoreReturn): ReturnUpdateValues => ({
  status: item.next_statuses[0] ?? '',
  note: '',
  refund_amount: numberText(item.refund_amount),
  refund_mode: item.refund_mode,
  restock: true,
});

/** The server input — restocking only means something on the move to RECEIVED. */
export const toReturnUpdateInput = (values: ReturnUpdateValues) => ({
  status: values.status,
  note: values.note || null,
  refund_amount: toNumber(values.refund_amount),
  refund_mode: values.refund_mode,
  restock: values.status === 'RECEIVED' ? values.restock : null,
});
