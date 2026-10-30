import { round2 } from './checkout-bill';

/**
 * Smart Incentive — the ONE client copy of the rules.
 *
 * A host may offer members who stay on the pod page without booking a one-time
 * percentage off the pod's TICKET money. Staying long enough unlocks it for that
 * member (the popup); checkout then takes it off on its own, after the
 * multi-ticket discount and before the coupon, Duncit Coins and GST — so the
 * two pod discounts compound rather than add, and add-on products are never
 * discounted.
 *
 * The server imports no `@duncit/*` package, so it keeps its own twin in
 * server/src/modules/engagement/smartIncentive/smartIncentive.rules.ts — that
 * copy prices the charge and freezes it on the Payment; this one only previews
 * it. Change the rules in both, or the screen promises a total the buyer is
 * never charged.
 */

/** Loyalty's `max_discount_pct` default, used only while the settings load. */
export const DEFAULT_SMART_INCENTIVE_MAX_PCT = 20;

/** Loyalty's `delay_seconds` default, used only while the settings load. */
export const DEFAULT_SMART_INCENTIVE_DELAY_SECONDS = 15;

/** What an unlocked offer takes off one booking. */
export interface SmartIncentiveQuote {
  /** The offer's percentage; 0 when nothing applies. */
  pct: number;
  /** Rupees off the ticket money. */
  amount: number;
  /** The ticket money left to pay. */
  net: number;
}

/**
 * `ticketNet` is the booking's ticket money AFTER the multi-ticket discount
 * (`ticketDiscountFor(...).net`); `pct` is the member's unlocked offer, or
 * null/0 when they have none. Mirrors the server's `smartIncentiveFor`.
 */
export function smartIncentiveFor(ticketNet: number, pct: number | null | undefined): SmartIncentiveQuote {
  const base = round2(Math.max(0, Number(ticketNet) || 0));
  const offer = Number(pct);
  if (!Number.isInteger(offer) || offer <= 0 || base <= 0) return { pct: 0, amount: 0, net: base };
  const amount = round2((base * offer) / 100);
  return { pct: offer, amount, net: round2(base - amount) };
}

/** Why a host's typed discount cannot be saved. */
export type SmartIncentivePctIssue = 'REQUIRED' | 'PCT_MIN' | 'PCT_MAX';

/**
 * What is wrong with the discount a host typed, or null when it can be saved.
 * Only asked while the switch is on — a switched-off incentive stores nothing.
 */
export function smartIncentivePctIssue(value: unknown, maxPct: number): SmartIncentivePctIssue | null {
  const text = String(value ?? '').trim();
  if (text === '') return 'REQUIRED';
  const pct = Number(text);
  if (!Number.isInteger(pct) || pct < 1) return 'PCT_MIN';
  return pct > maxPct ? 'PCT_MAX' : null;
}

/** The form fields both Create Pod forms and both Edit Pod sheets hold — the percentage as typed. */
export interface SmartIncentiveValues {
  smart_incentive_enabled: boolean;
  smart_incentive_pct: string;
}

/** Input builder: a free pod or a switched-off incentive sends it off at 0%; otherwise the typed % as a number. */
export function smartIncentiveInput(
  values: SmartIncentiveValues,
  free: boolean,
): { smart_incentive_enabled: boolean; smart_incentive_pct: number } {
  if (free || !values.smart_incentive_enabled) {
    return { smart_incentive_enabled: false, smart_incentive_pct: 0 };
  }
  return { smart_incentive_enabled: true, smart_incentive_pct: Number(values.smart_incentive_pct) };
}

/** A pod's stored incentive as the form holds it — off reads as an empty percentage. */
export function smartIncentiveFormValues(pod: {
  smart_incentive_enabled?: boolean | null;
  smart_incentive_pct?: number | null;
}): SmartIncentiveValues {
  const enabled = !!pod.smart_incentive_enabled && Number(pod.smart_incentive_pct) > 0;
  return { smart_incentive_enabled: enabled, smart_incentive_pct: enabled ? String(pod.smart_incentive_pct) : '' };
}
