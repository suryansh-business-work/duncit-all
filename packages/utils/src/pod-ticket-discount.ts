import { round2 } from './checkout-bill';
import { payableSpots } from './pod-spots';

/**
 * Multi-ticket booking discount — the ONE client copy of the tier rules.
 *
 * A pod may offer a cheaper ticket when a single checkout books several seats:
 * ordered tiers of `{ min_tickets, discount_pct }`, where the best tier is the
 * one with the largest `min_tickets` the booking reaches. The discount cuts
 * TICKET money only (`pod_amount × seats`), never add-on products, and it is
 * taken BEFORE the coupon and Duncit Coins.
 *
 * The editor always shows a fixed base row "1 ticket · 0%" that is never
 * stored: stored tiers start at 2 tickets and 1%, and each row needs strictly
 * more tickets AND a strictly bigger discount than the row above.
 *
 * The server imports no `@duncit/*` package, so it keeps its own twin in
 * server/src/modules/pods/pod/pod.ticketDiscount.ts — that copy prices the
 * charge and freezes it on the Payment; this one only previews it. Change the
 * rules in both, or the screen promises a total the buyer is never charged.
 */

export interface TicketDiscountTier {
  min_tickets: number;
  discount_pct: number;
}

/** Most tiers one pod may carry (server twin: `TICKET_DISCOUNT_MAX_TIERS`). */
export const TICKET_DISCOUNT_MAX_TIERS = 10;

/** The smallest booking a stored tier can start at — one ticket is the base row. */
export const TICKET_DISCOUNT_MIN_TICKETS = 2;

/** The admin's `ticket_discount_max_pct` default, used only while settings load. */
export const DEFAULT_TICKET_DISCOUNT_MAX_PCT = 50;

/** The most tickets a tier may ask for on an unlimited pod (server: `UNLIMITED_POD_MAX_SEATS`). */
const UNLIMITED_POD_MAX_TICKETS = 10;

/** How much bigger a suggested next row's discount is than the row above. */
const NEXT_TIER_PCT_STEP = 5;

/** The pod fields the tier rules read, whichever query fetched the pod. */
export interface TicketDiscountSource {
  ticket_discount_enabled?: boolean | null;
  ticket_discount_tiers?: readonly TicketDiscountTier[] | null;
}

/** Largest-min_tickets tier with min_tickets ≤ seats, or null (disabled, <2 seats, no match). */
export function resolveTicketDiscountTier(
  source: TicketDiscountSource,
  seats: number,
): TicketDiscountTier | null {
  const booked = Math.floor(Number(seats) || 0);
  if (!source.ticket_discount_enabled || booked < TICKET_DISCOUNT_MIN_TICKETS) return null;
  let best: TicketDiscountTier | null = null;
  for (const tier of source.ticket_discount_tiers ?? []) {
    if (tier.min_tickets <= booked && (best === null || tier.min_tickets > best.min_tickets)) {
      best = tier;
    }
  }
  return best;
}

/** The ticket money of one booking, before and after its tier. */
export interface TicketDiscountQuote {
  /** `unitPrice × seats` — the ticket money before any discount. */
  gross: number;
  /** The tier's percentage (0 when no tier applies). */
  pct: number;
  /** The tier's `min_tickets` (0 when no tier applies). */
  min_tickets: number;
  /** Rupees taken off the gross. */
  amount: number;
  /** What the tickets cost once the tier is taken — the coupon evaluates on this. */
  net: number;
}

/**
 * Price one booking's tickets. The discount is rounded ONCE on the whole gross,
 * never per seat, so it matches the server to the paisa.
 */
export function ticketDiscountFor(
  unitPrice: number,
  seats: number,
  source: TicketDiscountSource,
): TicketDiscountQuote {
  const gross = round2(unitPrice * seats);
  const tier = resolveTicketDiscountTier(source, seats);
  const pct = tier?.discount_pct ?? 0;
  const amount = round2((gross * pct) / 100);
  return { gross, pct, min_tickets: tier?.min_tickets ?? 0, amount, net: round2(gross - amount) };
}

/**
 * The most tickets a tier may ask for: the seats a pod can actually sell (the
 * host's seat is free, so spots − 1), or 10 on an unlimited pod.
 */
export function ticketDiscountMaxTickets(noOfSpots: number): number {
  return Number(noOfSpots) > 0 ? payableSpots(noOfSpots) : UNLIMITED_POD_MAX_TICKETS;
}

export type TicketDiscountIssueCode =
  | 'TIERS_REQUIRED'
  | 'TOO_MANY_TIERS'
  | 'TICKETS_MIN'
  | 'TICKETS_MAX'
  | 'TICKETS_NOT_INCREASING'
  | 'PCT_MIN'
  | 'PCT_MAX'
  | 'PCT_NOT_INCREASING';

type TicketDiscountRowField = 'min_tickets' | 'discount_pct';

export interface TicketDiscountIssue {
  /** The row the issue is on, or null for a list-level issue. */
  index: number | null;
  field: 'ticket_discount_tiers' | TicketDiscountRowField;
  code: TicketDiscountIssueCode;
}

