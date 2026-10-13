import { z } from 'zod';
import { PHONE_NUMBER } from '@duncit/regex';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * What a guest gives to order food at a venue — one schema for mWeb's cart
 * sheet and the native one (rule 27). The limits are the server's own
 * (FOOD_ORDER_LIMITS), so the form refuses exactly what the server would; the
 * mobile is the 10-digit pattern from @duncit/regex.
 */
export function makeFoodCheckoutSchema(t: Translate) {
  const max = (limit: number) => ({ vars: { max: String(limit) } });
  return z.object({
    name: z
      .string()
      .trim()
      .min(FOOD_ORDER_LIMITS.nameMin, t('mweb.venueFood.checkout.nameRequired'))
      .max(FOOD_ORDER_LIMITS.nameMax, t('mweb.venueFood.checkout.nameTooLong', max(FOOD_ORDER_LIMITS.nameMax))),
    phone: z.string().trim().regex(PHONE_NUMBER, t('mweb.venueFood.checkout.phoneInvalid')),
    table: z
      .string()
      .trim()
      .max(FOOD_ORDER_LIMITS.tableMax, t('mweb.venueFood.checkout.tableTooLong', max(FOOD_ORDER_LIMITS.tableMax))),
    note: z
      .string()
      .trim()
      .max(FOOD_ORDER_LIMITS.noteMax, t('mweb.venueFood.checkout.noteTooLong', max(FOOD_ORDER_LIMITS.noteMax))),
  });
}

export type FoodCheckoutValues = z.infer<ReturnType<typeof makeFoodCheckoutSchema>>;

export const foodCheckoutDefaults: FoodCheckoutValues = { name: '', phone: '', table: '', note: '' };
