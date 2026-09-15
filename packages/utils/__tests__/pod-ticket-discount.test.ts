import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TICKET_DISCOUNT_MAX_PCT,
  TICKET_DISCOUNT_MAX_TIERS,
  TICKET_DISCOUNT_MIN_TICKETS,
  nextTicketDiscountTier,
  resolveTicketDiscountTier,
  ticketDiscountFor,
  ticketDiscountInput,
  ticketDiscountMaxTickets,
  ticketDiscountRows,
  ticketDiscountTierIssues,
  type TicketDiscountSource,
  type TicketDiscountTier,
} from '../src/pod-ticket-discount';

/** DUN-POD-4821's offer: 2+ tickets 10% off, 4+ tickets 20% off. */
const TIERS: readonly TicketDiscountTier[] = [
  { min_tickets: 2, discount_pct: 10 },
  { min_tickets: 4, discount_pct: 20 },
];
const OFFER: TicketDiscountSource = { ticket_discount_enabled: true, ticket_discount_tiers: TIERS };

/** Validation input with the limits of a 12-spot pod and the default 50% cap. */
const issuesFor = (tiers: readonly TicketDiscountTier[], over: Partial<{ enabled: boolean; maxPct: number; maxTickets: number }> = {}) =>
  ticketDiscountTierIssues({ enabled: true, tiers, maxPct: 50, maxTickets: 11, ...over });

describe('constants', () => {
  it('mirror the server twin', () => {
    expect(TICKET_DISCOUNT_MAX_TIERS).toBe(10);
    expect(TICKET_DISCOUNT_MIN_TICKETS).toBe(2);
    expect(DEFAULT_TICKET_DISCOUNT_MAX_PCT).toBe(50);
  });
});

describe('resolveTicketDiscountTier', () => {
  it('picks the tier with the largest min_tickets the booking reaches', () => {
    expect(resolveTicketDiscountTier(OFFER, 2)).toEqual({ min_tickets: 2, discount_pct: 10 });
    expect(resolveTicketDiscountTier(OFFER, 3)).toEqual({ min_tickets: 2, discount_pct: 10 });
    expect(resolveTicketDiscountTier(OFFER, 4)).toEqual({ min_tickets: 4, discount_pct: 20 });
    expect(resolveTicketDiscountTier(OFFER, 9)).toEqual({ min_tickets: 4, discount_pct: 20 });
  });

  it('does not depend on the order the tiers are stored in', () => {
    const shuffled = { ticket_discount_enabled: true, ticket_discount_tiers: [TIERS[1]!, TIERS[0]!] };
    expect(resolveTicketDiscountTier(shuffled, 5)).toEqual({ min_tickets: 4, discount_pct: 20 });
  });

  it('floors a fractional seat count before matching', () => {
    expect(resolveTicketDiscountTier(OFFER, 3.9)).toEqual({ min_tickets: 2, discount_pct: 10 });
  });

  it('gives a single ticket, or a count that is not a number, nothing', () => {
    expect(resolveTicketDiscountTier(OFFER, 1)).toBeNull();
    expect(resolveTicketDiscountTier(OFFER, Number.NaN)).toBeNull();
  });

  it('gives nothing when the offer is switched off, even with tiers stored', () => {
    expect(resolveTicketDiscountTier({ ...OFFER, ticket_discount_enabled: false }, 4)).toBeNull();
    expect(resolveTicketDiscountTier({ ticket_discount_tiers: TIERS }, 4)).toBeNull();
  });

  it('gives nothing when no tier is reached or none is stored', () => {
    const fromFive = { ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 5, discount_pct: 15 }] };
    expect(resolveTicketDiscountTier(fromFive, 4)).toBeNull();
    expect(resolveTicketDiscountTier({ ticket_discount_enabled: true, ticket_discount_tiers: null }, 4)).toBeNull();
    expect(resolveTicketDiscountTier({ ticket_discount_enabled: true }, 4)).toBeNull();
  });
});

