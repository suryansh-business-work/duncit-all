import type { z } from 'zod';
import { makeFoodGstinRule, makeVenueFoodRefinement, venueFoodShape } from '@duncit/forms/schemas';
import type { Translate } from '@duncit/shell';
import type { FoodLimits, RegisterVenueValues } from './register-venue.types';

/** The food block's shapes — the shared ones every venue form uses. */
export const {
  food_menu: foodMenuShape,
  food_ordering: foodOrderingShape,
  food_licences: foodLicencesShape,
  food_tables: foodTablesShape,
} = venueFoodShape;

type FoodValues = Pick<
  RegisterVenueValues,
  'offers_food' | 'food_menu' | 'food_ordering' | 'food_licences' | 'food_tables' | 'food_gstin'
>;

/**
 * The food block's rules, for the form schema's superRefine: the shared ones
 * (the owner picks the Razorpay account here), plus the GST number an approved
 * venue may give from this section. Nothing is checked while "offers food" is off.
 */
export const makeFoodRefinement = (t: Translate, limits: FoodLimits) => {
  const checkFood = makeVenueFoodRefinement(t, { limits, editsAccount: true });
  const gstin = makeFoodGstinRule(t);
  return (values: FoodValues, ctx: z.RefinementCtx) => {
    checkFood(values, ctx);
    if (!values.offers_food) return;
    for (const issue of gstin.safeParse(values.food_gstin).error?.issues ?? []) {
      ctx.addIssue({ code: 'custom', path: ['food_gstin', ...issue.path], message: issue.message });
    }
  };
};
