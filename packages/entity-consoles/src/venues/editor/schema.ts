import { z } from 'zod';
import { GSTIN_PATTERN, PAN_PATTERN, POSTAL_CODE_PATTERN, zodRules } from '@duncit/forms';
import { BANK_ACCOUNT_NUMBER, IFSC, PHONE_INTL_PLUS, UPI_ID } from '@duncit/regex';
import { duplicateCategoryRows, isCompleteCategory, type AdminCategoryValue } from '@duncit/category';
import { podRequestOverrideField } from '../../shared/podRequestLimit';

/**
 * The venue record's validation (rule 30: React Hook Form + Zod).
 *
 * A FACTORY rather than a constant, because a Zod schema is built outside React
 * and its messages are copy: the form passes its own live `t`, so the rules
 * speak whatever language the surface resolved (rule 38, the same shape every
 * schema in `@duncit/forms/schemas` uses).
 *
 * Bounds match the server's own — `venue.model.ts` clamps `max_advance_days` to
 * 60 and a percent to 100, and the server would silently clamp a value this
 * form let through. Saying no here means the admin is told, rather than finding
 * out later that what they typed is not what was stored.
 */
export type Translate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/** The generic messages, bound once to this form's translator. */
function messages(t: Translate) {
  return {
    required: (field: string) => t('directory.venueEditor.errRequired', { vars: { field } }),
    number: (field: string) => t('directory.venueEditor.errNumber', { vars: { field } }),
    whole: (field: string) => t('directory.venueEditor.errWhole', { vars: { field } }),
    min: (field: string, min: number) =>
      t('directory.venueEditor.errMin', { vars: { field, min } }),
    max: (field: string, max: number) =>
      t('directory.venueEditor.errMax', { vars: { field, max } }),
    minLen: (field: string, min: number) =>
      t('directory.venueEditor.errMinLen', { vars: { field, min } }),
    maxLen: (field: string, max: number) =>
      t('directory.venueEditor.errMaxLen', { vars: { field, max } }),
  };
}

type Messages = ReturnType<typeof messages>;

const optional = (max: number) => z.string().trim().max(max).default('');

/**
 * Coerced, because an MUI number input hands back a STRING: without this every
 * numeric field would fail with "must be a number" the moment it was typed in.
 */
const wholeNumber = (m: Messages, field: string, min: number, max: number) =>
  z.coerce
    .number({ error: m.number(field) })
    .int(m.whole(field))
    .min(min, m.min(field, min))
    .max(max, m.max(field, max));

const percent = (m: Messages, field: string) =>
  z.coerce
    .number({ error: m.number(field) })
    .min(0, m.min(field, 0))
    .max(100, m.max(field, 100));

/** 'HH:mm' — the shape the venue stores its operating window in. */
const clockTime = (t: Translate, field: string) =>
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('directory.venueEditor.errClock', { vars: { field } }));

/**
 * Where the payout goes. Every field stays optional — staff register a venue
 * before its bank details are known — but one that IS filled in is held to the
 * same `@duncit/regex` format the owner's own form checks it against, so staff
 * cannot store an account the owner's form would then refuse to re-save.
 */
const bankSchema = (t: Translate) =>
  z.object({
    payout_method: optional(30),
    account_holder_name: optional(120),
    account_number: optional(40).refine(
      (value) => !value || BANK_ACCOUNT_NUMBER.test(value),
      t('directory.venueEditor.errAccountNumber'),
    ),
    ifsc_code: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .default('')
      .refine((value) => !value || IFSC.test(value), t('directory.venueEditor.errIfsc')),
    upi_id: optional(120).refine(
      (value) => !value || UPI_ID.test(value),
      t('directory.venueEditor.errUpi'),
    ),
  });

/**
 * No client-side cap on categories — what the form runs on until the catalogue
 * answers, so the server's own limit decides rather than a number guessed here.
 */
export const NO_CATEGORY_LIMIT = Number.MAX_SAFE_INTEGER;

