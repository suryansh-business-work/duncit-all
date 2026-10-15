import { z } from 'zod';
import { FSSAI_NUMBER, YOUTUBE_URL } from '@duncit/regex';
import { FOOD_ORDER_LIMITS, isFoodTableTooLong, parseFoodTables, type FoodMenuConfig, type VenueFoodFormValues } from '@duncit/utils';

import { makeFoodGstinRule, makeVenueFoodTaxRefinement, venueFoodTaxShape } from './food-tax';
import type { Translate } from './translate';

/**
 * A venue's food block — "serves food", the dishes, QR ordering — checked ONE
 * way wherever it is edited: the menu editor (@duncit/venue-food, native), the
 * Partners venue form's Food section and the Venues console editor's. The text
 * bounds are the server's own (`venue.food.ts`); every other cap comes from
 * `venueRegistrationConfig`.
 *
 * The shapes are loose on purpose and the rules run as a refinement that only
 * checks while the venue serves food: a menu kept behind a switched-off toggle
 * is not sent, so it must never be what stops a form from saving.
 */

export const FOOD_DISH_NAME_MAX = 80;
export const FOOD_DISH_DESCRIPTION_MAX = 500;
export const FOOD_DISH_CATEGORY_MAX = 40;
/** A liquor licence has no national format — only its length is held (the server's own cap). */
export const FOOD_LIQUOR_LICENCE_MAX = 40;

/** The config's caps the rules check against. */
export type FoodMenuLimits = Pick<
  FoodMenuConfig,
  'food_menu_limit' | 'food_image_limit' | 'food_price_max' | 'food_discount_max_pct' | 'food_video_limit' | 'food_table_limit'
>;

/** No client-side ceiling — what a form runs on until the config answers; the server still refuses past its own. */
export const NO_FOOD_MENU_LIMITS: FoodMenuLimits = {
  food_menu_limit: Number.POSITIVE_INFINITY,
  food_image_limit: Number.POSITIVE_INFINITY,
  food_price_max: Number.POSITIVE_INFINITY,
  food_discount_max_pct: Number.POSITIVE_INFINITY,
  food_video_limit: Number.POSITIVE_INFINITY,
  food_table_limit: Number.POSITIVE_INFINITY,
};

/** Just the caps of a config, so a schema memoised on them is not rebuilt for an unrelated field. */
export const foodMenuLimitsOf = (config: FoodMenuLimits): FoodMenuLimits => ({
  food_menu_limit: config.food_menu_limit,
  food_image_limit: config.food_image_limit,
  food_price_max: config.food_price_max,
  food_discount_max_pct: config.food_discount_max_pct,
  food_video_limit: config.food_video_limit,
  food_table_limit: config.food_table_limit,
});

const textOrNumber = z.union([z.number(), z.string()]);

export const foodDishShape = z.object({
  item_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: textOrNumber,
  images: z.array(z.string()),
  diet: z.string(),
  spice_level: z.string(),
  is_available: z.boolean(),
  videos: z.array(z.string()),
  original_price: textOrNumber,
  saving_display: z.string(),
});

export const foodLicencesShape = z.object({
  fssai_number: z.string(),
  fssai_document_url: z.string(),
  liquor_licence_number: z.string(),
  liquor_document_url: z.string(),
});

export const foodOrderingShape = z.object({
  enabled: z.boolean(),
  razorpay_integration_id: z.string(),
  razorpay_linked: z.boolean(),
  discount_pct: textOrNumber,
  ...venueFoodTaxShape,
});

/** The food fields, under the names every venue form uses. */
export const venueFoodShape = {
  offers_food: z.boolean(),
  food_menu: z.array(foodDishShape),
  food_ordering: foodOrderingShape,
  food_licences: foodLicencesShape,
  food_tables: z.string(),
};

