import { round2 } from './checkout-bill';
import type { TicketDiscountTier } from './pod-ticket-discount';
import type { TicketDiscountLabels, TicketDiscountTranslate } from './pod-ticket-discount-copy';

/**
 * Booking a recurring pod — the rules both apps' Pod Details and checkout share.
 *
 * A recurring pod is ONE pod with many dates. A member picks which dates to
 * book — the next one, all of them, or a hand-picked set — and pays each
 * date's ticket less the pod's multi-date discount. The SERVER prices the
 * charge (`recurringCheckoutQuote`); this module only picks the dates and
 * previews the price on the date picker.
 *
 * Server twin of the discount rules: server/src/modules/pods/podSeries/podSeries.discount.ts.
 */

/** Percent off a booking of at least `min_dates` dates. */
export interface MultiDateDiscountTier {
  min_dates: number;
  discount_pct: number;
}

export type SeriesDateStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'AWAITING_VENUE';

/** One date of a recurring pod, as `podSeriesDates` returns it. */
export interface SeriesDateRow {
  pod_doc_id: string;
  slug: string;
  start_at: string;
  end_at?: string | null;
  status: SeriesDateStatus;
  seats_available?: number | null;
  my_seats: number;
  bookable: boolean;
}

/** The most dates any recurring pod may have (Pod Settings caps it lower). */
export const POD_SERIES_MAX_DATES = 52;

/** How the member chose their dates on the picker. */
export type SeriesBookingChoice = 'NEXT' | 'ALL' | 'PICK';

export const SERIES_BOOKING_CHOICES: readonly { value: SeriesBookingChoice; labelKey: string }[] = [
  { value: 'NEXT', labelKey: 'mweb.podSeriesBooking.choiceNext' },
  { value: 'ALL', labelKey: 'mweb.podSeriesBooking.choiceAll' },
  { value: 'PICK', labelKey: 'mweb.podSeriesBooking.choicePick' },
];

/** How a date's status reads in the dates list. */
export const SERIES_DATE_STATUS_KEY: Record<SeriesDateStatus, string> = {
  UPCOMING: 'mweb.podSeriesBooking.statusUpcoming',
  ONGOING: 'mweb.podSeriesBooking.statusOngoing',
  COMPLETED: 'mweb.podSeriesBooking.statusCompleted',
  CANCELLED: 'mweb.podSeriesBooking.statusCancelled',
  AWAITING_VENUE: 'mweb.podSeriesBooking.statusAwaitingVenue',
};

/** The dates the member can book right now, in date order. */
export const bookableSeriesDates = (rows: readonly SeriesDateRow[]): SeriesDateRow[] =>
  rows.filter((row) => row.bookable);

/** The dates the member has booked, in date order. */
export const bookedSeriesDates = (rows: readonly SeriesDateRow[]): SeriesDateRow[] =>
  rows.filter((row) => row.my_seats > 0);

/**
 * The date ids a choice books: the next bookable date, every bookable date,
 * or the picked ones that can still be booked — always in date order, so the
 * first id is the date products and rentals ride on.
 */
export function seriesDatesForChoice(
  rows: readonly SeriesDateRow[],
  choice: SeriesBookingChoice,
  picked: readonly string[],
): string[] {
  const open = bookableSeriesDates(rows);
  if (choice === 'NEXT') return open.slice(0, 1).map((row) => row.pod_doc_id);
  if (choice === 'ALL') return open.map((row) => row.pod_doc_id);
  const wanted = new Set(picked);
  return open.filter((row) => wanted.has(row.pod_doc_id)).map((row) => row.pod_doc_id);
}

/** The tier a booking of `dates` dates reaches, or null (one date, or no tier reached). */
export function resolveMultiDateTier(
  tiers: readonly MultiDateDiscountTier[] | null | undefined,
  dates: number,
): MultiDateDiscountTier | null {
  let best: MultiDateDiscountTier | null = null;
  for (const tier of tiers ?? []) {
    if (tier.min_dates <= dates && (best === null || tier.min_dates > best.min_dates)) best = tier;
  }
  return best;
}

/** The picker's price preview: `dates` dates at `perDate` each, less the tier. */
export function seriesBookingEstimate(
  perDate: number,
  dates: number,
  tiers: readonly MultiDateDiscountTier[] | null | undefined,
): { gross: number; pct: number; discount: number; total: number } {
  const gross = round2(perDate * dates);
  const pct = resolveMultiDateTier(tiers, dates)?.discount_pct ?? 0;
  const discount = round2((gross * pct) / 100);
  return { gross, pct, discount, total: round2(gross - discount) };
}

/** The multi-date tiers as the shared tier editor holds them (it counts "tickets"). */
export const multiDateTiersForEditor = (tiers: readonly MultiDateDiscountTier[]): TicketDiscountTier[] =>
  tiers.map((tier) => ({ min_tickets: tier.min_dates, discount_pct: tier.discount_pct }));

/** The tier editor's rows back as multi-date tiers. */
export const multiDateTiersFromEditor = (tiers: readonly TicketDiscountTier[]): MultiDateDiscountTier[] =>
  tiers.map((tier) => ({ min_dates: tier.min_tickets, discount_pct: tier.discount_pct }));

/**
 * The tier editor's words for the multi-date discount, `mweb.*` — mWeb and the
 * native app. Literal keys for the translation-key gate (see
 * pod-ticket-discount-copy.ts).
 */
