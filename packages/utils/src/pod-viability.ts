/**
 * Whether a PAID pod's money works, as the server's create and edit guard
 * judges it, and what the person writing the pod is told when it does not.
 *
 * The server owns the verdict. `PodEarningsProjection.viable` is the rule
 * `assertViablePodEconomics` throws on, judged with every spot filled (the
 * host's own seat is free, so N spots are N − 1 paying seats):
 *   1. BELOW_MIN_BUSINESS: the ticket money minus Duncit's venue commission is
 *      not MORE than the venue's minimum business (Partners › Fees & Minimum
 *      Spend);
 *   2. VENUE_NOT_COVERED: the ticket money is less than the venue costs;
 *   3. NO_EARNINGS: after GST, the platform fee, the club admin's cut, the
 *      venue and the commissions the host earns ₹0 or less.
 * Nothing here computes any of that. It says when a submit may be enabled and
 * picks the copy, so mWeb, the app and the pod form agree (rules 27 + 56).
 */

/** `PodEarningsProjection.viability_reason`, in the order a host fixes them. */
export type PodViabilityReason = 'BELOW_MIN_BUSINESS' | 'VENUE_NOT_COVERED' | 'NO_EARNINGS';

export const POD_VIABILITY_REASONS: readonly PodViabilityReason[] = ['BELOW_MIN_BUSINESS', 'VENUE_NOT_COVERED', 'NO_EARNINGS'];

/** The verdict a projection carries (`potentialPodEarnings`, `adminPotentialPodEarnings`). */
export interface PodViabilityVerdict {
  viable: boolean;
  viability_reason?: string | null;
  minimum_viable_ticket_price?: number | null;
  venue_min_business?: number | null;
}

/**
 * Whether a pod's submit stays disabled. Never for a free pod: it has no money
 * to judge. A paid pod waits for a projection answered for exactly the inputs
 * on screen (`fresh`) that says it is viable, so a request still loading, a
 * debounce still running, a failed request or no projection at all keep it
 * disabled.
 */
export function paidPodSubmitBlocked(
  isFree: boolean,
  fresh: boolean,
  verdict: Pick<PodViabilityVerdict, 'viable'> | null | undefined
): boolean {
  if (isFree) return false;
  return !(fresh && verdict?.viable === true);
}

/** The reason as this build knows it. One a newer server adds still refuses the pod, so it reads as NO_EARNINGS. */
export function podViabilityReasonOf(reason: string | null | undefined): PodViabilityReason {
  return POD_VIABILITY_REASONS.find((known) => known === reason) ?? 'NO_EARNINGS';
}

/** The keys a surface words each reason with: literal keys from its own bundle. */
export interface PodViabilityCopyKeys {
  title: Readonly<Record<PodViabilityReason, string>>;
  /** Names the lowest ticket price that works (`{price}`); BELOW_MIN_BUSINESS also names `{minimum}`. */
  withPrice: Readonly<Record<PodViabilityReason, string>>;
  /** No ticket price up to the server's cap works; BELOW_MIN_BUSINESS still names `{minimum}`. */
  withoutPrice: Readonly<Record<PodViabilityReason, string>>;
}

export interface PodViabilityNotice {
  reason: PodViabilityReason;
  title: string;
  body: string;
}

type ViabilityTranslate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/**
 * What to tell the author about a projection that is not viable: the reason's
 * title, and a body naming the venue's minimum business and the lowest whole
 * ticket price that works when the server found one. Null when the projection
 * is viable, or there is none. `money` is the surface's formatter.
 */
export function podViabilityNotice(
  verdict: Readonly<PodViabilityVerdict> | null | undefined,
  keys: Readonly<PodViabilityCopyKeys>,
  t: ViabilityTranslate,
  money: (rupees: number) => string
): PodViabilityNotice | null {
  if (!verdict || verdict.viable) return null;
  const reason = podViabilityReasonOf(verdict.viability_reason);
  const price = Number(verdict.minimum_viable_ticket_price);
  const priced = verdict.minimum_viable_ticket_price != null && Number.isFinite(price) && price > 0;
  const vars = {
    minimum: money(Math.max(0, Number(verdict.venue_min_business) || 0)),
    price: priced ? money(price) : '',
  };
  const bodyKey = priced ? keys.withPrice[reason] : keys.withoutPrice[reason];
  return { reason, title: t(keys.title[reason]), body: t(bodyKey, { vars }) };
}

/** How mWeb and the app word it. They share one bundle (`mweb.createPod.*`), so one map. */
export const MWEB_POD_VIABILITY_KEYS: PodViabilityCopyKeys = {
  title: {
    BELOW_MIN_BUSINESS: 'mweb.createPod.viability.belowMinBusinessTitle',
    VENUE_NOT_COVERED: 'mweb.createPod.viability.venueNotCoveredTitle',
    NO_EARNINGS: 'mweb.createPod.zeroEarningsTitle',
  },
  withPrice: {
    BELOW_MIN_BUSINESS: 'mweb.createPod.viability.belowMinBusiness',
    VENUE_NOT_COVERED: 'mweb.createPod.viability.venueNotCovered',
    NO_EARNINGS: 'mweb.createPod.viability.noEarnings',
  },
  withoutPrice: {
    BELOW_MIN_BUSINESS: 'mweb.createPod.viability.belowMinBusinessNoPrice',
    VENUE_NOT_COVERED: 'mweb.createPod.venueShortfall',
    NO_EARNINGS: 'mweb.createPod.zeroEarningsBody',
  },
};