export interface VenueFoodRuleOptions {
  limits: FoodMenuLimits;
  /**
   * Whether this form edits the Razorpay account (an owner surface with the
   * picker): ordering then needs one picked. Otherwise it needs the owner's
   * link (`razorpay_linked`) — the switch cannot open orders on an account
   * nobody here can choose.
   */
  editsAccount: boolean;
}

/** A stored video: a YouTube video link, or the http(s) address the upload pipeline handed back. */
const isVideoLink = (value: string): boolean =>
  YOUTUBE_URL.test(value) || value.startsWith('https://') || value.startsWith('http://');

const dishRules = (t: Translate, limits: FoodMenuLimits) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('venueFoodOwner.menu.nameRequired'))
      .max(FOOD_DISH_NAME_MAX, t('venueFoodOwner.menu.nameTooLong', { vars: { max: FOOD_DISH_NAME_MAX } })),
    description: z
      .string()
      .trim()
      .max(
        FOOD_DISH_DESCRIPTION_MAX,
        t('venueFoodOwner.menu.descriptionTooLong', { vars: { max: FOOD_DISH_DESCRIPTION_MAX } }),
      ),
    category: z
      .string()
      .trim()
      .max(FOOD_DISH_CATEGORY_MAX, t('venueFoodOwner.menu.categoryTooLong', { vars: { max: FOOD_DISH_CATEGORY_MAX } })),
    // Rupees, and paise are allowed — coerced but not held to a whole number.
    price: z.coerce
      .number({ error: t('venueFoodOwner.menu.priceInvalid') })
      .min(1, t('venueFoodOwner.menu.priceInvalid'))
      .max(limits.food_price_max, t('venueFoodOwner.menu.priceTooHigh', { vars: { max: limits.food_price_max } })),
    images: z
      .array(z.string())
      .max(limits.food_image_limit, t('venueFoodOwner.menu.photosLimit', { vars: { max: limits.food_image_limit } })),
    videos: z
      .array(z.string().refine(isVideoLink, t('venueFoodOwner.videos.invalid')))
      .max(limits.food_video_limit, t('venueFoodOwner.videos.limit', { vars: { max: limits.food_video_limit } })),
  });

const isBlank = (value: number | string): boolean => String(value).trim() === '' || Number(value) === 0;

/**
 * The struck-through MRP: optional, but when given it must be a number above
 * the price — the server's own rule. Display only; the price is what is charged.
 */
function addOriginalPriceIssues(dish: VenueFoodFormValues['food_menu'][number], path: PropertyKey[], ctx: z.RefinementCtx, t: Translate) {
  if (isBlank(dish.original_price)) return;
  const original = Number(dish.original_price);
  if (!Number.isFinite(original) || original <= Number(dish.price)) {
    ctx.addIssue({ code: 'custom', path: [...path, 'original_price'], message: t('venueFoodOwner.menu.originalPriceInvalid') });
  }
}

/** The FSSAI number (14 digits, or none yet) and the liquor licence number's length. */
function addLicenceIssues(licences: VenueFoodFormValues['food_licences'], ctx: z.RefinementCtx, t: Translate) {
  const fssai = licences.fssai_number.trim();
  if (fssai && !FSSAI_NUMBER.test(fssai)) {
    ctx.addIssue({ code: 'custom', path: ['food_licences', 'fssai_number'], message: t('venueFoodOwner.licences.fssaiInvalid') });
  }
  if (licences.liquor_licence_number.trim().length > FOOD_LIQUOR_LICENCE_MAX) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_licences', 'liquor_licence_number'],
      message: t('venueFoodOwner.licences.liquorTooLong', { vars: { max: FOOD_LIQUOR_LICENCE_MAX } }),
    });
  }
}

/** The tables as typed: within the venue's limit, each short enough for the checkout's table field. */
function addTableIssues(text: string, limits: FoodMenuLimits, ctx: z.RefinementCtx, t: Translate) {
  const tables = parseFoodTables(text);
  if (tables.length > limits.food_table_limit) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_tables'],
      message: t('venueFoodOwner.tables.limit', { vars: { max: limits.food_table_limit } }),
    });
  }
  if (tables.some(isFoodTableTooLong)) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_tables'],
      message: t('venueFoodOwner.tables.tooLong', { vars: { max: FOOD_ORDER_LIMITS.tableMax } }),
    });
  }
}

