import { z } from 'zod';
import { GSTIN } from '@duncit/regex';
import { FOOD_GST_LIMITS, VENUE_FOOD_TAX_MODES, type VenueFoodTaxMode } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * GST on venue food — ONE set of rules for the three forms that set it:
 * Finance's default (Finance → Food Menu Defaults), the owner's venue form in
 * Partners and the Venues console editor. The bounds are the server's own
 * (FOOD_GST_LIMITS: a whole percent from 0 to the top GST slab), so a form
 * refuses exactly what the server would.
 *
 * The percent arrives from a text field, so it is coerced; the values a form
 * holds keep it as typed (`number | string`) and the parsed values carry the
 * number.
 */

const gstPctRule = (t: Translate) => {
  const message = t('shell.foodTax.gstPctInvalid', {
    vars: { min: FOOD_GST_LIMITS.min, max: FOOD_GST_LIMITS.max },
  });
  return z.coerce
    .number({ error: message })
    .int(message)
    .min(FOOD_GST_LIMITS.min, message)
    .max(FOOD_GST_LIMITS.max, message);
};

const taxModeRule = (t: Translate) => z.enum(VENUE_FOOD_TAX_MODES, { error: t('shell.foodTax.taxModeRequired') });

/** Finance's default for every venue that does not set its own. */
export function makeFoodTaxDefaultsSchema(t: Translate) {
  return z.object({ tax_mode: taxModeRule(t), gst_pct: gstPctRule(t) });
}

export interface FoodTaxDefaultsValues {
  tax_mode: VenueFoodTaxMode;
  gst_pct: number | string;
}

export type FoodTaxDefaultsOutput = z.infer<ReturnType<typeof makeFoodTaxDefaultsSchema>>;

/** A venue's own GST, as the venue forms hold it beside the rest of `food_ordering`. */
export interface VenueFoodTaxValues {
  tax_override: boolean;
  tax_mode: VenueFoodTaxMode | string;
  gst_pct: number | string;
}

/**
 * The venue fields' SHAPE — loose on purpose, like the rest of a venue's food
 * block: what is stored behind a switched-off override must never be what
 * stops the form from saving. `makeVenueFoodTaxRefinement` is what checks it.
 */
export const venueFoodTaxShape = {
  tax_override: z.boolean(),
  tax_mode: z.string(),
  gst_pct: z.union([z.number(), z.string()]),
};

/**
 * Checks a venue's own GST only while it overrides Finance's default, raising
 * each problem on `path` + the field — `['food_ordering']` on a venue form.
 */
export function makeVenueFoodTaxRefinement(t: Translate) {
  const rules = { tax_mode: taxModeRule(t), gst_pct: gstPctRule(t) };
  return (values: VenueFoodTaxValues, ctx: z.RefinementCtx, path: PropertyKey[] = []) => {
    if (!values.tax_override) return;
    for (const field of ['tax_mode', 'gst_pct'] as const) {
      const issue = rules[field].safeParse(values[field]).error?.issues[0];
      if (issue) ctx.addIssue({ code: 'custom', path: [...path, field], message: issue.message });
    }
  };
}

/**
 * The venue's GST number, printed on its food invoices. Optional — a venue may
 * have none — and compared upper-cased, as the server stores it.
 */
export function makeFoodGstinRule(t: Translate) {
  return z
    .string()
    .trim()
    .refine((value) => !value || GSTIN.test(value.toUpperCase()), t('shell.foodTax.gstinInvalid'));
}
