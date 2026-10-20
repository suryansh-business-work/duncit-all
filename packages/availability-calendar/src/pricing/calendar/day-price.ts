import { DATE_OVERRIDE_RULE, dayRate, priceRuleMatches, weekdayOfDay } from '@duncit/utils';
import { closedReasonLabel, rateLabel, ruleValueLabel, rupees } from '../format';
import type { BookingDay, PricingRule, Translate, VenuePricingData } from '../types';

export interface DayPrice {
  /** "₹360 / guest", "from ₹500", "Blocked", … */
  text: string;
  /** The adjustment that applies that day, e.g. "+20%" — null when none. */
  adjustment: string | null;
  /** A date override is set for exactly this day. */
  override: boolean;
  closed: boolean;
}

/** The rules that price a day, by the server's stacking rule: an override wins outright. */
export function rulesOn(rules: readonly PricingRule[], ymd: string): { rules: PricingRule[]; override: boolean } {
  const weekday = weekdayOfDay(ymd);
  const matching = rules.filter((rule) => priceRuleMatches(rule, ymd, weekday));
  const overrides = matching.filter((rule) => rule.type === DATE_OVERRIDE_RULE);
  return overrides.length > 0 ? { rules: overrides, override: true } : { rules: matching, override: false };
}

/**
 * What a calendar day shows at a glance: the day's rate after its rules
 * (`dayRate`, the same figure the native calendar shows) or a per-slot
 * venue's cheapest slot, and which adjustment applies. A booking's price is
 * only ever the server's — the drawer asks `venuePriceQuote` for it.
 */
export function dayPrice(t: Translate, pricing: VenuePricingData, day: BookingDay | undefined, ymd: string): DayPrice | null {
  if (!pricing.model) return null;
  if (day?.closed_reason) {
    return { text: closedReasonLabel(t, day.closed_reason), adjustment: null, override: false, closed: true };
  }
  const { rules, override } = rulesOn(pricing.price_rules, ymd);
  const single = rules.length === 1 ? ruleValueLabel(rules[0].mode, rules[0].value) : null;
  const adjustment = rules.length > 1 ? t('venuePricing.calendar.adjusted') : single;
  if (pricing.model === 'PER_SLOT') {
    const prices = (day?.slots ?? []).map((s) => s.price);
    if (prices.length === 0) return { text: t('venuePricing.calendar.noSlots'), adjustment: null, override, closed: true };
    // The slots' own prices, before the day's rules — the adjustment is named beside them.
    const text = t('venuePricing.calendar.from', { vars: { price: rupees(Math.min(...prices)) } });
    return { text, adjustment, override, closed: false };
  }
  const rate = dayRate(pricing.base_rate, pricing.price_rules, ymd);
  return { text: rateLabel(t, pricing.model, rate), adjustment, override, closed: false };
}
