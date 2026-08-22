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
    /** The language switcher in mWeb's account page and the portal profile menu. */
    language: {
      label: 'Language',
    },
    /** A pod's door attendance, as "N/M scanned". */
    attendance: {
      notScanned: 'Not scanned',
      notScannedHint: 'No ticket on this pod has been scanned yet',
      scannedHint: 'Seats scanned in at the door — a completed pod is settled on these',
      scannedCount: '{attended}/{booked} scanned',
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
