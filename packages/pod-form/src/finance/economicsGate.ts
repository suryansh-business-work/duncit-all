import type { PodViabilityCopyKeys } from '@duncit/utils';
import type { PodFormValues } from '../types';

/**
 * The fields that move a pod's money as the server's economics guard reads an
 * edit: the price, the type, the size, who hosts it (the host's commission
 * prices the waterfall) and the booking (mode, venue, slot or offer). An edit
 * that leaves all of them as loaded is not judged, so a title fix on an old
 * pod is never held back by its numbers.
 */
export const ECONOMICS_FIELDS = [
  'pod_amount',
  'no_of_spots',
  'pod_type',
  'pod_hosts_id',
  'pod_mode',
  'venue_id',
  'venue_slot_id',
  'venue_offer_model',
  'venue_offer_rate',
] as const satisfies readonly (keyof PodFormValues)[];

export type EconomicsField = (typeof ECONOMICS_FIELDS)[number];

const NUMERIC: ReadonlySet<EconomicsField> = new Set<EconomicsField>(['pod_amount', 'no_of_spots']);

/** A value as the comparison reads it: amounts by value, a host list by its ids in order, the rest as text. */
function comparable(field: EconomicsField, value: unknown): string {
  if (NUMERIC.has(field)) return String(Number(value) || 0);
  if (Array.isArray(value)) return value.map(String).join(',');
  return value === null || value === undefined ? '' : String(value);
}

/** Whether an edit changed any field the economics guard judges, against the values the form was loaded with. */
export function economicsTouched(
  initial: Readonly<Partial<Record<EconomicsField, unknown>>> | undefined,
  current: Readonly<Partial<Record<EconomicsField, unknown>>>
): boolean {
  return ECONOMICS_FIELDS.some((field) => comparable(field, initial?.[field]) !== comparable(field, current[field]));
}

/** What decides whether Save waits on the server's verdict. */
export interface EconomicsGateInput {
  /** The form shows the earnings projection (Admin) and is not an Auto Pod template. */
  enabled: boolean;
  isFree: boolean;
  podAmount: number;
  /** Editing an existing pod rather than creating one. */
  editing: boolean;
  /** The pod is completed or cancelled: the server never judges its money. */
  podClosed: boolean;
  /** An edit changed a field the guard judges (`economicsTouched`). */
  touched: boolean;
}

/**
 * Whether Save waits on a fresh projection that says viable: a PAID pod with a
 * price, on create, or on an edit that changed its money — never a free pod, a
 * completed or cancelled one, or a form that draws no projection.
 */
export function economicsJudged(input: Readonly<EconomicsGateInput>): boolean {
  if (!input.enabled || input.isFree || input.podAmount <= 0 || input.podClosed) return false;
  return !input.editing || input.touched;
}

/** The pod form's words for each reason (`podForm.priceBreakdown.viability.*`); a ₹0 payout with no working price reuses `zeroEarnings`. */
export const POD_FORM_VIABILITY_KEYS: PodViabilityCopyKeys = {
  title: {
    BELOW_MIN_BUSINESS: 'podForm.priceBreakdown.viability.belowMinBusinessTitle',
    VENUE_NOT_COVERED: 'podForm.priceBreakdown.viability.venueNotCoveredTitle',
    NO_EARNINGS: 'podForm.priceBreakdown.viability.noEarningsTitle',
  },
  withPrice: {
    BELOW_MIN_BUSINESS: 'podForm.priceBreakdown.viability.belowMinBusiness',
    VENUE_NOT_COVERED: 'podForm.priceBreakdown.viability.venueNotCovered',
    NO_EARNINGS: 'podForm.priceBreakdown.viability.noEarnings',
  },
  withoutPrice: {
    BELOW_MIN_BUSINESS: 'podForm.priceBreakdown.viability.belowMinBusinessNoPrice',
    VENUE_NOT_COVERED: 'podForm.priceBreakdown.viability.venueNotCoveredNoPrice',
    NO_EARNINGS: 'podForm.priceBreakdown.zeroEarnings',
  },
};