describe('ticketDiscountFor', () => {
  it('takes the tier off the whole ticket gross, once', () => {
    expect(ticketDiscountFor(499, 4, OFFER)).toEqual({
      gross: 1996,
      pct: 20,
      min_tickets: 4,
      amount: 399.2,
      net: 1596.8,
    });
    expect(ticketDiscountFor(499, 3, OFFER)).toEqual({
      gross: 1497,
      pct: 10,
      min_tickets: 2,
      amount: 149.7,
      net: 1347.3,
    });
  });

  it('charges full price when no tier applies', () => {
    expect(ticketDiscountFor(499, 1, OFFER)).toEqual({
      gross: 499,
      pct: 0,
      min_tickets: 0,
      amount: 0,
      net: 499,
    });
  });

  it('rounds to the paisa with no float residue', () => {
    const quote = ticketDiscountFor(333.33, 3, { ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 7 }] });
    expect(quote.gross).toBe(999.99);
    expect(quote.amount).toBe(70);
    expect(quote.net).toBe(929.99);
  });

  it('treats a price that is not a number as zero', () => {
    expect(ticketDiscountFor(Number.NaN, 4, OFFER)).toEqual({ gross: 0, pct: 20, min_tickets: 4, amount: 0, net: 0 });
  });
});

describe('ticketDiscountMaxTickets', () => {
  it('caps a tier at the seats a pod can sell — the host sits free', () => {
    expect(ticketDiscountMaxTickets(12)).toBe(11);
    expect(ticketDiscountMaxTickets(1)).toBe(0);
  });

  it('allows up to 10 tickets on an unlimited or unset pod', () => {
    expect(ticketDiscountMaxTickets(0)).toBe(10);
    expect(ticketDiscountMaxTickets(Number.NaN)).toBe(10);
  });
});

describe('ticketDiscountTierIssues', () => {
  it('has nothing to say while the offer is switched off', () => {
    expect(issuesFor([{ min_tickets: 0, discount_pct: 0 }], { enabled: false })).toEqual([]);
  });

  it('accepts a strictly increasing ladder inside the limits', () => {
    expect(issuesFor(TIERS)).toEqual([]);
    expect(issuesFor([{ min_tickets: 11, discount_pct: 50 }])).toEqual([]);
  });

  it('refuses an enabled offer with no tiers', () => {
    expect(issuesFor([])).toEqual([{ index: null, field: 'ticket_discount_tiers', code: 'TIERS_REQUIRED' }]);
  });

  it('refuses more than the maximum tiers, and still checks every row', () => {
    const tiers = Array.from({ length: TICKET_DISCOUNT_MAX_TIERS + 1 }, (_, i) => ({ min_tickets: i + 2, discount_pct: i + 1 }));
    expect(issuesFor(tiers, { maxTickets: 20 })).toEqual([
      { index: null, field: 'ticket_discount_tiers', code: 'TOO_MANY_TIERS' },
    ]);
    const withBadRow = [...tiers.slice(0, -1), { min_tickets: 1, discount_pct: 11 }];
    expect(issuesFor(withBadRow, { maxTickets: 20 })).toEqual([
      { index: null, field: 'ticket_discount_tiers', code: 'TOO_MANY_TIERS' },
      { index: 10, field: 'min_tickets', code: 'TICKETS_MIN' },
    ]);
  });

  it('reports tickets below 2 or not a whole number as TICKETS_MIN', () => {
    expect(issuesFor([{ min_tickets: 1, discount_pct: 10 }])).toEqual([
      { index: 0, field: 'min_tickets', code: 'TICKETS_MIN' },
    ]);
    expect(issuesFor([{ min_tickets: 2.5, discount_pct: 10 }])).toEqual([
      { index: 0, field: 'min_tickets', code: 'TICKETS_MIN' },
    ]);
  });

  it('reports tickets above what the pod can sell as TICKETS_MAX', () => {
    expect(issuesFor([{ min_tickets: 12, discount_pct: 10 }])).toEqual([
      { index: 0, field: 'min_tickets', code: 'TICKETS_MAX' },
    ]);
  });

  it('reports a row that does not ask for more tickets than the row above', () => {
    expect(issuesFor([{ min_tickets: 4, discount_pct: 10 }, { min_tickets: 4, discount_pct: 20 }])).toEqual([
      { index: 1, field: 'min_tickets', code: 'TICKETS_NOT_INCREASING' },
    ]);
  });

  it('reports a discount below 1% or not a whole number as PCT_MIN', () => {
    expect(issuesFor([{ min_tickets: 2, discount_pct: 0 }])).toEqual([
      { index: 0, field: 'discount_pct', code: 'PCT_MIN' },
    ]);
    expect(issuesFor([{ min_tickets: 2, discount_pct: 7.5 }])).toEqual([
      { index: 0, field: 'discount_pct', code: 'PCT_MIN' },
    ]);
  });

  it('reports a discount above the admin cap as PCT_MAX', () => {
    expect(issuesFor([{ min_tickets: 2, discount_pct: 51 }])).toEqual([
      { index: 0, field: 'discount_pct', code: 'PCT_MAX' },
    ]);
  });

  it('reports a row that does not give a bigger discount than the row above', () => {
    expect(issuesFor([{ min_tickets: 2, discount_pct: 20 }, { min_tickets: 3, discount_pct: 15 }])).toEqual([
      { index: 1, field: 'discount_pct', code: 'PCT_NOT_INCREASING' },
    ]);
  });

  it('reports both cells of a row, tickets first', () => {
    expect(issuesFor([{ min_tickets: 0, discount_pct: 99 }])).toEqual([
      { index: 0, field: 'min_tickets', code: 'TICKETS_MIN' },
      { index: 0, field: 'discount_pct', code: 'PCT_MAX' },
    ]);
  });
});

