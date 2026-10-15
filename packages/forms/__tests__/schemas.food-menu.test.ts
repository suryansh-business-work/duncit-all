/**
 * A venue's food block — the dishes, QR ordering and the invoice GST number —
 * as the menu editor, the Partners venue form and the Venues console editor
 * all check it. Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { blankFoodLicences, blankFoodOrdering, FOOD_ORDER_LIMITS, type FoodDishValues, type FoodMenuFormValues } from '@duncit/utils';

import {
  FOOD_DISH_CATEGORY_MAX,
  FOOD_DISH_DESCRIPTION_MAX,
  FOOD_DISH_NAME_MAX,
  FOOD_LIQUOR_LICENCE_MAX,
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

const LIMITS: FoodMenuLimits = {
  food_menu_limit: 2,
  food_image_limit: 1,
  food_price_max: 500,
  food_discount_max_pct: 30,
  food_video_limit: 1,
  food_table_limit: 3,
};

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
  videos: [],
  original_price: '',
  saving_display: 'PERCENT',
  ...over,
});

const values = (over: Partial<FoodMenuFormValues> = {}): FoodMenuFormValues => ({
  offers_food: true,
  food_menu: [dish()],
  food_ordering: { ...blankFoodOrdering },
  food_licences: { ...blankFoodLicences },
  food_tables: '',
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

describe('a dish’s videos', () => {
  const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';

  it('takes a YouTube link or an uploaded clip’s http(s) address', () => {
    for (const video of [YOUTUBE, 'https://ik.imagekit.io/duncit/venues/clip.mp4', 'http://cdn.example.test/clip.mp4']) {
      expect(issuesOf(ownerSchema.safeParse(values({ food_menu: [dish({ videos: [video] })] })))).toEqual([]);
    }
  });

  it('refuses anything that is neither', () => {
    for (const video of ['clip.mp4', 'ftp://example.test/clip.mp4', 'youtube.com/watch?v=dQw4w9WgXcQ', '']) {
      expect(issuesOf(ownerSchema.safeParse(values({ food_menu: [dish({ videos: [video] })] })))).toEqual([
        'food_menu.0.videos.0=venueFoodOwner.videos.invalid',
      ]);
    }
  });

  it('holds a dish to the config’s video limit', () => {
    const parsed = ownerSchema.safeParse(values({ food_menu: [dish({ videos: [YOUTUBE, YOUTUBE] })] }));
    expect(issuesOf(parsed)).toEqual(['food_menu.0.videos=venueFoodOwner.videos.limit:{"max":1}']);
  });
});

describe('a dish’s struck-through original price', () => {
  const issuesFor = (original_price: number | string, price: number | string = '120') =>
    issuesOf(ownerSchema.safeParse(values({ food_menu: [dish({ price, original_price })] })));

  it('is optional: blank or 0 strikes nothing and checks nothing', () => {
    for (const original_price of ['', '  ', 0, '0']) expect(issuesFor(original_price)).toEqual([]);
  });

  it('takes a number above the price, typed or stored', () => {
    expect(issuesFor('150')).toEqual([]);
    expect(issuesFor(120.5)).toEqual([]);
  });

  it('refuses one at or below the price, or one that is not a number', () => {
    for (const original_price of ['120', '100', 'abc', '-5']) {
      expect(issuesFor(original_price)).toEqual(['food_menu.0.original_price=venueFoodOwner.menu.originalPriceInvalid']);
    }
  });

  it('is checked on every dish, under that dish’s own path', () => {
    const parsed = ownerSchema.safeParse(
      values({ food_menu: [dish({ original_price: '200' }), dish({ original_price: '90' })] }),
    );
    expect(issuesOf(parsed)).toEqual(['food_menu.1.original_price=venueFoodOwner.menu.originalPriceInvalid']);
  });
});

describe('the food licences', () => {
  const issuesFor = (over: Partial<FoodMenuFormValues['food_licences']>) =>
    issuesOf(ownerSchema.safeParse(values({ food_licences: { ...blankFoodLicences, ...over } })));

  it('takes no licences at all, or a 14-digit FSSAI number (padding trimmed)', () => {
    expect(issuesFor({})).toEqual([]);
    expect(issuesFor({ fssai_number: '12345678901234' })).toEqual([]);
    expect(issuesFor({ fssai_number: ' 12345678901234 ' })).toEqual([]);
  });

  it('refuses an FSSAI number that is not 14 digits', () => {
    for (const fssai_number of ['1234567890123', '123456789012345', '1234567890123A']) {
      expect(issuesFor({ fssai_number })).toEqual(['food_licences.fssai_number=venueFoodOwner.licences.fssaiInvalid']);
    }
  });

  it('holds the liquor licence number to its length, and only that', () => {
    expect(issuesFor({ liquor_licence_number: 'x'.repeat(FOOD_LIQUOR_LICENCE_MAX) })).toEqual([]);
    expect(issuesFor({ liquor_licence_number: ` ${'x'.repeat(FOOD_LIQUOR_LICENCE_MAX)} ` })).toEqual([]);
    expect(issuesFor({ liquor_licence_number: 'x'.repeat(FOOD_LIQUOR_LICENCE_MAX + 1) })).toEqual([
      `food_licences.liquor_licence_number=venueFoodOwner.licences.liquorTooLong:{"max":${FOOD_LIQUOR_LICENCE_MAX}}`,
    ]);
  });

  it('raises both licence issues together', () => {
    expect(issuesFor({ fssai_number: '1', liquor_licence_number: 'x'.repeat(FOOD_LIQUOR_LICENCE_MAX + 1) })).toEqual([
      'food_licences.fssai_number=venueFoodOwner.licences.fssaiInvalid',
      `food_licences.liquor_licence_number=venueFoodOwner.licences.liquorTooLong:{"max":${FOOD_LIQUOR_LICENCE_MAX}}`,
    ]);
  });
});

describe('the tables', () => {
  const issuesFor = (food_tables: string) => issuesOf(ownerSchema.safeParse(values({ food_tables })));

  it('takes none, or up to the venue’s table limit (a repeat counts once)', () => {
    expect(issuesFor('')).toEqual([]);
    expect(issuesFor('1, 2, Patio')).toEqual([]);
    expect(issuesFor('1, 2, 3, 3, ')).toEqual([]);
  });

  it('refuses more tables than the limit', () => {
    expect(issuesFor('1, 2, 3, 4')).toEqual(['food_tables=venueFoodOwner.tables.limit:{"max":3}']);
  });

  it('refuses a label longer than the checkout’s table field', () => {
    expect(issuesFor(`1, ${'x'.repeat(FOOD_ORDER_LIMITS.tableMax + 1)}`)).toEqual([
      `food_tables=venueFoodOwner.tables.tooLong:{"max":${FOOD_ORDER_LIMITS.tableMax}}`,
    ]);
    expect(issuesFor('x'.repeat(FOOD_ORDER_LIMITS.tableMax))).toEqual([]);
  });

  it('raises both table issues together', () => {
    expect(issuesFor(`1, 2, 3, ${'x'.repeat(FOOD_ORDER_LIMITS.tableMax + 1)}`)).toEqual([
      'food_tables=venueFoodOwner.tables.limit:{"max":3}',
      `food_tables=venueFoodOwner.tables.tooLong:{"max":${FOOD_ORDER_LIMITS.tableMax}}`,
    ]);
  });

  it('checks no licence or table while the venue serves no food', () => {
    const off = values({
      offers_food: false,
      food_licences: { ...blankFoodLicences, fssai_number: '1' },
      food_tables: '1, 2, 3, 4, 5',
    });
    expect(issuesOf(ownerSchema.safeParse(off))).toEqual([]);
  });
});

describe('no client-side ceiling until the config answers', () => {
  it('lets any number of videos and tables through', () => {
    const schema = makeFoodMenuSchema(t, { limits: NO_FOOD_MENU_LIMITS, editsAccount: false });
    const many = Array.from({ length: 50 }, (_, i) => `https://cdn.example.test/${i}.mp4`);
    const tables = Array.from({ length: 200 }, (_, i) => String(i + 1)).join(', ');
    expect(issuesOf(schema.safeParse(values({ food_menu: [dish({ videos: many })], food_tables: tables })))).toEqual([]);
    expect(NO_FOOD_MENU_LIMITS.food_video_limit).toBe(Number.POSITIVE_INFINITY);
    expect(NO_FOOD_MENU_LIMITS.food_table_limit).toBe(Number.POSITIVE_INFINITY);
  });
});
