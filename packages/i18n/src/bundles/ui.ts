import type { NestedCatalogue } from '../catalogue';

/**
 * @duncit/ui's own copy — the handful of words its shared components supply
 * when a caller names none.
 *
 * A namespace of its own rather than a surface's, for the usual reason (rule
 * 40): these components render in mWeb AND in every portal, so a copy in each
 * bundle would be two hand-kept sets of the same words.
 */
export const UI_BUNDLE: NestedCatalogue = {
  ui: {
    /** Detail-page header. */
    backHeader: {
      back: 'Back',
    },
    /** The loading / error / not-found trio every detail page renders. */
    queryGuard: {
      notFound: 'Not found.',
    },
    /**
     * The one spinner's words.
     *
     * Every portal and mWeb render `Loader` for a page still fetching, a
     * section refreshing in place, and the thin bar the shell shows while a
     * request is out — so what a screen reader announces is one row here
     * rather than one per surface (rule 40).
     */
    loader: {
      loading: 'Loading…',
    },
    /** The language switcher in mWeb's account page and the portal profile menu. */
    language: {
      label: 'Language',
    },
    /**
     * The money waterfall for one pod, line by line. Staff read it in the
     * portals and the host reads the same shape on their own share, so it is
     * one set of words rather than two.
     */
    waterfall: {
      customerPaid: 'Customer Paid',
      duncitRevenue: 'Duncit revenue',
      gst: '− GST ({pct}%)',
      hostReceives: 'Host receives',
      hostSecondary: 'remainder − {pct}% commission',
      platformFee: '− Platform Fee ({pct}%)',
      pool: 'Remaining Pool',
      venuePrice: 'Venue price',
      venueSecondary:
        'booked slot price − {pct}% commission → venue receives {receives}',
    },
    /** A pod's door attendance, as "N/M scanned". */
    attendance: {
      notScanned: 'Not scanned',
      notScannedHint: 'No ticket on this pod has been scanned yet',
      scannedHint: 'Seats scanned in at the door — a completed pod is settled on these',
      scannedCount: '{attended}/{booked} scanned',
    },
    /** A pod’s occupancy: seats held, and the bookings holding them. */
    podSeats: {
      bookings: { one: '{count} booking', other: '{count} bookings' },
      hint: '{seats} seats held by {bookings} bookings — one seat each.',
      hintMulti:
        '{seats} seats held by {bookings} bookings — {extra} of them are extra seats bought on a single booking.',
    },
    /** A member's pod history, as a branching timeline. */
    timeline: {
      inProgress: 'In progress',
    },
    /** Shown when the AI + rules preflight blocks publishing. */
    moderation: {
      title: 'Fix these before publishing',
      description:
        'Our AI check found content that breaks the community guidelines, so it was not saved. Fix the items below and try again.',
    },
  },
};
