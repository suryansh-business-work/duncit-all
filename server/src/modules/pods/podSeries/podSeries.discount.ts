/**
 * Multi-date booking discount — the server's one copy of the rules.
 *
 * A member booking several dates of a recurring pod in one checkout gets a
 * percentage off the ticket money of those dates: the best tier is the one
 * with the largest `min_dates` the booking reaches. One date always pays full
 * price, so that base row is implied and never stored. It is taken AFTER each
 * date's multi-ticket tier and BEFORE the coupon and Duncit Coins.
 *
 * The rules are the multi-ticket tier rules counted in dates instead of
 * tickets, so this delegates to pod.ticketDiscount rather than keeping a
 * second copy. Client twin: packages/utils/src/pod-multi-date-discount.ts.
 */
import {
  assertTicketDiscountTiers,
  ticketDiscountFor,
  type TicketDiscountTier,
  type TierNoun,
} from '../pod/pod.ticketDiscount';

export interface MultiDateDiscountTier {
  min_dates: number;
  discount_pct: number;
}

/** What a fresh install offers until Admin > Pods > Pod Settings says otherwise. */
export const DEFAULT_MULTI_DATE_DISCOUNT_TIERS: readonly MultiDateDiscountTier[] = [
  { min_dates: 2, discount_pct: 5 },
  { min_dates: 4, discount_pct: 10 },
];

/** Hard ceilings for the stored default; a pod is checked against the live limits. */
const SETTING_MAX_PCT = 99;
const SETTING_MAX_DATES = 52;

const DATE_TIERS: TierNoun = { name: 'Multi-date', unit: 'dates' };

const asTicketTiers = (tiers: readonly MultiDateDiscountTier[]): TicketDiscountTier[] =>
  tiers.map((t) => ({ min_tickets: t.min_dates, discount_pct: t.discount_pct }));

const asDateTiers = (tiers: readonly TicketDiscountTier[]): MultiDateDiscountTier[] =>
  tiers.map((t) => ({ min_dates: t.min_tickets, discount_pct: t.discount_pct }));

/**
 * What a booking of `dates` dates pays off its ticket money, where each date's
 * ticket money (after its own multi-ticket tier) is `perDateTickets`.
 * `pct` and `min_dates` are 0 when no tier applies.
 */
export function multiDateDiscountFor(
  perDateTickets: number,
  dates: number,
  tiers: readonly MultiDateDiscountTier[] | null | undefined
): { gross: number; pct: number; min_dates: number; amount: number } {
  const quote = ticketDiscountFor(perDateTickets, dates, {
    ticket_discount_enabled: true,
    ticket_discount_tiers: asTicketTiers(tiers ?? []),
  });
  return { gross: quote.gross, pct: quote.pct, min_dates: quote.min_tickets, amount: quote.amount };
}

/**
 * Validates a tier list for writing and returns clean integer rows; an empty
 * list means "no discount" and is allowed. Throws BAD_USER_INPUT naming the
 * first problem.
 */
export function assertMultiDateDiscountTiers(
  tiers: readonly MultiDateDiscountTier[] | null | undefined,
  limits: { maxPct: number; maxDates: number }
): MultiDateDiscountTier[] {
  if (!tiers?.length) return [];
  // `noOfSpots` is the seat count the ticket rules subtract the host's seat
  // from, so one more than the dates lets the last tier ask for every date.
  const clean = assertTicketDiscountTiers(
    asTicketTiers(tiers),
    { maxPct: limits.maxPct, noOfSpots: limits.maxDates + 1 },
    DATE_TIERS
  );
  return asDateTiers(clean);
}

/** The Pod Settings default, checked against the hard ceilings only. */
export const cleanDefaultMultiDateDiscountTiers = (value: unknown): MultiDateDiscountTier[] =>
  assertMultiDateDiscountTiers(Array.isArray(value) ? (value as MultiDateDiscountTier[]) : [], {
    maxPct: SETTING_MAX_PCT,
    maxDates: SETTING_MAX_DATES,
  });
