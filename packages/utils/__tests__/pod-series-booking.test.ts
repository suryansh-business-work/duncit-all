import { describe, expect, it } from 'vitest';
import {
  adminMultiDateDiscountLabels,
  bookableSeriesDates,
  bookedSeriesDates,
  multiDateTiersForEditor,
  multiDateTiersFromEditor,
  mwebMultiDateDiscountLabels,
  POD_SERIES_MAX_DATES,
  repeatDiscountFormIssues,
  resolveMultiDateTier,
  pickedSeriesDates,
  seriesBookingEstimate,
  SERIES_DATE_STATUS_KEY,
  type MultiDateDiscountTier,
  type SeriesDateRow,
} from '../src/pod-series-booking';
import type { TicketDiscountLabels, TicketDiscountTranslate } from '../src/pod-ticket-discount-copy';

/** A weekly pod: one date done, one booked, two open, one sold out. */
const row = (id: string, overrides: Partial<SeriesDateRow> = {}): SeriesDateRow => ({
  pod_doc_id: id,
  slug: `sunday-badminton-${id}`,
  start_at: '2026-11-01T10:00:00.000Z',
  status: 'UPCOMING',
  seats_available: 4,
  my_seats: 0,
  pod_amount: 499,
  bookable: true,
  ...overrides,
});

const ROWS: SeriesDateRow[] = [
  row('d1', { status: 'COMPLETED', bookable: false }),
  row('d2', { my_seats: 2, bookable: true }),
  row('d3'),
  row('d4', { seats_available: 0, bookable: false }),
  row('d5'),
];

const TIERS: MultiDateDiscountTier[] = [
  { min_dates: 4, discount_pct: 15 },
  { min_dates: 2, discount_pct: 5 },
];

describe('bookable and booked dates', () => {
  it('keeps only the dates that can be booked, in date order', () => {
    expect(bookableSeriesDates(ROWS).map((r) => r.pod_doc_id)).toEqual(['d2', 'd3', 'd5']);
  });

  it('keeps only the dates the member holds seats on', () => {
    expect(bookedSeriesDates(ROWS).map((r) => r.pod_doc_id)).toEqual(['d2']);
  });

  it('answers empty lists for a pod with no dates', () => {
    expect(bookableSeriesDates([])).toEqual([]);
    expect(bookedSeriesDates([])).toEqual([]);
  });
});

describe('pickedSeriesDates', () => {
  const ids = (rows: SeriesDateRow[]) => rows.map((r) => r.pod_doc_id);

  it('books every open date when all are ticked, skipping finished and sold-out ones', () => {
    expect(ids(pickedSeriesDates(ROWS, ['d1', 'd2', 'd3', 'd4', 'd5']))).toEqual(['d2', 'd3', 'd5']);
  });

  it('books only ticked dates that are still open, in date order not tick order', () => {
    expect(ids(pickedSeriesDates(ROWS, ['d5', 'd4', 'd1', 'd3']))).toEqual(['d3', 'd5']);
  });

  it('books nothing when nothing is ticked or no date is open', () => {
    expect(pickedSeriesDates(ROWS, [])).toEqual([]);
    const closed = ROWS.map((r) => ({ ...r, bookable: false }));
    expect(pickedSeriesDates(closed, ['d2', 'd3'])).toEqual([]);
  });
});

describe('resolveMultiDateTier', () => {
  it('reaches no tier with one date', () => {
    expect(resolveMultiDateTier(TIERS, 1)).toBeNull();
  });

  it('reaches a tier at exactly its minimum', () => {
    expect(resolveMultiDateTier(TIERS, 2)).toEqual({ min_dates: 2, discount_pct: 5 });
  });

  it('picks the highest tier reached, whatever order the tiers are stored in', () => {
    expect(resolveMultiDateTier(TIERS, 3)?.discount_pct).toBe(5);
    expect(resolveMultiDateTier(TIERS, 7)?.discount_pct).toBe(15);
  });

  it('reaches nothing when the pod has no tiers', () => {
    expect(resolveMultiDateTier(null, 10)).toBeNull();
    expect(resolveMultiDateTier(undefined, 10)).toBeNull();
    expect(resolveMultiDateTier([], 10)).toBeNull();
  });
});

describe('seriesBookingEstimate', () => {
  it('charges the full price for one date', () => {
    expect(seriesBookingEstimate([499], TIERS)).toEqual({ gross: 499, pct: 0, discount: 0, total: 499 });
  });

  it('takes the reached tier off the gross, rounded to the paisa', () => {
    // 4 × 333.33 = 1333.32; 15% = 199.998 → 200.00
    expect(seriesBookingEstimate([333.33, 333.33, 333.33, 333.33], TIERS)).toEqual({
      gross: 1333.32,
      pct: 15,
      discount: 200,
      total: 1133.32,
    });
  });

  it('prices a free pod at zero', () => {
    expect(seriesBookingEstimate([0, 0, 0], TIERS)).toEqual({ gross: 0, pct: 5, discount: 0, total: 0 });
  });

  it('adds each date at its own price before the tier comes off', () => {
    // 499 + 599 = 1098; 2 dates reach 5% = 54.90
    expect(seriesBookingEstimate([499, 599], TIERS)).toEqual({ gross: 1098, pct: 5, discount: 54.9, total: 1043.1 });
  });

  it('prices no dates at zero', () => {
    expect(seriesBookingEstimate([], TIERS)).toEqual({ gross: 0, pct: 0, discount: 0, total: 0 });
  });

  it('gives no discount when the pod offers none', () => {
    expect(seriesBookingEstimate([200, 200, 200, 200, 200], null)).toEqual({ gross: 1000, pct: 0, discount: 0, total: 1000 });
  });
});

