import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { FoodLimits, RegisterVenueValues } from './register-venue.types';

/** The server's fixed lengths for one dish; every other cap comes from the config. */
const FOOD_NAME_MAX = 80;
const FOOD_DESCRIPTION_MAX = 500;
const FOOD_CATEGORY_MAX = 40;

/** Loose on purpose: the food block is only CHECKED while the venue offers
 * food (see makeFoodRefinement). A menu kept behind a switched-off toggle is
 * not sent, so it must never be what stops the section from saving. */
export const foodMenuShape = z.array(
  z.object({
    item_id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.union([z.number(), z.string()]),
    images: z.array(z.string()),
    diet: z.string(),
    spice_level: z.string(),
    is_available: z.boolean(),
  }),
);

export const foodOrderingShape = z.object({
  enabled: z.boolean(),
  razorpay_integration_id: z.string(),
  discount_pct: z.union([z.number(), z.string()]),
});

const foodItemRules = (t: Translate, limits: FoodLimits) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('partners.registerVenuePage.foodNameRequired'))
      .max(FOOD_NAME_MAX, t('partners.registerVenuePage.foodNameTooLong', { vars: { max: FOOD_NAME_MAX } })),
    description: z
      .string()
      .trim()
      .max(
        FOOD_DESCRIPTION_MAX,
        t('partners.registerVenuePage.foodDescriptionTooLong', { vars: { max: FOOD_DESCRIPTION_MAX } }),
      ),
    category: z
      .string()
      .trim()
      .max(FOOD_CATEGORY_MAX, t('partners.registerVenuePage.foodCategoryTooLong', { vars: { max: FOOD_CATEGORY_MAX } })),
    price: z.coerce
      .number({ error: t('partners.registerVenuePage.foodPriceInvalid') })
      .min(1, t('partners.registerVenuePage.foodPriceInvalid'))
      .max(
        limits.food_price_max,
        t('partners.registerVenuePage.foodPriceTooHigh', { vars: { max: limits.food_price_max } }),
      ),
    images: z
      .array(z.string())
      .max(
        limits.food_image_limit,
        t('partners.registerVenuePage.foodPhotosLimit', { vars: { max: limits.food_image_limit } }),
      ),
  });

const discountRule = (t: Translate, limits: FoodLimits) => {
  const message = t('partners.registerVenuePage.foodDiscountInvalid', { vars: { max: limits.food_discount_max_pct } });
  return z.coerce.number({ error: message }).int(message).min(0, message).max(limits.food_discount_max_pct, message);
};

type FoodValues = Pick<RegisterVenueValues, 'offers_food' | 'food_menu' | 'food_ordering'>;

/** Re-raises a nested check's issues on the form, under `prefix`. */
const relay = (
  result: { success: boolean; error?: z.ZodError },
  prefix: PropertyKey[],
  ctx: z.RefinementCtx,
) => {
  for (const issue of result.error?.issues ?? []) {
    ctx.addIssue({ code: 'custom', path: [...prefix, ...issue.path], message: issue.message });
  }
};

/** Ordering can only be on with an account to pay into and something to order —
 * the same gate the server applies (it also checks the account is connected). */
const addOrderingIssues = (values: FoodValues, ctx: z.RefinementCtx, t: Translate) => {
  if (!values.food_ordering.enabled) return;
  if (!values.food_ordering.razorpay_integration_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_ordering', 'razorpay_integration_id'],
      message: t('partners.registerVenuePage.foodOrderingAccountRequired'),
    });
  }
  if (!values.food_menu.some((row) => row.is_available)) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_ordering', 'enabled'],
      message: t('partners.registerVenuePage.foodOrderingNeedsDish'),
    });
  }
};

/** The food block's rules, for the form schema's superRefine. Nothing is
 * checked while "offers food" is off. */
export const makeFoodRefinement = (t: Translate, limits: FoodLimits) => {
  const itemRules = foodItemRules(t, limits);
  const discount = discountRule(t, limits);
  return (values: FoodValues, ctx: z.RefinementCtx) => {
    if (!values.offers_food) return;
    if (values.food_menu.length > limits.food_menu_limit) {
      ctx.addIssue({
        code: 'custom',
        path: ['food_menu'],
        message: t('partners.registerVenuePage.foodMenuLimit', { vars: { max: limits.food_menu_limit } }),
      });
    }
    values.food_menu.forEach((row, index) => relay(itemRules.safeParse(row), ['food_menu', index], ctx));
    relay(discount.safeParse(values.food_ordering.discount_pct), ['food_ordering', 'discount_pct'], ctx);
    addOrderingIssues(values, ctx, t);
  };
};
