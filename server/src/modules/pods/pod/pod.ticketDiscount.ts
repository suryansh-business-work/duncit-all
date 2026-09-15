/**
 * Multi-ticket booking discount — the server's one copy of the rules.
 *
 * A pod may give a booking of several seats a percentage off its TICKET money
 * (never its add-on products): the best tier is the one with the largest
 * `min_tickets` the booking reaches. A single ticket always pays full price, so
 * that base row is implied and never stored.
 *
 * Server twin of packages/utils/src/pod-ticket-discount.ts — the server imports
 * no @duncit/* package, so the pricing and the write-time validation live here
 * and the clients mirror them for their previews. Checkout re-prices from the
 * pod through `ticketDiscountFor`; it never trusts a client-discounted amount.
 *
 * A leaf module on purpose, like pod.seats: it imports nothing but GraphQLError
 * and the seat ceiling, so pod, payment and finance can all share it without an
 * import cycle.
 */
import { GraphQLError } from 'graphql';
import { UNLIMITED_POD_MAX_SEATS } from './pod.seats';

export interface TicketDiscountTier {
  min_tickets: number;
  discount_pct: number;
}

/** Largest discount any tier may give when Admin > Pod Settings has not set one. */
export const DEFAULT_TICKET_DISCOUNT_MAX_PCT = 50;
/** Most tiers one pod may carry. */
export const TICKET_DISCOUNT_MAX_TIERS = 10;
/** The smallest stored tier — one ticket is the implied full-price row. */
const LOWEST_TIER_TICKETS = 2;

type TicketDiscountSource = {
  ticket_discount_enabled?: boolean | null;
  ticket_discount_tiers?: TicketDiscountTier[] | null;
};

const toRupees = (value: number) => Math.round(value * 100) / 100;

/**
 * What a booking of `seats` pays off its ticket money.
 *
 * `gross` is the undiscounted ticket total; `amount` is the rupee discount, so
 * the ticket money actually charged is `gross - amount`. `pct` and
 * `min_tickets` are 0 when no tier applies (switched off, one seat, or no tier
 * reached) — which is exactly what a payment freezes for "no discount".
 */
export function ticketDiscountFor(
  podAmount: number,
  seats: number,
  pod: TicketDiscountSource
): { gross: number; pct: number; min_tickets: number; amount: number } {
  const gross = toRupees(podAmount * seats);
  let best: TicketDiscountTier | null = null;
  if (pod.ticket_discount_enabled) {
    for (const tier of pod.ticket_discount_tiers ?? []) {
      const reached = tier.min_tickets <= seats;
      if (reached && (!best || tier.min_tickets > best.min_tickets)) best = tier;
    }
  }
  if (!best) return { gross, pct: 0, min_tickets: 0, amount: 0 };
  return {
    gross,
    pct: best.discount_pct,
    min_tickets: best.min_tickets,
    amount: toRupees((gross * best.discount_pct) / 100),
  };
}

/**
 * The most tickets a tier may ask for: every seat the pod can sell in one go
 * (its spots minus the host's own free seat — the same rule as `payableSpots`
 * in finance/breakdown.math.ts), or the unlimited-pod booking ceiling.
 */
export function ticketDiscountMaxTickets(noOfSpots: number): number {
  if (!Number.isFinite(noOfSpots) || noOfSpots <= 0) return UNLIMITED_POD_MAX_SEATS;
  return Math.floor(noOfSpots) - 1;
}

function badTiers(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** The first thing wrong with one row, judged against the row above it. */
function tierProblem(
  tier: TicketDiscountTier,
  above: TicketDiscountTier | null,
  maxTickets: number,
  maxPct: number
): string | null {
  const tickets = Number(tier.min_tickets);
  const pct = Number(tier.discount_pct);
  if (!Number.isInteger(tickets) || tickets < LOWEST_TIER_TICKETS) {
    return `tickets must be a whole number of at least ${LOWEST_TIER_TICKETS}`;
  }
  if (tickets > maxTickets) return `tickets cannot be more than ${maxTickets}`;
  if (!Number.isInteger(pct) || pct < 1) return 'discount must be a whole number of at least 1%';
  if (pct > maxPct) return `discount cannot be more than ${maxPct}%`;
  if (above && tickets <= above.min_tickets) return 'needs more tickets than the tier above';
  if (above && pct <= above.discount_pct) return 'needs a bigger discount than the tier above';
  return null;
}

/**
 * Validates a pod's tier list for writing and returns it as clean integer rows.
 * Throws BAD_USER_INPUT naming the first problem. Callers only reach this for an
 * ENABLED discount on a priced pod — a switched-off or free pod stores none.
 */
export function assertTicketDiscountTiers(
  tiers: TicketDiscountTier[],
  limits: { maxPct: number; noOfSpots: number }
): TicketDiscountTier[] {
  if (tiers.length === 0) badTiers('Add at least one multi-ticket discount tier');
  if (tiers.length > TICKET_DISCOUNT_MAX_TIERS) {
    badTiers(`A pod can have at most ${TICKET_DISCOUNT_MAX_TIERS} multi-ticket discount tiers`);
  }
  const maxTickets = ticketDiscountMaxTickets(limits.noOfSpots);
  const clean: TicketDiscountTier[] = [];
  for (const tier of tiers) {
    const problem = tierProblem(tier, clean.at(-1) ?? null, maxTickets, limits.maxPct);
    if (problem) badTiers(`Multi-ticket discount tier ${clean.length + 1}: ${problem}`);
    clean.push({ min_tickets: Number(tier.min_tickets), discount_pct: Number(tier.discount_pct) });
  }
  return clean;
}

/** True when both lists hold the same tiers in the same order. */
export function sameTicketDiscountTiers(
  a: readonly TicketDiscountTier[] | null | undefined,
  b: readonly TicketDiscountTier[] | null | undefined
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every(
    (tier, i) =>
      Number(tier.min_tickets) === Number(right[i].min_tickets) &&
      Number(tier.discount_pct) === Number(right[i].discount_pct)
  );
}
