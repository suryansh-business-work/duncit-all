/**
 * Every user-facing string the Create-a-Pod Step-4 pricing guards render.
 * Byte-identical to the mWeb twin's pricingCopy.ts (rule 27) — change both or
 * neither.
 *
 * TODO(i18n): move these to the Localization bundle (`mweb.createPod.step4.*`)
 * and read them through the shared `t()` once the Step-4 keys are seeded.
 */

/** Zero-earnings info box, shown under the Ticket Price field. */
export const ZERO_EARNINGS_TITLE = 'No Earnings Generated';
export const ZERO_EARNINGS_BODY =
  'Based on the current Ticket Price, your estimated earnings are ₹0 after applicable deductions. Please increase the Ticket Price to earn from this Pod.';

/** Shown inside the Venue Charges accordion when the pod cannot pay the slot. */
export const VENUE_SHORTFALL_MESSAGE =
  'Your venue price is greater than the total Pod value. Please increase the Ticket Price so that the total Pod value is equal to or greater than the Venue Price.';

/** The "Suggested Price" link beside the Ticket Price label, and its modal. */
export const SUGGESTED_PRICES_LINK = 'Suggested Price';
export const SUGGESTED_PRICES_TITLE = 'Suggested Ticket Prices';
export const SUGGESTED_PRICES_PRICE_COLUMN = 'Suggested Price';
export const SUGGESTED_PRICES_PAYOUT_COLUMN = 'What You Get';
export const SUGGESTED_PRICES_CLOSE = 'Close';
export const SUGGESTED_PRICES_EMPTY =
  'Set the number of spots first — suggestions need the pod size to project your earnings.';
export const SUGGESTED_PRICES_ERROR = 'Could not load suggested prices. Please try again.';

/**
 * One description per suggested tier, in ladder order (cheapest first). The
 * server returns at most 5 rows, so index i always has a description.
 */
export const SUGGESTED_PRICE_TIERS = [
  'Most affordable — the easiest price to fill every spot.',
  'Balanced — a good mix of participation and earnings.',
  'Better earnings — still comfortable for most guests.',
  'Premium — fewer but more committed guests.',
  'Best for high-value pods and exclusive experiences.',
] as const;

/** The tier line for a ladder row. The server caps the ladder at 5 rows, so a
 * higher index only happens if that cap ever moves — it degrades to no line. */
export function tierDescription(index: number): string {
  return SUGGESTED_PRICE_TIERS[index] ?? '';
}

/** The highlighted recommendation under the suggestions table. */
export const SUGGESTED_PRICES_NOTE =
  'Choose an optimal ticket price for your Pod to maximize both participation and revenue.';
