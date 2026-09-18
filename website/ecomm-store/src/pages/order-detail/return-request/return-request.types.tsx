import { z } from 'zod';

import { optionalRule, requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

/** Which units go back (each capped at what is still returnable), why, and any note. */
export const makeReturnRequestSchema = (t: Translate) =>
  z.object({
    items: z
      .array(z.object({ product_id: z.string(), variant_id: z.string(), qty: z.number().int().min(0), max: z.number().int() }))
      .refine((items) => items.some((i) => i.qty > 0), t('ecommStore.returns.pickItem'))
      .refine((items) => items.every((i) => i.qty <= i.max), t('ecommStore.returns.tooMany')),
    reason: requiredRule(t, 'ecommStore.returns.reasonRequired', 200),
    comments: optionalRule(t, 1000),
  });

export type ReturnRequestValues = z.infer<ReturnType<typeof makeReturnRequestSchema>>;