describe('nextTicketDiscountTier', () => {
  it('starts a new ladder at 2 tickets and 5%', () => {
    expect(nextTicketDiscountTier([], 50)).toEqual({ min_tickets: 2, discount_pct: 5 });
  });

  it('never suggests a first discount above the cap', () => {
    expect(nextTicketDiscountTier([], 3)).toEqual({ min_tickets: 2, discount_pct: 3 });
  });

  it('suggests one more ticket and 5% more than the last row', () => {
    expect(nextTicketDiscountTier(TIERS, 50)).toEqual({ min_tickets: 5, discount_pct: 25 });
  });

  it('holds the suggested discount at the cap', () => {
    expect(nextTicketDiscountTier(TIERS, 22)).toEqual({ min_tickets: 5, discount_pct: 22 });
  });
});

describe('ticketDiscountRows', () => {
  it('prints the base row and one row per tier with its per-ticket price', () => {
    expect(ticketDiscountRows(499, OFFER)).toEqual([
      { min_tickets: 1, discount_pct: 0, per_ticket: 499 },
      { min_tickets: 2, discount_pct: 10, per_ticket: 449.1 },
      { min_tickets: 4, discount_pct: 20, per_ticket: 399.2 },
    ]);
  });

  it('prints only the base row when the offer is off', () => {
    expect(ticketDiscountRows(499, { ticket_discount_enabled: false, ticket_discount_tiers: TIERS })).toEqual([
      { min_tickets: 1, discount_pct: 0, per_ticket: 499 },
    ]);
  });

  it('prints only the base row when an enabled offer carries no tiers', () => {
    expect(ticketDiscountRows(499, { ticket_discount_enabled: true, ticket_discount_tiers: null })).toEqual([
      { min_tickets: 1, discount_pct: 0, per_ticket: 499 },
    ]);
  });
});

describe('ticketDiscountInput', () => {
  const values = { ticket_discount_enabled: true, ticket_discount_tiers: TIERS };

  it('sends the tiers of an enabled offer as numbers', () => {
    const fromForm = [{ min_tickets: '3', discount_pct: '12' }] as unknown as TicketDiscountTier[];
    expect(ticketDiscountInput({ ticket_discount_enabled: true, ticket_discount_tiers: fromForm }, false)).toEqual({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 12 }],
    });
    expect(ticketDiscountInput(values, false)).toEqual({ ticket_discount_enabled: true, ticket_discount_tiers: TIERS });
  });

  it('clears the offer on a free pod', () => {
    expect(ticketDiscountInput(values, true)).toEqual({ ticket_discount_enabled: false, ticket_discount_tiers: [] });
  });

  it('clears the tiers when the offer is switched off', () => {
    expect(ticketDiscountInput({ ...values, ticket_discount_enabled: false }, false)).toEqual({
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
    });
  });
});
