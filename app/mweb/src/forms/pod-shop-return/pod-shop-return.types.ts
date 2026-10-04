import { z } from 'zod';

/**
 * "Return items" form schema — which lines and how many, plus why.
 *
 * Each line carries its own `max` (what the server says can still go back), so
 * the quantity rule is checked here as well as by the stepper that bounds it.
 * Native twin: components/orders-history/pod-shop-return.form.ts (rule 27).
 */
export interface ReturnFormMessages {
  pickItem: string;
  qtyTooHigh: string;
  pickReason: string;
  commentsTooLong: string;
}

export const COMMENTS_MAX = 2000;

export const buildReturnSchema = (messages: ReturnFormMessages) =>
  z.object({
    lines: z
      .array(
        z.object({
          product_id: z.string(),
          variant_id: z.string(),
          name: z.string(),
          variant_label: z.string(),
          max: z.number().int(),
          qty: z.number().int().min(0),
        })
      )
      .refine((lines) => lines.some((line) => line.qty > 0), messages.pickItem)
      .refine((lines) => lines.every((line) => line.qty <= line.max), messages.qtyTooHigh),
    reason: z.string().min(1, messages.pickReason),
    comments: z.string().max(COMMENTS_MAX, messages.commentsTooLong),
  });

export type ReturnFormValues = z.infer<ReturnType<typeof buildReturnSchema>>;
export type ReturnFormLine = ReturnFormValues['lines'][number];

interface OrderForReturn {
  line_items: ReadonlyArray<{ product_id: string; variant_id?: string | null; variant_label?: string | null; name: string }>;
  returnable: ReadonlyArray<{ product_id: string; variant_id: string; returnable_qty: number }>;
}

/** One row per line that can still go back, nothing picked yet. */
export function returnFormDefaults(order: OrderForReturn): ReturnFormValues {
  const lines: ReturnFormLine[] = [];
  for (const open of order.returnable) {
    if (open.returnable_qty <= 0) continue;
    const item = order.line_items.find(
      (li) => li.product_id === open.product_id && (li.variant_id ?? '') === open.variant_id
    );
    if (!item) continue;
    lines.push({
      product_id: open.product_id,
      variant_id: open.variant_id,
      name: item.name,
      variant_label: item.variant_label ?? '',
      max: open.returnable_qty,
      qty: 0,
    });
  }
  return { lines, reason: '', comments: '' };
}

/** The mutation input: only picked lines, the reason as the buyer read it. */
export function toReturnInput(orderId: string, values: ReturnFormValues, reasonText: string) {
  return {
    order_id: orderId,
    items: values.lines
      .filter((line) => line.qty > 0)
      .map((line) => ({ product_id: line.product_id, variant_id: line.variant_id, qty: line.qty })),
    reason: reasonText,
    comments: values.comments.trim(),
  };
}
