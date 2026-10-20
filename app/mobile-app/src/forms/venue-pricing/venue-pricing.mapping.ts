import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  PriceRuleMode,
  PriceRuleType,
  VenuePricingModel,
  type PriceRuleInput,
  type VenuePricingInput,
} from '@/generated/graphql/graphql';
import type { VenuePricingDocument } from '@/graphql/venue-pricing';
import {
  PRICING_MODELS,
  type DayHoursValues,
  type PricingModelName,
  type PriceRuleValues,
  type RuleModeName,
  type VenuePricingValues,
} from './venue-pricing.types';

/**
 * Between the server's pricing and the form. The server REPLACES the whole
 * pricing on save, so every write sends all of it: the form's fields plus the
 * calendar-owned parts (single-date prices and blocked dates) exactly as last
 * saved — the form never drops what the calendar set, and vice versa.
 *
 * Codegen emits the enums as TS enums while the form holds plain strings, so
 * the two are mapped here at the boundary rather than cast.
 */
export type SavedPricing = ResultOf<typeof VenuePricingDocument>['venuePricing'];
export type SavedRule = SavedPricing['price_rules'][number];

const MODEL_ENUM: Record<PricingModelName, VenuePricingModel> = {
  PER_PAX: VenuePricingModel.PerPax,
  PER_SLOT: VenuePricingModel.PerSlot,
  PER_HOUR: VenuePricingModel.PerHour,
  FLAT: VenuePricingModel.Flat,
};

export const MODE_ENUM: Record<RuleModeName, PriceRuleMode> = {
  PERCENT: PriceRuleMode.Percent,
  FLAT: PriceRuleMode.Flat,
};

const modelName = (model: VenuePricingModel | null | undefined): PricingModelName | '' =>
  PRICING_MODELS.find((name) => MODEL_ENUM[name] === model) ?? '';

const modeName = (mode: PriceRuleMode): RuleModeName =>
  mode === PriceRuleMode.Flat ? 'FLAT' : 'PERCENT';

/** The venue's regular hours — the times a newly opened weekday starts from. */
export interface RegularHours {
  open: string;
  close: string;
}

function hoursValues(saved: SavedPricing, regular: RegularHours): DayHoursValues[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const row = saved.operating_hours.find((hours) => hours.day === day);
    return row
      ? { day, open: true, from: row.open, to: row.close }
      : { day, open: false, from: regular.open, to: regular.close };
  });
}

function ruleValues(saved: SavedPricing): PriceRuleValues[] {
  return saved.price_rules
    .filter((rule) => rule.type !== PriceRuleType.DateOverride)
    .map((rule) => ({
      type: rule.type === PriceRuleType.DateRange ? 'DATE_RANGE' : 'WEEKDAY_SURCHARGE',
      label: rule.label ?? '',
      days: [...(rule.days ?? [])],
      from: rule.from ?? '',
      to: rule.to ?? '',
      mode: modeName(rule.mode),
      value: String(rule.value),
    }));
}

export function toPricingValues(saved: SavedPricing, regular: RegularHours): VenuePricingValues {
  return {
    model: modelName(saved.model),
    base_rate: String(saved.base_rate),
    min_pax: String(saved.min_pax),
    max_pax: String(saved.max_pax),
    min_hours: String(saved.min_hours),
    max_hours: String(saved.max_hours),
    booking_increment_minutes: String(saved.booking_increment_minutes),
    min_spend: String(saved.min_spend),
    deposit: String(saved.deposit),
    cleaning_fee: String(saved.cleaning_fee),
    pet_fee: String(saved.pet_fee),
    gst_enabled: saved.gst_enabled,
    slots: saved.slots.map((slot) => ({
      start_time: slot.start_time,
      end_time: slot.end_time,
      price: String(slot.price),
      days_of_week: [...slot.days_of_week],
    })),
    hours: hoursValues(saved, regular),
    rules: ruleValues(saved),
  };
}

/** A saved rule as an input row — the selection carries no `__typename` to strip. */
export const savedRuleInput = (rule: SavedRule): PriceRuleInput => ({
  type: rule.type,
  label: rule.label ?? '',
  days: rule.days ?? [],
  dates: rule.dates ?? [],
  from: rule.from ?? null,
  to: rule.to ?? null,
  mode: rule.mode,
  value: rule.value,
});

const formRuleInput = (rule: PriceRuleValues): PriceRuleInput => ({
  type: rule.type === 'DATE_RANGE' ? PriceRuleType.DateRange : PriceRuleType.WeekdaySurcharge,
  label: rule.label.trim(),
  days: rule.type === 'WEEKDAY_SURCHARGE' ? rule.days : [],
  dates: [],
  from: rule.type === 'DATE_RANGE' ? rule.from : null,
  to: rule.type === 'DATE_RANGE' ? rule.to : null,
  mode: MODE_ENUM[rule.mode],
  value: Number(rule.value),
});

/** The saved pricing as a full input, with the calendar-owned parts optionally replaced. */
export function savedToInput(
  saved: SavedPricing,
  patch: { price_rules?: PriceRuleInput[]; blocked_dates?: string[] } = {},
): VenuePricingInput {
  return {
    model: saved.model ?? null,
    base_rate: saved.base_rate,
    min_pax: saved.min_pax,
    max_pax: saved.max_pax,
    min_hours: saved.min_hours,
    max_hours: saved.max_hours,
    booking_increment_minutes: saved.booking_increment_minutes,
    min_spend: saved.min_spend,
    slots: saved.slots.map(({ start_time, end_time, price, days_of_week }) => ({
      start_time,
      end_time,
      price,
      days_of_week,
    })),
    operating_hours: saved.operating_hours.map(({ day, open, close }) => ({ day, open, close })),
    price_rules: patch.price_rules ?? saved.price_rules.map(savedRuleInput),
    deposit: saved.deposit,
    cleaning_fee: saved.cleaning_fee,
    pet_fee: saved.pet_fee,
    gst_enabled: saved.gst_enabled,
    blocked_dates: patch.blocked_dates ?? saved.blocked_dates,
  };
}

/** Validated form values → the full input (calendar-owned parts as last saved). */
export function valuesToInput(values: VenuePricingValues, saved: SavedPricing): VenuePricingInput {
  const base = savedToInput(saved);
  const perSlot = values.model === 'PER_SLOT';
  return {
    ...base,
    model: values.model ? MODEL_ENUM[values.model] : null,
    base_rate: Number(values.base_rate),
    min_pax: Number(values.min_pax),
    max_pax: Number(values.max_pax),
    min_hours: Number(values.min_hours),
    max_hours: Number(values.max_hours),
    booking_increment_minutes: Number(values.booking_increment_minutes),
    min_spend: Number(values.min_spend),
    deposit: Number(values.deposit),
    cleaning_fee: Number(values.cleaning_fee),
    pet_fee: Number(values.pet_fee),
    gst_enabled: values.gst_enabled,
    // A hidden slot list (another model) goes back exactly as the server last accepted it.
    slots: perSlot
      ? values.slots.map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
          price: Number(slot.price),
          days_of_week: slot.days_of_week,
        }))
      : base.slots,
    operating_hours: values.hours
      .filter((row) => row.open)
      .map((row) => ({ day: row.day, open: row.from, close: row.to })),
    price_rules: [
      ...values.rules.map(formRuleInput),
      ...saved.price_rules
        .filter((rule) => rule.type === PriceRuleType.DateOverride)
        .map(savedRuleInput),
    ],
  };
}
