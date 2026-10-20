import {
  PriceBreakdownView,
  toFormValues,
  toPricingInput,
  type PriceBreakdown,
  type VenuePricingFormValues,
} from '@duncit/availability-calendar';
import { defineDemo } from '../../types';

/** The Venue Pricing Module's price card: every amount is the server quote's. */
export const priceBreakdownDemo = defineDemo<{ breakdown: PriceBreakdown }>({
  id: 'price-breakdown',
  title: 'Venue Pricing Module: how a quote reads',
  note:
    "Every amount is the server's (venuePriceQuote) — the view never prices. Add a rule, raise gst_pct with taxes, or set deposit: each line appears only when it applies. Duncit's fee sits on top of what the venue receives.",
  mock: {
    breakdown: {
      model: 'PER_PAX',
      rate: 300,
      pax: 20,
      hours: 2,
      date: '2026-11-07',
      base: 6000,
      rules: [{ type: 'WEEKDAY_SURCHARGE', label: 'Saturday', mode: 'PERCENT', value: 20, amount: 1200 }],
      rules_total: 1200,
      min_spend_top_up: 0,
      cleaning_fee: 500,
      pet_fee: 0,
      venue_price: 7700,
      gst_pct: 18,
      taxes: 1386,
      venue_payout: 9086,
      platform_fee_pct: 10,
      platform_fee: 770,
      total: 9856,
      deposit: 2000,
    },
  },
  render: (mock) => <PriceBreakdownView breakdown={mock.breakdown} />,
});

/** What the Venue Pricing Module form sends to updateVenuePricing. */
export const pricingInputDemo = defineDemo<{ values: VenuePricingFormValues }>({
  id: 'pricing-input',
  title: 'Venue Pricing Module: what the form sends',
  note:
    "Switch model to PER_SLOT and the rate is dropped; set custom_hours true and only the ticked days are sent. A rule sends only the fields its type reads.",
  mock: { values: { ...toFormValues(null), base_rate: 300 } },
  compute: (mock) => ({ 'toPricingInput(values)': toPricingInput(mock.values) }),
});
