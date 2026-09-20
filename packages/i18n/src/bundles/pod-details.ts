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
      // The club card and the club-admin card answer the same missing club, so
      // the sentence is shared rather than written twice.
      noClubLinked: 'No club linked to this pod.',
      status: 'Status',
      description: 'Description',
    },
    podAttendeesSection: {
      attendees: 'Attendees',
      nobodyJoined: 'Nobody has joined this pod yet.',
      // One booking can admit several people, so the row reports seats rather
      // than counting heads.
      seats: 'Seats',
      // What to call this person's booking. One literal key per state, because
      // `scripts/verify-translation-keys.mjs` greps source for the literal
      // string — a key composed at runtime reads as shipped-but-never-rendered.
      statusHost: 'Host',
      statusAttendee: 'Attendee',
      statusJoined: 'Joined',
      // "Visited" once the pod has happened AND they were checked in at the
      // door — the word the member is quoting when they complain.
      statusVisited: 'Visited',
      statusBackoutInProcess: 'Backout in process',
      statusBackedOut: 'Backed out',
      spotFilledBy: 'Spot filled by {name}',
    },
    podClubAdminsCard: {
      clubAdminDetails: 'Club Admin Details',
      email: 'Email',
      noClubAdmins: 'This club has no club admins.',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
    },
    podClubCard: {
      club: 'Club',
      viewClub: 'View club',
    },
    podFeedbackSection: {
      ratings: 'Ratings',
      noRatings: 'No one has rated this pod yet.',
      ratingsCount: '{count} ratings',
    },
    podFinanceSection: {
      breakdownUnavailable: 'Finance breakdown is not available for this pod.',
      noSettlement: 'No settlement recorded for this pod yet.',
      bookings: 'Bookings',
      collectedTotal: 'Collected total',
      // Shown only when money actually went back. A cancelled pod refunds every
      // booking, which is why its collected total reads zero.
      refunded: 'Refunded to buyers',
      refundedBookings: 'Bookings refunded',
      finance: 'Finance',
      frozenSnapshot: 'Frozen snapshot',
      live: 'Live',
      pendingApproval: 'Pending approval',
      settled: 'Settled',
      // Why the collected total sits below face value: tiers already taken off.
      ticketDiscounts: 'Multi-ticket discounts given',
    },
    podHostsCard: {
      hosts: 'Hosts',
      primary: 'Primary',
      noHosts: 'No hosts on this pod.',
      noContact: 'No contact on file',
    },
    podOverviewCard: {
      ends: 'Ends',
      likesComments: 'Likes · Comments',
      meeting: 'Meeting',
      overview: 'Overview',
      peopleIn: 'People in',
      podId: 'Pod ID',
      products: 'Products',
      // Whether this pod sells the club's products alongside its tickets.
      productsEnabled: 'Enabled',
      productsOff: 'Off',
      spotsLeft: 'Spots left',
      ticketDiscount: 'Multi-ticket offer',
      ticketDiscountTier: '{count}+ tickets · {pct}% off',
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
      ticketDiscount: 'Multi-ticket discount',
    },
    podStatusChips: {
      cancelled: 'Cancelled',
      completed: 'Completed',
    },
    podTimelineSection: {
      podDate: 'Pod date',
      timeline: 'Timeline',
      // The trail under the lifecycle strip: every edit, approval and
      // cancellation recorded against this pod.
      activity: 'Activity',
      // A lifecycle step the pod has not reached, so there is no date to stamp.
      pending: 'Pending',
    },
  },
};