export function mwebMultiDateDiscountLabels(t: TicketDiscountTranslate): TicketDiscountLabels {
  return {
    title: t('mweb.multiDateDiscount.title'),
    switchLabel: t('mweb.multiDateDiscount.switchLabel'),
    hint: t('mweb.multiDateDiscount.hint'),
    baseRow: t('mweb.multiDateDiscount.baseRow'),
    ticketsLabel: t('mweb.multiDateDiscount.datesLabel'),
    discountLabel: t('mweb.multiDateDiscount.discountLabel'),
    addTier: t('mweb.multiDateDiscount.addTier'),
    removeTier: t('mweb.multiDateDiscount.removeTier'),
    maxHint: (max) => t('mweb.multiDateDiscount.maxHint', { vars: { max } }),
    perTicket: (price) => t('mweb.multiDateDiscount.perDate', { vars: { price } }),
    errors: {
      TIERS_REQUIRED: () => t('mweb.multiDateDiscount.errorTiersRequired'),
      TOO_MANY_TIERS: ({ maxTiers }) => t('mweb.multiDateDiscount.errorTooManyTiers', { vars: { max: maxTiers } }),
      TICKETS_MIN: () => t('mweb.multiDateDiscount.errorDatesMin'),
      TICKETS_MAX: ({ maxTickets }) => t('mweb.multiDateDiscount.errorDatesMax', { vars: { max: maxTickets } }),
      TICKETS_NOT_INCREASING: () => t('mweb.multiDateDiscount.errorDatesNotIncreasing'),
      PCT_MIN: () => t('mweb.multiDateDiscount.errorPctMin'),
      PCT_MAX: ({ maxPct }) => t('mweb.multiDateDiscount.errorPctMax', { vars: { max: maxPct } }),
      PCT_NOT_INCREASING: () => t('mweb.multiDateDiscount.errorPctNotIncreasing'),
    },
  };
}

/** The same words, `admin.*` — Admin > Pods > Pod Settings. */
export function adminMultiDateDiscountLabels(t: TicketDiscountTranslate): TicketDiscountLabels {
  return {
    title: t('admin.multiDateDiscount.title'),
    switchLabel: t('admin.multiDateDiscount.switchLabel'),
    hint: t('admin.multiDateDiscount.hint'),
    baseRow: t('admin.multiDateDiscount.baseRow'),
    ticketsLabel: t('admin.multiDateDiscount.datesLabel'),
    discountLabel: t('admin.multiDateDiscount.discountLabel'),
    addTier: t('admin.multiDateDiscount.addTier'),
    removeTier: t('admin.multiDateDiscount.removeTier'),
    maxHint: (max) => t('admin.multiDateDiscount.maxHint', { vars: { max } }),
    perTicket: (price) => t('admin.multiDateDiscount.perDate', { vars: { price } }),
    errors: {
      TIERS_REQUIRED: () => t('admin.multiDateDiscount.errorTiersRequired'),
      TOO_MANY_TIERS: ({ maxTiers }) => t('admin.multiDateDiscount.errorTooManyTiers', { vars: { max: maxTiers } }),
      TICKETS_MIN: () => t('admin.multiDateDiscount.errorDatesMin'),
      TICKETS_MAX: ({ maxTickets }) => t('admin.multiDateDiscount.errorDatesMax', { vars: { max: maxTickets } }),
      TICKETS_NOT_INCREASING: () => t('admin.multiDateDiscount.errorDatesNotIncreasing'),
      PCT_MIN: () => t('admin.multiDateDiscount.errorPctMin'),
      PCT_MAX: ({ maxPct }) => t('admin.multiDateDiscount.errorPctMax', { vars: { max: maxPct } }),
      PCT_NOT_INCREASING: () => t('admin.multiDateDiscount.errorPctNotIncreasing'),
    },
  };
}

/** Every date of a recurring pod, for Pod Details. mWeb wraps it with `gql`; native re-declares it for codegen. */
export const POD_SERIES_DATES_SDL = `
  query PodSeriesDates($pod_doc_id: ID!) {
    podSeriesDates(pod_doc_id: $pod_doc_id) {
      parent_pod_id
      frequency
      multi_date_discount_tiers {
        min_dates
        discount_pct
      }
      dates {
        pod_doc_id
        slug
        start_at
        end_at
        status
        seats_available
        my_seats
        bookable
      }
    }
  }
`;

/** Joins the picked dates of a FREE recurring pod. */
export const JOIN_FREE_POD_DATES_SDL = `
  mutation JoinFreePodDates($pod_doc_id: ID!, $date_pod_ids: [ID!]!) {
    joinFreePodDates(pod_doc_id: $pod_doc_id, date_pod_ids: $date_pod_ids) {
      joined
      failed {
        pod_doc_id
        message
      }
    }
  }
`;

/** The exact bill for booking several dates in one checkout. */
export const RECURRING_CHECKOUT_QUOTE_SDL = `
  query RecurringCheckoutQuote($input: RecurringCheckoutQuoteInput!) {
    recurringCheckoutQuote(input: $input) {
      dates
      currency_symbol
      ticket_gross
      ticket_discount_amount
      ticket_discount_pct
      multi_date_discount_amount
      multi_date_discount_pct
      add_ons_total
      coupon_code
      coupon_discount
      coins_redeemed
      subtotal
      platform_fee_amount
      gst_amount
      round_off
      total
      original_total
    }
  }
`;
