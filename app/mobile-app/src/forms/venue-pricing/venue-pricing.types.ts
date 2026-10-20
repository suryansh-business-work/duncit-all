import { z } from 'zod';

import type { Translate } from '@/i18n/fallback';

/**
 * The Venue Pricing Module form — what the owner edits, held as strings
 * because every number comes out of a text input (an emptied field is `''`,
 * and coercing that to 0 on each keystroke would rewrite what they type).
 *
 * The server validates again and names the field it refuses; these checks
 * mirror it (venuePricing.validate) so the owner reads the reason on the row
 * instead of after a round trip. Single-date prices (DATE_OVERRIDE) and
 * blocked dates are edited on the calendar, never here — see the mapping.
 */
export const PRICING_MODELS = ['PER_PAX', 'PER_SLOT', 'PER_HOUR', 'FLAT'] as const;
export type PricingModelName = (typeof PRICING_MODELS)[number];

export const RULE_MODES = ['PERCENT', 'FLAT'] as const;
export type RuleModeName = (typeof RULE_MODES)[number];

/** The rule kinds this form lists; a single date's price lives on the calendar. */
export type FormRuleType = 'WEEKDAY_SURCHARGE' | 'DATE_RANGE';

export interface PricingSlotValues {
  start_time: string;
  end_time: string;
  price: string;
  days_of_week: number[];
}

/** One weekday's row (0 = Sunday); a closed day is sent as no row at all. */
export interface DayHoursValues {
  day: number;
  open: boolean;
  from: string;
  to: string;
}

export interface PriceRuleValues {
  type: FormRuleType;
  label: string;
  days: number[];
  from: string;
  to: string;
  mode: RuleModeName;
  value: string;
}

export interface VenuePricingValues {
  model: PricingModelName | '';
  base_rate: string;
  min_pax: string;
  max_pax: string;
  min_hours: string;
  max_hours: string;
  booking_increment_minutes: string;
  min_spend: string;
  deposit: string;
  cleaning_fee: string;
  pet_fee: string;
  gst_enabled: boolean;
  slots: PricingSlotValues[];
  hours: DayHoursValues[];
  rules: PriceRuleValues[];
}

const PERCENT_MIN = -100;
const PERCENT_MAX = 1000;
const HOURS_MAX = 24;
const INCREMENT_STEP = 15;

const numberOf = (raw: string) => (raw.trim() === '' ? Number.NaN : Number(raw));
const isAmount = (raw: string) => Number.isFinite(numberOf(raw)) && numberOf(raw) >= 0;
const isWhole = (raw: string) => Number.isInteger(numberOf(raw)) && numberOf(raw) >= 0;

type Ctx = z.RefinementCtx;
const issue = (ctx: Ctx, path: (string | number)[], message: string) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

function checkLimits(values: VenuePricingValues, t: Translate, ctx: Ctx) {
  if (values.model && values.model !== 'PER_SLOT' && !(numberOf(values.base_rate) > 0)) {
    issue(ctx, ['base_rate'], t('availability.pricingModule.validation.rateRequired'));
  }
  if (values.model === 'PER_PAX' && numberOf(values.min_pax) < 1) {
    issue(ctx, ['min_pax'], t('availability.pricingModule.validation.minPaxOne'));
  }
  const maxPax = numberOf(values.max_pax);
  if (maxPax > 0 && maxPax < numberOf(values.min_pax)) {
    issue(ctx, ['max_pax'], t('availability.pricingModule.validation.maxPax'));
  }
  const maxHours = numberOf(values.max_hours);
  if (maxHours > 0 && maxHours < numberOf(values.min_hours)) {
    issue(ctx, ['max_hours'], t('availability.pricingModule.validation.maxHours'));
  }
  const step = numberOf(values.booking_increment_minutes);
  if (values.model === 'PER_HOUR' && (step < INCREMENT_STEP || step % INCREMENT_STEP !== 0)) {
    issue(ctx, ['booking_increment_minutes'], t('availability.pricingModule.validation.increment'));
  }
  if (values.model === 'PER_SLOT' && values.slots.length === 0) {
    issue(ctx, ['slots'], t('availability.pricingModule.validation.slotRequired'));
  }
}

