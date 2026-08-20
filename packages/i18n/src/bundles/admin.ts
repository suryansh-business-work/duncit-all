import type { NestedCatalogue } from '../catalogue';

/**
 * The Admin Panel's own copy.
 *
 * Only the strings the console renders itself live here — everything it shows
 * ABOUT the platform (a super category's name, a venue's status) is data the
 * server sends, and keying that would freeze a list an admin is meant to edit.
 *
 * The lifecycle words are deliberately NOT the `mweb.studioPods.bucket*` ones:
 * a host reads "Live now" and "Past" about their own evening, while an admin
 * filtering every pod on the platform reads the state names the rest of this
 * console uses. Same four buckets, two audiences, two sentences (rule 40 shares
 * the derivation, not the wording).
 */
export const ADMIN_BUNDLE: NestedCatalogue = {
  admin: {
    filters: {
      // Clubs and Venues are both classified under a Super Category, so one
      // label serves both pages rather than drifting into two.
      superCategory: 'Super Category',
      allSuperCategories: 'All Super Categories',
      podLifecycle: 'Status',
      podLifecycleAll: 'All Pods',
      podLifecycleUpcoming: 'Upcoming',
      podLifecycleOngoing: 'Ongoing',
      podLifecycleCompleted: 'Completed',
      podLifecycleCancelled: 'Cancelled',
    },
  },
};
