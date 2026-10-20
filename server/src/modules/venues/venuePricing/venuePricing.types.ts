/**
 * A venue's own pricing, set once in the Venue Pricing Module. Hosts book it
 * instantly; nothing here is negotiated per booking. Every amount is rupees.
 */

export const VENUE_PRICING_MODELS = ['PER_PAX', 'PER_SLOT', 'PER_HOUR', 'FLAT'] as const;
export type VenuePricingModel = (typeof VENUE_PRICING_MODELS)[number];

export const PRICE_RULE_TYPES = ['WEEKDAY_SURCHARGE', 'DATE_OVERRIDE', 'DATE_RANGE'] as const;
export type PriceRuleType = (typeof PRICE_RULE_TYPES)[number];

export const PRICE_RULE_MODES = ['PERCENT', 'FLAT'] as const;
export type PriceRuleMode = (typeof PRICE_RULE_MODES)[number];

/** One bookable window of a PER_SLOT venue, repeated on the listed weekdays (0 = Sunday). */
export interface PricingSlot {
  start_time: string;
  end_time: string;
  price: number;
  days_of_week: number[];
}

/** Opening hours of one weekday (0 = Sunday). A weekday with no row is closed. */
export interface DayHours {
  day: number;
  open: string;
  close: string;
}

/**
 * A price adjustment. WEEKDAY_SURCHARGE matches `days`, DATE_OVERRIDE matches
 * `dates`, DATE_RANGE matches `from`..`to` (inclusive, 'YYYY-MM-DD').
 * `value` is a percent of the base or a flat rupee amount; negative = discount.
 */
export interface PriceRule {
  type: PriceRuleType;
  label?: string | null;
  days?: number[] | null;
  dates?: string[] | null;
  from?: string | null;
  to?: string | null;
  mode: PriceRuleMode;
  value: number;
}

export interface VenuePricing {
  model: VenuePricingModel | null;
  base_rate: number;
  min_pax: number;
  max_pax: number;
  min_hours: number;
  max_hours: number;
  booking_increment_minutes: number;
  min_spend: number;
  slots: PricingSlot[];
  operating_hours: DayHours[];
  price_rules: PriceRule[];
  /** Refundable, collected by the venue at the door — never part of the payout. */
  deposit: number;
  cleaning_fee: number;
  pet_fee: number;
  gst_enabled: boolean;
  /** Whole days the venue does not take bookings ('YYYY-MM-DD'). */
  blocked_dates: string[];
}

/** A rule that changed this booking's price, as it is frozen in the snapshot. */
export interface AppliedRule {
  type: PriceRuleType;
  label: string;
  mode: PriceRuleMode;
  value: number;
  amount: number;
}

/** Everything a booking's price was built from. Frozen on the booking at confirmation. */
export interface VenuePriceBreakdown {
  model: VenuePricingModel;
  rate: number;
  pax: number;
  hours: number;
  /** Local day of the booking, 'YYYY-MM-DD', in the platform time zone. */
  date: string;
  base: number;
  rules: AppliedRule[];
  rules_total: number;
  /** Added when the booking falls short of the venue's minimum spend. */
  min_spend_top_up: number;
  cleaning_fee: number;
  pet_fee: number;
  /** What the venue set: base + rules + top-up + fees. */
  venue_price: number;
  gst_pct: number;
  taxes: number;
  /** venue_price + taxes — exactly what the venue is paid. */
  venue_payout: number;
  platform_fee_pct: number;
  /** Duncit's venue commission, charged ON TOP of the venue price (host's share bears it). */
  platform_fee: number;
  /** venue_payout + platform_fee — the booking's whole cost to the pod. */
  total: number;
  /** Payable at the venue and refundable; shown, never settled through Duncit. */
  deposit: number;
}

export type QuoteErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_WINDOW'
  | 'PAX_OUT_OF_RANGE'
  | 'HOURS_OUT_OF_RANGE'
  | 'INCREMENT_MISMATCH'
  | 'NO_SUCH_SLOT';

export type QuoteResult =
  | { ok: true; breakdown: VenuePriceBreakdown }
  | { ok: false; code: QuoteErrorCode; message: string };

export interface QuoteRequest {
  start: Date;
  end: Date;
  pax: number;
  pets?: boolean;
  /** Duncit's venue commission percent (on top). */
  commissionPct: number;
  /** GST percent applied to the venue price when the venue charges GST. */
  gstPct: number;
  timeZone: string;
}