/** One column of a tier row: its bounds and the codes it reports. */
interface TierColumnRule {
  field: TicketDiscountRowField;
  floor: number;
  ceiling: number;
  codes: Readonly<{ min: TicketDiscountIssueCode; max: TicketDiscountIssueCode; order: TicketDiscountIssueCode }>;
}

/** The first thing wrong with one cell, or null when it is fine. */
function columnIssue(
  rule: TierColumnRule,
  tier: TicketDiscountTier,
  previous: TicketDiscountTier | undefined,
): TicketDiscountIssueCode | null {
  const value = Number(tier[rule.field]);
  if (!Number.isInteger(value) || value < rule.floor) return rule.codes.min;
  if (value > rule.ceiling) return rule.codes.max;
  if (previous && value <= Number(previous[rule.field])) return rule.codes.order;
  return null;
}

/** [] when !enabled. index null + field 'ticket_discount_tiers' for list-level issues. Non-integers report TICKETS_MIN / PCT_MIN. */
export function ticketDiscountTierIssues(input: {
  enabled: boolean;
  tiers: readonly TicketDiscountTier[];
  maxPct: number;
  maxTickets: number;
}): TicketDiscountIssue[] {
  if (!input.enabled) return [];
  const list = 'ticket_discount_tiers';
  if (input.tiers.length === 0) return [{ index: null, field: list, code: 'TIERS_REQUIRED' }];
  const issues: TicketDiscountIssue[] = [];
  if (input.tiers.length > TICKET_DISCOUNT_MAX_TIERS) {
    issues.push({ index: null, field: list, code: 'TOO_MANY_TIERS' });
  }
  const rules: readonly TierColumnRule[] = [
    {
      field: 'min_tickets',
      floor: TICKET_DISCOUNT_MIN_TICKETS,
      ceiling: input.maxTickets,
      codes: { min: 'TICKETS_MIN', max: 'TICKETS_MAX', order: 'TICKETS_NOT_INCREASING' },
    },
    {
      field: 'discount_pct',
      floor: 1,
      ceiling: input.maxPct,
      codes: { min: 'PCT_MIN', max: 'PCT_MAX', order: 'PCT_NOT_INCREASING' },
    },
  ];
  for (const [index, tier] of input.tiers.entries()) {
    // Row 0 has no row above it: `tiers[-1]` is undefined, so it skips the order check.
    const previous = input.tiers[index - 1];
    for (const rule of rules) {
      const code = columnIssue(rule, tier, previous);
      if (code) issues.push({ index, field: rule.field, code });
    }
  }
  return issues;
}

/** Suggested next row: last ? {last.min_tickets+1, min(last.discount_pct+5, maxPct)} : {2, min(5, maxPct)} */
export function nextTicketDiscountTier(
  tiers: readonly TicketDiscountTier[],
  maxPct: number,
): TicketDiscountTier {
  const last = tiers[tiers.length - 1];
  if (!last) {
    return {
      min_tickets: TICKET_DISCOUNT_MIN_TICKETS,
      discount_pct: Math.min(NEXT_TIER_PCT_STEP, maxPct),
    };
  }
  return {
    min_tickets: Number(last.min_tickets) + 1,
    discount_pct: Math.min(Number(last.discount_pct) + NEXT_TIER_PCT_STEP, maxPct),
  };
}

/** One printed row of a pod's offer: the tickets, the discount and what a ticket then costs. */
export interface TicketDiscountRow {
  min_tickets: number;
  discount_pct: number;
  per_ticket: number;
}

/** Display rows INCLUDING the base row {1,0,unitPrice}; per_ticket = round2(unitPrice*(100-pct)/100). Only base row when disabled. */
export function ticketDiscountRows(
  unitPrice: number,
  source: TicketDiscountSource,
): TicketDiscountRow[] {
  const base: TicketDiscountRow = { min_tickets: 1, discount_pct: 0, per_ticket: round2(unitPrice) };
  if (!source.ticket_discount_enabled) return [base];
  const tiers = (source.ticket_discount_tiers ?? []).map((tier) => ({
    min_tickets: tier.min_tickets,
    discount_pct: tier.discount_pct,
    per_ticket: round2((unitPrice * (100 - tier.discount_pct)) / 100),
  }));
  return [base, ...tiers];
}

/** Input builder: free || !enabled → {ticket_discount_enabled:false, ticket_discount_tiers:[]}; else numbers coerced. */
export function ticketDiscountInput(
  values: {
    ticket_discount_enabled: boolean;
    ticket_discount_tiers: readonly TicketDiscountTier[];
  },
  free: boolean,
): { ticket_discount_enabled: boolean; ticket_discount_tiers: TicketDiscountTier[] } {
  if (free || !values.ticket_discount_enabled) {
    return { ticket_discount_enabled: false, ticket_discount_tiers: [] };
  }
  return {
    ticket_discount_enabled: true,
    ticket_discount_tiers: values.ticket_discount_tiers.map((tier) => ({
      min_tickets: Number(tier.min_tickets),
      discount_pct: Number(tier.discount_pct),
    })),
  };
}