/** Slots only matter to a PER_SLOT venue; other models keep their saved ones untouched. */
function checkSlots(values: VenuePricingValues, t: Translate, ctx: Ctx) {
  if (values.model !== 'PER_SLOT') return;
  values.slots.forEach((slot, i) => {
    if (!slot.start_time || !slot.end_time) {
      issue(ctx, ['slots', i, 'end_time'], t('availability.pricingModule.validation.timeRequired'));
    } else if (slot.end_time <= slot.start_time) {
      issue(
        ctx,
        ['slots', i, 'end_time'],
        t('availability.pricingModule.validation.endAfterStart'),
      );
    }
    if (!isAmount(slot.price)) {
      issue(ctx, ['slots', i, 'price'], t('availability.pricingModule.validation.amount'));
    }
    if (slot.days_of_week.length === 0) {
      issue(ctx, ['slots', i, 'days_of_week'], t('availability.pricingModule.validation.pickDays'));
    }
  });
}

function checkHours(values: VenuePricingValues, t: Translate, ctx: Ctx) {
  values.hours.forEach((row, i) => {
    if (row.open && (!row.from || !row.to || row.to <= row.from)) {
      issue(ctx, ['hours', i, 'to'], t('availability.pricingModule.validation.endAfterStart'));
    }
  });
}

function checkRules(values: VenuePricingValues, t: Translate, ctx: Ctx) {
  values.rules.forEach((rule, i) => {
    const value = numberOf(rule.value);
    if (!Number.isFinite(value)) {
      issue(ctx, ['rules', i, 'value'], t('availability.pricingModule.validation.ruleValue'));
    } else if (rule.mode === 'PERCENT' && (value < PERCENT_MIN || value > PERCENT_MAX)) {
      issue(ctx, ['rules', i, 'value'], t('availability.pricingModule.validation.percentRange'));
    }
    if (rule.type === 'WEEKDAY_SURCHARGE' && rule.days.length === 0) {
      issue(ctx, ['rules', i, 'days'], t('availability.pricingModule.validation.pickDays'));
    }
    if (rule.type === 'DATE_RANGE' && (!rule.from || !rule.to || rule.from > rule.to)) {
      issue(ctx, ['rules', i, 'to'], t('availability.pricingModule.validation.rangeDates'));
    }
  });
}

/** The form contract, bound to this surface's translator. */
export function makeVenuePricingSchema(t: Translate) {
  const amount = z.string().refine(isAmount, t('availability.pricingModule.validation.amount'));
  const whole = z.string().refine(isWhole, t('availability.pricingModule.validation.wholeNumber'));
  const hours = z
    .string()
    .refine(
      (raw) => isAmount(raw) && numberOf(raw) <= HOURS_MAX,
      t('availability.pricingModule.validation.hoursRange'),
    );
  return z
    .object({
      model: z
        .union([z.enum(PRICING_MODELS), z.literal('')])
        .refine((raw) => raw !== '', t('availability.pricingModule.validation.modelRequired')),
      base_rate: amount,
      min_pax: whole,
      max_pax: whole,
      min_hours: hours,
      max_hours: hours,
      booking_increment_minutes: whole,
      min_spend: amount,
      deposit: amount,
      cleaning_fee: amount,
      pet_fee: amount,
      gst_enabled: z.boolean(),
      slots: z.array(
        z.object({
          start_time: z.string(),
          end_time: z.string(),
          price: z.string(),
          days_of_week: z.array(z.number()),
        }),
      ),
      hours: z.array(
        z.object({ day: z.number(), open: z.boolean(), from: z.string(), to: z.string() }),
      ),
      rules: z.array(
        z.object({
          type: z.enum(['WEEKDAY_SURCHARGE', 'DATE_RANGE']),
          label: z.string(),
          days: z.array(z.number()),
          from: z.string(),
          to: z.string(),
          mode: z.enum(RULE_MODES),
          value: z.string(),
        }),
      ),
    })
    .superRefine((values, ctx) => {
      checkLimits(values, t, ctx);
      checkSlots(values, t, ctx);
      checkHours(values, t, ctx);
      checkRules(values, t, ctx);
    });
}

/** One calendar date's own price (a DATE_OVERRIDE): a percent or a flat change of the base. */
export interface DateOverrideValues {
  mode: RuleModeName;
  value: string;
}

export function makeDateOverrideSchema(t: Translate) {
  return z.object({ mode: z.enum(RULE_MODES), value: z.string() }).superRefine((values, ctx) => {
    const value = numberOf(values.value);
    if (!Number.isFinite(value)) {
      issue(ctx, ['value'], t('availability.pricingModule.validation.ruleValue'));
    } else if (values.mode === 'PERCENT' && (value < PERCENT_MIN || value > PERCENT_MAX)) {
      issue(ctx, ['value'], t('availability.pricingModule.validation.percentRange'));
    }
  });
}