const discountRule = (t: Translate, limits: FoodMenuLimits) => {
  const message = t('venueFoodOwner.menu.discountInvalid', { vars: { max: limits.food_discount_max_pct } });
  return z.coerce.number({ error: message }).int(message).min(0, message).max(limits.food_discount_max_pct, message);
};

/** Re-raises a nested check's issues on the form, under `prefix`. */
const relay = (result: { error?: z.ZodError }, prefix: PropertyKey[], ctx: z.RefinementCtx) => {
  for (const issue of result.error?.issues ?? []) {
    ctx.addIssue({ code: 'custom', path: [...prefix, ...issue.path], message: issue.message });
  }
};

/** Ordering can only be on with an account to pay into and something to order — the server's own gate. */
function addOrderingIssues(values: VenueFoodFormValues, ctx: z.RefinementCtx, t: Translate, editsAccount: boolean) {
  const ordering = values.food_ordering;
  if (!ordering.enabled) return;
  if (editsAccount && !ordering.razorpay_integration_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['food_ordering', 'razorpay_integration_id'],
      message: t('venueFoodOwner.menu.accountRequired'),
    });
  }
  if (!editsAccount && !ordering.razorpay_linked) {
    ctx.addIssue({ code: 'custom', path: ['food_ordering', 'enabled'], message: t('venueFoodOwner.menu.accountMissing') });
  }
  if (!values.food_menu.some((dish) => dish.is_available)) {
    ctx.addIssue({ code: 'custom', path: ['food_ordering', 'enabled'], message: t('venueFoodOwner.menu.needsDish') });
  }
}

/**
 * The food block's rules, for a venue form's `superRefine`. Nothing is checked
 * while "serves food" is off.
 */
export function makeVenueFoodRefinement(t: Translate, { limits, editsAccount }: VenueFoodRuleOptions) {
  const dish = dishRules(t, limits);
  const discount = discountRule(t, limits);
  const checkTax = makeVenueFoodTaxRefinement(t);
  return (values: VenueFoodFormValues, ctx: z.RefinementCtx) => {
    if (!values.offers_food) return;
    if (values.food_menu.length > limits.food_menu_limit) {
      ctx.addIssue({
        code: 'custom',
        path: ['food_menu'],
        message: t('venueFoodOwner.menu.menuLimit', { vars: { max: limits.food_menu_limit } }),
      });
    }
    values.food_menu.forEach((row, index) => {
      relay(dish.safeParse(row), ['food_menu', index], ctx);
      addOriginalPriceIssues(row, ['food_menu', index], ctx, t);
    });
    addLicenceIssues(values.food_licences, ctx, t);
    addTableIssues(values.food_tables, limits, ctx, t);
    relay(discount.safeParse(values.food_ordering.discount_pct), ['food_ordering', 'discount_pct'], ctx);
    checkTax(values.food_ordering, ctx, ['food_ordering']);
    addOrderingIssues(values, ctx, t, editsAccount);
  };
}

/**
 * The menu editor's whole form: the food block and the invoice GST number,
 * which is checked only while the venue serves food — that is when it is shown
 * and sent.
 */
export function makeFoodMenuSchema(t: Translate, options: VenueFoodRuleOptions) {
  const checkFood = makeVenueFoodRefinement(t, options);
  const gstin = makeFoodGstinRule(t);
  return z.object({ ...venueFoodShape, gstin: z.string() }).superRefine((values, ctx) => {
    checkFood(values, ctx);
    if (values.offers_food) relay(gstin.safeParse(values.gstin), ['gstin'], ctx);
  });
}

export type FoodMenuSchemaValues = z.infer<ReturnType<typeof makeFoodMenuSchema>>;
