import type { PriceBreakdown, VenuePricingData } from '../src/pricing/types';

/** Saved pricing with sane defaults; pass overrides for the fields a test cares about. */
export function makePricing(over: Partial<VenuePricingData> = {}): VenuePricingData {
  return {
    model: 'PER_PAX',
    configured: true,
    base_rate: 300,
    min_pax: 1,
    max_pax: 0,
    min_hours: 1,
    max_hours: 0,
    booking_increment_minutes: 60,
    min_spend: 0,
    slots: [],
    operating_hours: [],
    price_rules: [],
    deposit: 0,
    cleaning_fee: 0,
    pet_fee: 0,
    gst_enabled: false,
    blocked_dates: [],
    ...over,
  };
}

/** A server quote: 20 guests × ₹300, Duncit's 10% fee on top of the ₹6,000 the venue receives. */
export function makeBreakdown(over: Partial<PriceBreakdown> = {}): PriceBreakdown {
  return {
    model: 'PER_PAX',
    rate: 300,
    pax: 20,
    hours: 2,
    date: '2026-12-02',
    base: 6000,
    rules: [],
    rules_total: 0,
    min_spend_top_up: 0,
    cleaning_fee: 0,
    pet_fee: 0,
    venue_price: 6000,
    gst_pct: 0,
    taxes: 0,
    venue_payout: 6000,
    platform_fee_pct: 10,
    platform_fee: 600,
    total: 6600,
    deposit: 0,
    ...over,
  };
}

/** The same objects as the server sends them — Apollo's cache wants each `__typename`. */
export function pricingResult(p: VenuePricingData) {
  return {
    __typename: 'VenuePricing',
    ...p,
    slots: p.slots.map((s) => ({ __typename: 'PricingSlot', ...s })),
    operating_hours: p.operating_hours.map((h) => ({ __typename: 'DayHours', ...h })),
    price_rules: p.price_rules.map((r) => ({ __typename: 'PriceRule', ...r })),
  };
}

export function breakdownResult(b: PriceBreakdown) {
  return {
    __typename: 'VenuePriceBreakdown',
    ...b,
    rules: b.rules.map((r) => ({ __typename: 'AppliedPriceRule', ...r })),
  };
}
