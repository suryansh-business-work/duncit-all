import type { NestedCatalogue } from '../catalogue';

/**
 * Copy for the shared pod details panel.
 *
 * Its own namespace rather than a host surface's, because the package renders
 * inside more than one build and a second copy of these sentences is exactly
 * the drift rule 40 exists to stop.
 */
export const POD_DETAILS_BUNDLE: NestedCatalogue = {
  podDetailsPanel: {
    common: {
      cancelled: 'Cancelled',
      completed: 'Completed',
      created: 'Created',
      status: 'Status',
    },
    podAttendeesSection: {
      attendees: 'Attendees',
    },
    podClubCard: {
      clubAndClubAdmins: 'Club & club admins',
    },
    podFeedbackSection: {
      ratings: 'Ratings',
    },
    podFinanceSection: {
      bookings: 'Bookings',
      collectedTotal: 'Collected total',
      finance: 'Finance',
      frozenSnapshot: 'Frozen snapshot',
      live: 'Live',
      pendingApproval: 'Pending approval',
      settled: 'Settled',
    },
    podHostsCard: {
      hosts: 'Hosts',
      primary: 'Primary',
    },
    podOverviewCard: {
      ends: 'Ends',
      likesComments: 'Likes · Comments',
      meeting: 'Meeting',
      overview: 'Overview',
      peopleIn: 'People in',
      podId: 'Pod ID',
      products: 'Products',
      spotsLeft: 'Spots left',
      views: 'Views',
      when: 'When',
      zone: 'Zone',
    },
    podPaymentsSection: {
      amount: 'Amount',
      coupon: 'Coupon',
      gateway: 'Gateway',
      noPaymentsRecordedForThisPod: 'No payments recorded for this pod.',
      paidAt: 'Paid at',
      payer: 'Payer',
      paymentId: 'Payment ID',
      paymentsAndTransactions: 'Payments & transactions',
    },
    podStatusChips: {
      cancelled: 'Cancelled',
      completed: 'Completed',
    },
    podTimelineSection: {
      podDate: 'Pod date',
      timeline: 'Timeline',
    },
  },
};