/** "At most N categories" — the list's own error past the cap, and the note under a full list. */
export const categoryLimitMessage = (t: Translate, limit: number) =>
  limit === 1
    ? t('directory.venueEditor.categoryLimitOne')
    : t('directory.venueEditor.categoryLimitMany', { vars: { max: limit } });

const categoryRowSchema = z.object({
  super_id: z.string().default(''),
  super_name: z.string().default(''),
  category_id: z.string().default(''),
  category_name: z.string().default(''),
  sub_id: z.string().default(''),
  sub_name: z.string().default(''),
});

/** A row somebody began picking: any of its three levels is chosen. */
const isStartedCategory = (row: AdminCategoryValue) =>
  !!(row.super_id || row.category_id || row.sub_id);

/**
 * Every STARTED row is one whole Super → Category → Sub, and no sub category
 * twice — the server drops a repeat silently, so it is refused here where the
 * row can be seen. A row nobody picked anything in is not an error (it is simply
 * not sent), which is what keeps a category optional for staff. Issues sit on
 * the row, which is where the picker shows them.
 */
const checkCategories = (t: Translate) => (rows: AdminCategoryValue[], ctx: z.RefinementCtx) => {
  const duplicates = duplicateCategoryRows(rows);
  rows.forEach((row, index) => {
    if (!isStartedCategory(row)) return;
    if (!isCompleteCategory(row)) {
      ctx.addIssue({
        code: 'custom',
        path: [index],
        message: t('directory.venueEditor.categoryIncomplete'),
      });
    } else if (duplicates.has(index)) {
      ctx.addIssue({
        code: 'custom',
        path: [index],
        message: t('directory.venueEditor.categoryDuplicate'),
      });
    }
  });
};

const rulesSchema = (t: Translate, m: Messages) =>
  z.object({
    buffer_minutes: wholeNumber(m, t('directory.venueEditor.bufferMinutes'), 0, 1440),
    min_notice_minutes: wholeNumber(m, t('directory.venueEditor.minNotice'), 0, 525_600),
    max_advance_days: wholeNumber(m, t('directory.venueEditor.maxAdvance'), 1, 60),
    max_bookings_per_slot: wholeNumber(m, t('directory.venueEditor.maxPerSlot'), 1, 100_000),
    allow_instant_booking: z.boolean(),
    allow_waitlist: z.boolean(),
    booking_approval_required: z.boolean(),
    allow_multiple_bookings: z.boolean(),
  });

/** A charge may be a flat amount, so only the PERCENT case has a ceiling. */
const uncappedNumber = (m: Messages, field: string) =>
  z.coerce.number({ error: m.number(field) }).min(0, m.min(field, 0));

const chargeTierSchema = (t: Translate, m: Messages) =>
  z
    .object({
      hours_before: wholeNumber(m, t('directory.venueEditor.withinHours'), 0, 8760),
      charge_type: z.enum(['PERCENT', 'AMOUNT']),
      value: uncappedNumber(m, t('directory.venueEditor.chargeValue')),
    })
    .refine((tier) => tier.charge_type !== 'PERCENT' || tier.value <= 100, {
      message: t('directory.venueEditor.errPercentCeiling'),
      path: ['value'],
    });

const refundTierSchema = (t: Translate, m: Messages) =>
  z.object({
    hours_before: wholeNumber(m, t('directory.venueEditor.moreThanHours'), 0, 8760),
    refund_pct: percent(m, t('directory.venueEditor.refundPct')),
  });

const uniqueWindows = (tiers: readonly { hours_before: number }[]) =>
  new Set(tiers.map((tier) => tier.hours_before)).size === tiers.length;

