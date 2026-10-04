import { z } from 'zod';
import { RETURN_COMMENTS_MAX } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * The Pod Shop "Return items" form — which lines and how many, plus why. One
 * schema for mWeb and the native app (rule 27); the defaults and the mutation
 * input it pairs with are `returnFormDefaults` / `toReturnInput` in
 * `@duncit/utils`.
 *
 * Each line carries its own `max` (what the server says can still go back), so
 * the quantity rule holds here as well as in the stepper that bounds it.
 */
export const makePodShopReturnSchema = (t: Translate) =>
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
        }),
      )
      .refine((lines) => lines.some((line) => line.qty > 0), t('mweb.podShopReturns.errorPickItem'))
      .refine((lines) => lines.every((line) => line.qty <= line.max), t('mweb.podShopReturns.errorQtyTooHigh')),
    reason: z.string().min(1, t('mweb.podShopReturns.errorPickReason')),
    comments: z.string().max(RETURN_COMMENTS_MAX, t('mweb.podShopReturns.errorCommentsTooLong')),
  });

export type PodShopReturnFormValues = z.infer<ReturnType<typeof makePodShopReturnSchema>>;
