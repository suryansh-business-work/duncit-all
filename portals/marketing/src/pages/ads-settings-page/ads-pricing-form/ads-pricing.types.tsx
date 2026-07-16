import { z } from 'zod';
import { AD_POSITIONS, type AdPricingPriceField } from '../../../lib/ad-positions';

/** Server `AdPricing` shape — 9 per-day prices + the currency symbol. */
export type AdPricing = Record<AdPricingPriceField, number> & { currency_symbol: string };

/** Mutation input shape (all numeric prices, validated ≥ 0). */
export type UpdateAdPricingInput = AdPricing;

/**
 * Prices are kept as text in the form (RHF + MUI number TextField) and converted
 * on submit; the schema rejects empties, non-numbers and negatives per field.
 */
const priceText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} price is required`)
    .refine((v) => Number.isFinite(Number(v)), { message: `${label} price must be a number` })
    .refine((v) => !Number.isFinite(Number(v)) || Number(v) >= 0, {
      message: `${label} price cannot be negative`,
    });

export const adsPricingSchema = z.object({
  auto_per_day: priceText('Auto'),
  home_bottom_per_day: priceText('Home Bottom'),
  sidebar_per_day: priceText('Sidebar'),
  explore_scroll_per_day: priceText('Explore Scroll'),
  status_per_day: priceText('Status'),
  venue_list_per_day: priceText('Venue List'),
  club_list_per_day: priceText('Club List'),
  pod_list_per_day: priceText('Pod List'),
  pod_details_per_day: priceText('Pod Details'),
  currency_symbol: z
    .string()
    .trim()
    .min(1, 'Currency symbol is required')
    .max(4, 'Currency symbol must be at most 4 characters'),
});

export type AdsPricingFormValues = z.infer<typeof adsPricingSchema>;

/** Server pricing → form values (numbers stringified for the text fields). */
export function fromAdPricing(pricing: AdPricing): AdsPricingFormValues {
  const prices = Object.fromEntries(
    AD_POSITIONS.map((p) => [p.priceField, String(pricing[p.priceField] ?? 0)]),
  );
  return { ...prices, currency_symbol: pricing.currency_symbol } as AdsPricingFormValues;
}

/** Validated form values → UpdateAdPricingInput (prices back to numbers). */
export function toUpdateAdPricingInput(values: AdsPricingFormValues): UpdateAdPricingInput {
  const cast = adsPricingSchema.parse(values);
  const prices = Object.fromEntries(AD_POSITIONS.map((p) => [p.priceField, Number(cast[p.priceField])]));
  return { ...prices, currency_symbol: cast.currency_symbol } as UpdateAdPricingInput;
}

export interface AdsPricingFormProps {
  initialValues: AdsPricingFormValues;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AdsPricingFormValues) => Promise<void> | void;
}
