import { z } from 'zod';
import { TIME_OF_DAY_PATTERN } from '@duncit/forms';
import { PRICE_RULE_MODES, PRICE_RULE_TYPES, PRICING_MODELS, type Translate } from '../types';

/** Mirrors the server's ceiling, so the owner hears about it before the save. */
const MAX_RUPEES = 1_000_000;
const MAX_SLOTS = 50;
const MAX_RULES = 100;

const weekday = z.number().int().min(0).max(6);

/** One cross-field rule: the field it points at, its message key, and when it fails. */
interface Check<T> {
  path: string;
  key: string;
  failed: (value: T) => boolean;
}

interface RuleShape {
  type: string;
  mode: string;
  value: number;
  days: number[];
  dates: string[];
  from: string;
  to: string;
}

const RULE_CHECKS: readonly Check<RuleShape>[] = [
  { path: 'value', key: 'venuePricing.validation.percentRange', failed: (r) => r.mode === 'PERCENT' && (r.value < -100 || r.value > 1000) },
  { path: 'days', key: 'venuePricing.validation.pickDay', failed: (r) => r.type === 'WEEKDAY_SURCHARGE' && r.days.length === 0 },
  { path: 'dates', key: 'venuePricing.validation.pickDate', failed: (r) => r.type === 'DATE_OVERRIDE' && r.dates.length === 0 },
  { path: 'to', key: 'venuePricing.validation.range', failed: (r) => r.type === 'DATE_RANGE' && (!r.from || !r.to || r.from > r.to) },
];

interface PricingShape {
  model: string;
  base_rate: number;
  min_pax: number;
  max_pax: number;
  min_hours: number;
  max_hours: number;
  booking_increment_minutes: number;
  slots: readonly unknown[];
  custom_hours: boolean;
  operating_hours: readonly { enabled: boolean }[];
}

/** The server's model limits, so the owner hears about them in place. */
const PRICING_CHECKS: readonly Check<PricingShape>[] = [
  { path: 'base_rate', key: 'venuePricing.validation.rateRequired', failed: (v) => v.model !== 'PER_SLOT' && v.base_rate <= 0 },
  { path: 'slots', key: 'venuePricing.validation.slotRequired', failed: (v) => v.model === 'PER_SLOT' && v.slots.length === 0 },
  { path: 'min_pax', key: 'venuePricing.validation.minPax', failed: (v) => v.model === 'PER_PAX' && v.min_pax < 1 },
  { path: 'max_pax', key: 'venuePricing.validation.maxPax', failed: (v) => v.max_pax > 0 && v.max_pax < v.min_pax },
  { path: 'max_hours', key: 'venuePricing.validation.maxHours', failed: (v) => v.max_hours > 0 && v.max_hours < v.min_hours },
  {
    path: 'booking_increment_minutes',
    key: 'venuePricing.validation.step',
    failed: (v) => v.model === 'PER_HOUR' && (v.booking_increment_minutes < 15 || v.booking_increment_minutes % 15 !== 0),
  },
  { path: 'operating_hours', key: 'venuePricing.validation.openOneDay', failed: (v) => v.custom_hours && !v.operating_hours.some((h) => h.enabled) },
];

/** A superRefine that reports every failed check on its own field. */
const runChecks =
  <T>(t: Translate, checks: readonly Check<T>[]) =>
  (value: T, ctx: z.RefinementCtx) => {
    for (const check of checks) {
      if (check.failed(value)) ctx.addIssue({ code: 'custom', message: t(check.key), path: [check.path] });
    }
  };

/**
 * The Venue Pricing Module's rules, built from the reader's `t` (a message is
 * copy the owner reads). The server re-checks everything and stays the
 * authority: these exist so a mistake is pointed at in place, not after a
 * round trip.
 */
export const buildVenuePricingSchema = (t: Translate) => {
  const money = z
    .number({ error: t('venuePricing.validation.number') })
    .min(0, t('venuePricing.validation.notNegative'))
    .max(MAX_RUPEES, t('venuePricing.validation.tooLarge'));
  const count = z
    .number({ error: t('venuePricing.validation.number') })
    .int(t('venuePricing.validation.wholeNumber'))
    .min(0, t('venuePricing.validation.notNegative'));
  const hours = z
    .number({ error: t('venuePricing.validation.number') })
    .min(0, t('venuePricing.validation.notNegative'))
    .max(24, t('venuePricing.validation.hoursMax'));
  const clock = z.string().regex(TIME_OF_DAY_PATTERN, t('venuePricing.validation.time'));

  const slot = z
    .object({
      start_time: clock,
      end_time: clock,
      price: money,
      days_of_week: z.array(weekday).min(1, t('venuePricing.validation.pickDay')),
    })
    .refine((s) => s.end_time > s.start_time, { message: t('venuePricing.validation.endAfterStart'), path: ['end_time'] });

  const hoursRow = z
    .object({ day: weekday, enabled: z.boolean(), open: clock, close: clock })
    .refine((h) => !h.enabled || h.close > h.open, { message: t('venuePricing.validation.endAfterStart'), path: ['close'] });

  const rule = z
    .object({
      type: z.enum(PRICE_RULE_TYPES),
      label: z.string().trim().max(80, t('venuePricing.validation.labelTooLong')),
      mode: z.enum(PRICE_RULE_MODES),
      value: z.number({ error: t('venuePricing.validation.number') }).refine((v) => v !== 0, t('venuePricing.validation.nonZero')),
      days: z.array(weekday),
      dates: z.array(z.string()),
      from: z.string(),
      to: z.string(),
    })
    .superRefine(runChecks(t, RULE_CHECKS));

  return z
    .object({
      model: z.enum(PRICING_MODELS),
      base_rate: money,
      min_pax: count,
      max_pax: count,
      min_hours: hours,
      max_hours: hours,
      booking_increment_minutes: count,
      min_spend: money,
      slots: z.array(slot).max(MAX_SLOTS),
      custom_hours: z.boolean(),
      operating_hours: z.array(hoursRow),
      price_rules: z.array(rule).max(MAX_RULES),
      deposit: money,
      cleaning_fee: money,
      pet_fee: money,
      gst_enabled: z.boolean(),
      blocked_dates: z.array(z.string()),
    })
    .superRefine(runChecks(t, PRICING_CHECKS));
};

export type VenuePricingSchema = ReturnType<typeof buildVenuePricingSchema>;