describe('tier editor mapping', () => {
  it('maps dates to the editor\'s ticket counts and back without loss', () => {
    const editor = multiDateTiersForEditor(TIERS);
    expect(editor).toEqual([
      { min_tickets: 4, discount_pct: 15 },
      { min_tickets: 2, discount_pct: 5 },
    ]);
    expect(multiDateTiersFromEditor(editor)).toEqual(TIERS);
  });
});

describe('picker copy keys', () => {
  it('words every date status under the booking namespace', () => {
    for (const key of Object.values(SERIES_DATE_STATUS_KEY)) {
      expect(key.startsWith('mweb.podSeriesBooking.status')).toBe(true);
    }
    expect(SERIES_DATE_STATUS_KEY.AWAITING_VENUE).toBe('mweb.podSeriesBooking.statusAwaitingVenue');
  });
});

/** Answers `t:<key>` plus any vars, so a test sees which key and values were used. */
const marker: TicketDiscountTranslate = (key, options) =>
  options?.vars ? `t:${key}:${JSON.stringify(options.vars)}` : `t:${key}`;

const everyString = (labels: TicketDiscountLabels) => [
  labels.title,
  labels.switchLabel,
  labels.hint,
  labels.baseRow,
  labels.ticketsLabel,
  labels.discountLabel,
  labels.addTier,
  labels.removeTier,
  labels.maxHint(40),
  labels.perTicket('₹450'),
  labels.errors.TIERS_REQUIRED({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.TOO_MANY_TIERS({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.TICKETS_MIN({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.TICKETS_MAX({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.TICKETS_NOT_INCREASING({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.PCT_MIN({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.PCT_MAX({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
  labels.errors.PCT_NOT_INCREASING({ maxPct: 40, maxTickets: 12, maxTiers: 5 }),
];

describe.each([
  ['mWeb and native', mwebMultiDateDiscountLabels, 'mweb'],
  ['Admin', adminMultiDateDiscountLabels, 'admin'],
] as const)('%s multi-date discount labels', (_name, build, ns) => {
  const labels = build(marker);

  it(`words every line through the ${ns}.multiDateDiscount keys`, () => {
    for (const text of everyString(labels)) {
      expect(text.startsWith(`t:${ns}.multiDateDiscount.`)).toBe(true);
    }
  });

  it('counts in dates, not tickets', () => {
    expect(labels.ticketsLabel).toBe(`t:${ns}.multiDateDiscount.datesLabel`);
    expect(labels.perTicket('₹450')).toBe(`t:${ns}.multiDateDiscount.perDate:{"price":"₹450"}`);
  });

  it('passes each limit into the message that names it', () => {
    const limits = { maxPct: 40, maxTickets: 12, maxTiers: 5 };
    expect(labels.maxHint(40)).toBe(`t:${ns}.multiDateDiscount.maxHint:{"max":40}`);
    expect(labels.errors.TOO_MANY_TIERS(limits)).toBe(`t:${ns}.multiDateDiscount.errorTooManyTiers:{"max":5}`);
    expect(labels.errors.TICKETS_MAX(limits)).toBe(`t:${ns}.multiDateDiscount.errorDatesMax:{"max":12}`);
    expect(labels.errors.PCT_MAX(limits)).toBe(`t:${ns}.multiDateDiscount.errorPctMax:{"max":40}`);
  });
});

describe('repeatDiscountFormIssues', () => {
  const off = { enabled: false, tiers: [{ min_tickets: 1, discount_pct: 90 }], maxPct: 50 };

  it('reports nothing while the discount is switched off, whatever the rows say', () => {
    expect(repeatDiscountFormIssues(off, marker)).toEqual([]);
  });

  it('reports nothing for valid, increasing tiers', () => {
    const tiers = [
      { min_tickets: 2, discount_pct: 5 },
      { min_tickets: 4, discount_pct: 10 },
    ];
    expect(repeatDiscountFormIssues({ enabled: true, tiers, maxPct: 50 }, marker)).toEqual([]);
  });

  it('puts a missing-tiers problem on the list itself', () => {
    expect(repeatDiscountFormIssues({ enabled: true, tiers: [], maxPct: 50 }, marker)).toEqual([
      { path: ['repeat_discount_tiers'], message: 't:mweb.multiDateDiscount.errorTiersRequired' },
    ]);
  });

  it('puts a row problem on that row and field, quoting the limit in dates', () => {
    const tiers = [{ min_tickets: POD_SERIES_MAX_DATES + 1, discount_pct: 60 }];
    expect(repeatDiscountFormIssues({ enabled: true, tiers, maxPct: 50 }, marker)).toEqual([
      {
        path: ['repeat_discount_tiers', 0, 'min_tickets'],
        message: `t:mweb.multiDateDiscount.errorDatesMax:{"max":${POD_SERIES_MAX_DATES}}`,
      },
      {
        path: ['repeat_discount_tiers', 0, 'discount_pct'],
        message: `t:mweb.multiDateDiscount.errorPctMax:{"max":50}`,
      },
    ]);
  });
});
