import type { z } from 'zod';
import type { VenuePricingSchema } from './venue-pricing.schema';
import type { PricingRule, VenuePricingData, VenuePricingInput } from '../types';

/** What the Venue Pricing Module form holds — the schema's own shape. */
export type VenuePricingFormValues = z.infer<VenuePricingSchema>;
export type PricingRuleValues = VenuePricingFormValues['price_rules'][number];
export type PricingSlotValues = VenuePricingFormValues['slots'][number];

const WEEK = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '21:00';

export const blankRule = (type: PricingRuleValues['type']): PricingRuleValues => ({
  type,
  label: '',
  mode: 'PERCENT',
  value: 10,
  days: [],
  dates: [],
  from: '',
  to: '',
});

export const blankSlot = (): PricingSlotValues => ({
  start_time: '10:00',
  end_time: '12:00',
  price: 0,
  days_of_week: [...WEEK],
});

function ruleValues(rule: PricingRule): PricingRuleValues {
  return {
    type: rule.type,
    label: rule.label ?? '',
    mode: rule.mode,
    value: rule.value,
    days: rule.days ?? [],
    dates: rule.dates ?? [],
    from: rule.from ?? '',
    to: rule.to ?? '',
  };
}

/** A slot as `PricingSlotInput` takes it — only its own fields, never the
 * `__typename` a slot read back from the server carries. */
export function slotValues(s: Readonly<PricingSlotValues>): PricingSlotValues {
  return { start_time: s.start_time, end_time: s.end_time, price: s.price, days_of_week: [...s.days_of_week] };
}

/** The saved pricing as form values; an unconfigured venue starts on per-guest pricing. */
export function toFormValues(p: VenuePricingData | null | undefined): VenuePricingFormValues {
  const hours = p?.operating_hours ?? [];
  return {
    model: p?.model ?? 'PER_PAX',
    base_rate: p?.base_rate ?? 0,
    min_pax: p?.min_pax ?? 1,
    max_pax: p?.max_pax ?? 0,
    min_hours: p?.min_hours ?? 1,
    max_hours: p?.max_hours ?? 0,
    booking_increment_minutes: p?.booking_increment_minutes ?? 60,
    min_spend: p?.min_spend ?? 0,
    slots: (p?.slots ?? []).map(slotValues),
    // An empty list means "the venue's usual hours" on the server.
    custom_hours: hours.length > 0,
    operating_hours: WEEK.map((day) => {
      const row = hours.find((h) => h.day === day);
      return { day, enabled: hours.length === 0 || !!row, open: row?.open ?? DEFAULT_OPEN, close: row?.close ?? DEFAULT_CLOSE };
    }),
    price_rules: (p?.price_rules ?? []).map(ruleValues),
    deposit: p?.deposit ?? 0,
    cleaning_fee: p?.cleaning_fee ?? 0,
    pet_fee: p?.pet_fee ?? 0,
    gst_enabled: p?.gst_enabled ?? false,
    blocked_dates: p?.blocked_dates ?? [],
  };
}

/** A rule as the server takes it — only the fields its type reads. */
export function toRuleInput(r: PricingRuleValues) {
  return {
    type: r.type,
    label: r.label.trim() || null,
    mode: r.mode,
    value: r.value,
    days: r.type === 'WEEKDAY_SURCHARGE' ? r.days : [],
    dates: r.type === 'DATE_OVERRIDE' ? r.dates : [],
    from: r.type === 'DATE_RANGE' ? r.from : null,
    to: r.type === 'DATE_RANGE' ? r.to : null,
  };
}

/** The form as `VenuePricingInput` — what the save and the live preview's `draft` send. */
export function toPricingInput(v: VenuePricingFormValues): VenuePricingInput {
  return {
    model: v.model,
    base_rate: v.model === 'PER_SLOT' ? 0 : v.base_rate,
    min_pax: v.min_pax,
    max_pax: v.max_pax,
    min_hours: v.min_hours,
    max_hours: v.max_hours,
    booking_increment_minutes: v.booking_increment_minutes,
    min_spend: v.min_spend,
    slots: v.model === 'PER_SLOT' ? v.slots.map(slotValues) : [],
    operating_hours: v.custom_hours
      ? v.operating_hours.filter((h) => h.enabled).map(({ day, open, close }) => ({ day, open, close }))
      : [],
    price_rules: v.price_rules.map(toRuleInput),
    deposit: v.deposit,
    cleaning_fee: v.cleaning_fee,
    pet_fee: v.pet_fee,
    gst_enabled: v.gst_enabled,
    blocked_dates: v.blocked_dates,
  };
}

/** The SAVED pricing as an input — the calendar's one-date edits change it and send it whole. */
export function savedPricingInput(p: VenuePricingData): VenuePricingInput {
  return { ...toPricingInput(toFormValues(p)), model: p.model ?? null };
}