const settingsSchema = (t: Translate, m: Messages) =>
  z
    .object({
      open: clockTime(t, t('directory.venueEditor.opensAt')),
      close: clockTime(t, t('directory.venueEditor.closesAt')),
      weekly_off_days: z.array(z.number().int().min(0).max(6)).default([]),
      holidays: z.array(z.string().trim()).default([]),
      rules: rulesSchema(t, m),
      auto_extend_enabled: z.boolean(),
      auto_extend_horizon_days: wholeNumber(
        m,
        t('directory.venueEditor.autoExtendHorizon'),
        1,
        365,
      ),
      auto_extend_until: optional(10),
      reschedule_only: z.boolean(),
      charge_tiers: z.array(chargeTierSchema(t, m)).default([]),
      trigger_hours: wholeNumber(m, t('directory.venueEditor.triggerHours'), 0, 8760),
      refund_tiers: z.array(refundTierSchema(t, m)).default([]),
    })
    .refine((s) => s.close > s.open, {
      message: t('directory.venueEditor.errCloseAfterOpen'),
      path: ['close'],
    })
    // Two bands with the same window is a policy that cannot be read — the
    // server rejects it, so the form does too rather than round-tripping.
    .refine((s) => uniqueWindows(s.charge_tiers), {
      message: t('directory.venueEditor.errDuplicateBand'),
      path: ['charge_tiers'],
    })
    .refine((s) => uniqueWindows(s.refund_tiers), {
      message: t('directory.venueEditor.errDuplicateBand'),
      path: ['refund_tiers'],
    });

/** The menu's bounds, as `venueRegistrationConfig` serves them. */
export interface VenueFoodLimits {
  food_menu_limit: number;
  food_image_limit: number;
  food_price_max: number;
}

/**
 * No client-side ceiling — what the form runs on until the catalogue answers.
 * The bounds are the server's to state, so nothing is guessed here; the server
 * still refuses a menu that breaks them.
 */
export const UNCAPPED_FOOD_LIMITS: VenueFoodLimits = {
  food_menu_limit: Number.POSITIVE_INFINITY,
  food_image_limit: Number.POSITIVE_INFINITY,
  food_price_max: Number.POSITIVE_INFINITY,
};

/** One dish. The text bounds are the server's own (`venue.food.ts`). */
const foodItemSchema = (t: Translate, m: Messages, limits: VenueFoodLimits) =>
  z.object({
    item_id: z.string().default(''),
    name: z
      .string()
      .trim()
      .min(1, m.required(t('directory.venueEditor.dishName')))
      .max(80, m.maxLen(t('directory.venueEditor.dishName'), 80)),
    description: z
      .string()
      .trim()
      .max(500, m.maxLen(t('directory.venueEditor.dishDescription'), 500))
      .default(''),
    category: z
      .string()
      .trim()
      .max(40, m.maxLen(t('directory.venueEditor.dishSection'), 40))
      .default(''),
    // Rupees, and paise are allowed — so coerced but not held to a whole number.
    price: z.coerce
      .number({ error: m.number(t('directory.venueEditor.dishPrice')) })
      .min(1, m.min(t('directory.venueEditor.dishPrice'), 1))
      .max(
        limits.food_price_max,
        m.max(t('directory.venueEditor.dishPrice'), limits.food_price_max),
      ),
    images: z
      .array(z.string().trim().max(1000))
      .max(
        limits.food_image_limit,
        t('directory.venueEditor.errDishPhotos', { vars: { max: limits.food_image_limit } }),
      )
      .default([]),
    // Free strings on purpose: the selects only offer what the server's
    // catalogue lists, so restating the two enums here would be a second copy.
    diet: z.string().default(''),
    spice_level: z.string().default(''),
    is_available: z.boolean().default(true),
  });

