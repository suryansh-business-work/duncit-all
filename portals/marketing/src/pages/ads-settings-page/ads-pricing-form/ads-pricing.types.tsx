import { z } from 'zod';
import { AD_POSITIONS, type AdPricingPriceField } from '../../../lib/ad-positions';

/** What one placement is called on the public rate card, and its description. */
export interface AdPlacementCopy {
  position: string;
  label: string;
  note: string;
}

/**
 * Server `AdPricing` shape — 9 per-day prices, the currency symbol, the booking
 * window and the public copy for each placement.
 *
 * The last two used to be constants in the server and a table in the marketing
 * site's own config, which meant the slider's limits and the words beside each
 * price could only be changed by a deploy — and, for a while, disagreed.
 */
export type AdPricing = Record<AdPricingPriceField, number> & {
  currency_symbol: string;
  min_days: number;
  max_days: number;
  placements: AdPlacementCopy[];
};

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

/**
 * A whole number of days, as text.
 *
 * The two ends are checked against each other by the object refinement below
 * rather than field by field: "maximum below minimum" is a relationship, and
 * saying it on one field alone would blame whichever one was typed second.
 */
const dayText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} days is required`)
    .refine((v) => Number.isInteger(Number(v)), { message: `${label} days must be a whole number` })
    .refine((v) => !Number.isInteger(Number(v)) || Number(v) >= 1, {
      message: `${label} days must be at least 1`,
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
  min_days: dayText('Minimum'),
  max_days: dayText('Maximum'),
  /** One row per placement, in AD_POSITIONS order. Blank restores the default. */
  placements: z.array(
    z.object({
      position: z.string(),
      label: z.string().trim().max(80, 'Name must be at most 80 characters'),
      note: z.string().trim().max(240, 'Description must be at most 240 characters'),
    }),
  ),
}).refine((v) => Number(v.max_days) >= Number(v.min_days), {
  message: 'Maximum days cannot be shorter than minimum days',
  path: ['max_days'],
});

export type AdsPricingFormValues = z.infer<typeof adsPricingSchema>;

/** Server pricing → form values (numbers stringified for the text fields). */
export function fromAdPricing(pricing: AdPricing): AdsPricingFormValues {
  const prices = Object.fromEntries(
    AD_POSITIONS.map((p) => [p.priceField, String(pricing[p.priceField] ?? 0)]),
  );
  const byPosition = new Map((pricing.placements ?? []).map((row) => [row.position, row]));
  return {
    ...prices,
    currency_symbol: pricing.currency_symbol,
    min_days: String(pricing.min_days ?? 1),
    max_days: String(pricing.max_days ?? 30),
    // Always all nine, in the order the rate card renders them — the server
    // resolves its defaults into what it returns, so an untouched placement
    // arrives with the shipped name rather than an empty box.
    placements: AD_POSITIONS.map((p) => ({
      position: p.position,
      label: byPosition.get(p.position)?.label ?? '',
      note: byPosition.get(p.position)?.note ?? '',
    })),
  } as AdsPricingFormValues;
}

/** Validated form values → AdPricing (prices and days back to numbers). */
export function toUpdateAdPricingInput(values: AdsPricingFormValues): AdPricing {
  const cast = adsPricingSchema.parse(values);
  const prices = Object.fromEntries(AD_POSITIONS.map((p) => [p.priceField, Number(cast[p.priceField])]));
  return {
    ...prices,
    currency_symbol: cast.currency_symbol,
    min_days: Number(cast.min_days),
    max_days: Number(cast.max_days),
    placements: cast.placements,
  } as AdPricing;
}

export interface AdsPricingFormProps {
  initialValues: AdsPricingFormValues;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AdsPricingFormValues) => Promise<void> | void;
}
