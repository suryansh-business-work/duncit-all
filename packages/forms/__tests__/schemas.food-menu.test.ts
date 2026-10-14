/**
 * A venue's food block — the dishes, QR ordering and the invoice GST number —
 * as the menu editor, the Partners venue form and the Venues console editor
 * all check it. Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { blankFoodOrdering, type FoodDishValues, type FoodMenuFormValues } from '@duncit/utils';

import {
  FOOD_DISH_CATEGORY_MAX,
  FOOD_DISH_DESCRIPTION_MAX,
  FOOD_DISH_NAME_MAX,
  foodMenuLimitsOf,
  makeFoodMenuSchema,
  makeVenueFoodRefinement,
  NO_FOOD_MENU_LIMITS,
  venueFoodShape,
  type FoodMenuLimits,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const issuesOf = (result: { success: boolean; error?: z.ZodError }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}=${issue.message}`);

const LIMITS: FoodMenuLimits = { food_menu_limit: 2, food_image_limit: 1, food_price_max: 500, food_discount_max_pct: 30 };

const dish = (over: Partial<FoodDishValues> = {}): FoodDishValues => ({
  item_id: '',
  name: 'Masala dosa',
  description: '',
  category: '',
  price: '120',
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const values = (over: Partial<FoodMenuFormValues> = {}): FoodMenuFormValues => ({
  offers_food: true,
  food_menu: [dish()],
  food_ordering: { ...blankFoodOrdering },
  gstin: '',
  ...over,
});

const ownerSchema = makeFoodMenuSchema(t, { limits: LIMITS, editsAccount: true });
const adminSchema = makeFoodMenuSchema(t, { limits: LIMITS, editsAccount: false });

describe('makeFoodMenuSchema', () => {
  it('takes a well-formed menu, a price in paise and a discount typed as text', () => {
    const parsed = ownerSchema.safeParse(
      values({ food_menu: [dish({ price: '99.5' })], food_ordering: { ...blankFoodOrdering, discount_pct: '30' } }),
    );
    expect(issuesOf(parsed)).toEqual([]);
  });

  it('checks nothing while the venue serves no food, not even a broken dish or GST number left behind', () => {
    const broken = values({ offers_food: false, food_menu: [dish({ name: '' })], gstin: 'not-a-gstin' });
    expect(issuesOf(ownerSchema.safeParse(broken))).toEqual([]);
  });

  it('refuses a nameless or over-long dish, and an over-long description or section', () => {
    const parsed = ownerSchema.safeParse(
      values({
        food_menu: [
          dish({ name: '  ' }),
          dish({
            name: 'x'.repeat(FOOD_DISH_NAME_MAX + 1),
            description: 'x'.repeat(FOOD_DISH_DESCRIPTION_MAX + 1),
            category: 'x'.repeat(FOOD_DISH_CATEGORY_MAX + 1),
          }),
        ],
      }),
    );
    expect(issuesOf(parsed)).toEqual([
      'food_menu.0.name=venueFoodOwner.menu.nameRequired',
      `food_menu.1.name=venueFoodOwner.menu.nameTooLong:{"max":${FOOD_DISH_NAME_MAX}}`,
      `food_menu.1.description=venueFoodOwner.menu.descriptionTooLong:{"max":${FOOD_DISH_DESCRIPTION_MAX}}`,
      `food_menu.1.category=venueFoodOwner.menu.categoryTooLong:{"max":${FOOD_DISH_CATEGORY_MAX}}`,
    ]);
  });

  it('holds the price between 1 and the config’s ceiling, and the photos to its limit', () => {
    const parsed = ownerSchema.safeParse(
      values({
        food_menu: [dish({ price: '0' }), dish({ price: '501', images: ['a.jpg', 'b.jpg'] })],
      }),
    );
    expect(issuesOf(parsed)).toEqual([
      'food_menu.0.price=venueFoodOwner.menu.priceInvalid',
      'food_menu.1.price=venueFoodOwner.menu.priceTooHigh:{"max":500}',
      'food_menu.1.images=venueFoodOwner.menu.photosLimit:{"max":1}',
    ]);
    expect(issuesOf(ownerSchema.safeParse(values({ food_menu: [dish({ price: 'free' })] })))).toEqual([
      'food_menu.0.price=venueFoodOwner.menu.priceInvalid',
    ]);
  });

  it('refuses more dishes than the menu limit', () => {
    const parsed = ownerSchema.safeParse(values({ food_menu: [dish(), dish(), dish()] }));
    expect(issuesOf(parsed)).toEqual(['food_menu=venueFoodOwner.menu.menuLimit:{"max":2}']);
  });

  it('takes a whole discount from 0 to the ceiling, and nothing else', () => {
    for (const discount_pct of ['-1', '31', '2.5', 'ten']) {
      const parsed = ownerSchema.safeParse(values({ food_ordering: { ...blankFoodOrdering, discount_pct } }));
      expect(issuesOf(parsed)).toEqual(['food_ordering.discount_pct=venueFoodOwner.menu.discountInvalid:{"max":30}']);
    }
  });

  it('checks the venue’s own GST only while it overrides Finance’s default', () => {
    const parsed = ownerSchema.safeParse(
      values({ food_ordering: { ...blankFoodOrdering, tax_override: true, tax_mode: 'HALF', gst_pct: '5' } }),
    );
    expect(issuesOf(parsed)).toEqual(['food_ordering.tax_mode=shell.foodTax.taxModeRequired']);
  });

  it('checks the GST number while food is on', () => {
    expect(issuesOf(ownerSchema.safeParse(values({ gstin: '22ABCDE1234F1Z5' })))).toEqual([]);
    expect(issuesOf(ownerSchema.safeParse(values({ gstin: 'ABC' })))).toEqual(['gstin=shell.foodTax.gstinInvalid']);
  });

  it('opens ordering on an owner surface only with a picked account and an available dish', () => {
    const on = { ...blankFoodOrdering, enabled: true };
    expect(issuesOf(ownerSchema.safeParse(values({ food_menu: [dish({ is_available: false })], food_ordering: on })))).toEqual([
      'food_ordering.razorpay_integration_id=venueFoodOwner.menu.accountRequired',
      'food_ordering.enabled=venueFoodOwner.menu.needsDish',
    ]);
    // The owner's link alone does not count where the owner picks the account.
    const linkedOnly = { ...on, razorpay_linked: true };
    expect(issuesOf(ownerSchema.safeParse(values({ food_ordering: linkedOnly })))).toEqual([
      'food_ordering.razorpay_integration_id=venueFoodOwner.menu.accountRequired',
    ]);
    expect(issuesOf(ownerSchema.safeParse(values({ food_ordering: { ...on, razorpay_integration_id: 'rzp-1' } })))).toEqual([]);
  });

  it('opens ordering in the console only on the owner’s linked account', () => {
    const on = { ...blankFoodOrdering, enabled: true };
    expect(issuesOf(adminSchema.safeParse(values({ food_ordering: on })))).toEqual([
      'food_ordering.enabled=venueFoodOwner.menu.accountMissing',
    ]);
    expect(issuesOf(adminSchema.safeParse(values({ food_ordering: { ...on, razorpay_linked: true } })))).toEqual([]);
  });
});

describe('makeVenueFoodRefinement on a bigger venue form', () => {
  it('raises its issues on the venue form’s own food paths, whatever else the form holds', () => {
    const schema = z
      .object({ venue_name: z.string(), ...venueFoodShape })
      .superRefine(makeVenueFoodRefinement(t, { limits: NO_FOOD_MENU_LIMITS, editsAccount: false }));
    const parsed = schema.safeParse({ venue_name: 'Blue Door', ...values({ food_menu: [dish({ name: '' })] }) });
    expect(issuesOf(parsed)).toEqual(['food_menu.0.name=venueFoodOwner.menu.nameRequired']);
  });
});

describe('foodMenuLimitsOf', () => {
  it('keeps only the caps of a config', () => {
    const config = { ...LIMITS, food_diets: ['VEG'], food_spice_levels: ['NONE'] };
    expect(foodMenuLimitsOf(config)).toEqual(LIMITS);
  });
});