export function makeVenueFormSchema(
  t: Translate,
  foodLimits: VenueFoodLimits = UNCAPPED_FOOD_LIMITS,
  categoryLimit: number = NO_CATEGORY_LIMIT,
) {
  const m = messages(t);
  return z.object({
    id: z.string().default(''),
    owner_user_id: z.string().trim().min(1, t('directory.venueEditor.errPickOwner')),

    venue_name: z
      .string()
      .trim()
      .min(2, m.minLen(t('directory.venueEditor.venueName'), 2))
      .max(120, m.maxLen(t('directory.venueEditor.venueName'), 120)),
    venue_type: z.string().trim().min(1, m.required(t('directory.venueEditor.venueType'))),
    capacity: wholeNumber(m, t('directory.venueEditor.totalCapacity'), 1, 100_000),
    capacity_items: z
      .array(
        z.object({
          label: z.string().trim().min(1, m.required(t('directory.venueEditor.spaceName'))),
          capacity: wholeNumber(m, t('directory.venueEditor.seats'), 1, 100_000),
        }),
      )
      .max(50)
      .default([]),
    offers_food: z.boolean().default(false),
    food_menu: z
      .array(foodItemSchema(t, m, foodLimits))
      .max(
        foodLimits.food_menu_limit,
        t('directory.venueEditor.errMenuSize', { vars: { max: foodLimits.food_menu_limit } }),
      )
      .default([]),
    categories: z
      .array(categoryRowSchema)
      .max(categoryLimit, categoryLimitMessage(t, categoryLimit))
      .superRefine(checkCategories(t))
      .default([]),
    description: optional(2000),
    amenities: z.array(z.string().trim()).default([]),
    facilities: z.array(z.string().trim()).default([]),
    security: z.array(z.string().trim()).default([]),
    tags: z.array(z.string().trim().max(40)).default([]),

    cover_image_url: optional(1000),
    gallery: z.array(z.string().trim().max(1000)).default([]),

    location: z.object({
      location_id: z.string().trim().min(1, t('directory.venueEditor.errPickCity')),
      country: z.string().trim().default(''),
      country_code: z.string().trim().default(''),
      state: z.string().trim().default(''),
      state_code: z.string().trim().default(''),
      city: z.string().trim().min(1, m.required(t('directory.venueEditor.errCityField'))),
      locality: z.string().trim().default(''),
      pincode: z
        .string()
        .trim()
        .regex(POSTAL_CODE_PATTERN, t('directory.venueEditor.errPincode'))
        .or(z.literal('')),
    }),
    address_line1: z
      .string()
      .trim()
      .min(3, m.minLen(t('directory.venueEditor.addressLine1'), 3))
      .max(200, m.maxLen(t('directory.venueEditor.addressLine1'), 200)),
    address_line2: optional(200),

    documents: z
      .array(
        z.object({
          type: z.string().trim().min(1, m.required(t('directory.venueEditor.documentType'))),
          url: z.string().trim().min(1, m.required(t('directory.venueEditor.documentFile'))),
        }),
      )
      .default([]),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .max(30)
      .default('')
      .refine(
        (value) => !value || GSTIN_PATTERN.test(value),
        t('directory.venueEditor.errGstin'),
      ),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .default('')
      .refine((value) => !value || PAN_PATTERN.test(value), t('directory.venueEditor.errPan')),

    owner_name: zodRules.personName(t('directory.venueEditor.ownerName')),
    owner_email: zodRules.email(t('directory.venueEditor.ownerEmail')),
    // The owner's form takes a pasted full number with its leading "+", so this
    // one does too — otherwise staff could not re-save a venue its owner filed.
    owner_phone: z
      .string()
      .trim()
      .regex(
        PHONE_INTL_PLUS,
        t('directory.venueEditor.errPhone', {
          vars: { field: t('directory.venueEditor.ownerPhone') },
        }),
      ),
    owner_dob: optional(30),
    owner_address: optional(500),
    bank_account: bankSchema(t),

    venue_share_pct: percent(m, t('directory.venueEditor.sharePct')),
    venue_commission_pct: percent(m, t('directory.venueEditor.commissionPct')),
    host_requests_limit_override: podRequestOverrideField(t),

    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
    is_active: z.boolean(),

    settings: settingsSchema(t, m),
  });
}

export type VenueFormSchemaValues = z.infer<ReturnType<typeof makeVenueFormSchema>>;
