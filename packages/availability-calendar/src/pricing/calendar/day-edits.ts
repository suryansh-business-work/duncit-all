import { dateOverrideOn, withDateOverride, withoutDateOverride } from '@duncit/utils';
import type { PriceRuleMode, PricingRule, VenuePricingData, VenuePricingInput } from '../types';
import { savedPricingInput } from '../form/venue-pricing.types';

/**
 * The saved pricing with ONE date's override set (or cleared when `next` is
 * null). An override that also covers other dates keeps them: only this day
 * moves to its own rule, so editing one date never changes another. The rule
 * arithmetic is @duncit/utils' — the native screen edits a date the same way.
 */
export function pricingWithOverride(
  pricing: VenuePricingData,
  ymd: string,
  next: { mode: PriceRuleMode; value: number; label: string } | null,
): VenuePricingInput {
  const override: PricingRule | null = next
    ? { type: 'DATE_OVERRIDE', label: next.label, dates: [ymd], days: [], from: null, to: null, mode: next.mode, value: next.value }
    : null;
  const rules = override
    ? withDateOverride(pricing.price_rules, ymd, override)
    : withoutDateOverride(pricing.price_rules, ymd);
  return savedPricingInput({ ...pricing, price_rules: rules });
}

/** A day list with `ymd` in it or not, sorted, never duplicated. */
function withDay(days: readonly string[], ymd: string, present: boolean): string[] {
  const rest = days.filter((d) => d !== ymd);
  return present ? [...rest, ymd].sort((a, b) => a.localeCompare(b)) : rest;
}

/** The saved pricing with `ymd` blocked or unblocked. */
export function pricingWithBlocked(pricing: VenuePricingData, ymd: string, blocked: boolean): VenuePricingInput {
  return savedPricingInput({ ...pricing, blocked_dates: withDay(pricing.blocked_dates, ymd, blocked) });
}

/** The venue's holiday list with `ymd` added or removed. */
export function holidaysWith(holidays: readonly string[], ymd: string, holiday: boolean): string[] {
  return withDay(holidays, ymd, holiday);
}

/** The override set for exactly this date, if any. */
export function overrideOn(pricing: VenuePricingData, ymd: string): PricingRule | null {
  return dateOverrideOn(pricing.price_rules, ymd) ?? null;
}
