/**
 * Server-shaped rows for the host and club-admin pod suites.
 *
 * Each builder answers EVERY field its document selects, with the server's
 * `__typename`, because Apollo drops a row it cannot write whole and the page
 * then renders as if nothing came back.
 */

/** A pod as `PartnerPodRowFields` (myHostPodsTable) selects it. */
export const partnerPodRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'Pod',
  id: 'pod-1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunrise Tennis Doubles',
  pod_description: 'Doubles at the club courts.',
  pod_images_and_videos: [],
  club_id: 'club-1',
  club_slug: 'sunrise-tennis',
  venue_id: 'venue-1',
  pod_mode: 'PHYSICAL',
  pod_type: 'PAID',
  pod_date_time: '2026-10-04T07:30:00.000Z',
  pod_end_date_time: '2026-10-04T09:30:00.000Z',
  pod_amount: 499,
  no_of_spots: 8,
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
  pod_attendees: ['user-2', 'user-3'],
  seats_taken: 3,
  attendance: null,
  venue_approval_status: 'APPROVED',
  zone_name: 'Indiranagar',
  is_active: true,
  is_deleted: false,
  completed_at: null,
  ...over,
});

/** A pod as `ClubAdminPodRowFields` (clubAdminPodsTable) selects it. */
export const clubAdminPodRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'Pod',
  id: 'pod-1',
  pod_title: 'Sunrise Tennis Doubles',
  pod_description: 'Doubles at the club courts.',
  pod_images_and_videos: [],
  reel_url: null,
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_slot_id: null,
  location_id: 'loc-blr',
  pod_mode: 'PHYSICAL',
  meeting_platform: null,
  meeting_url: null,
  meeting_notes: null,
  pod_hashtag: null,
  pod_hosts_id: ['user-1'],
  host_names: ['Asha Rao'],
  pod_date_time: '2026-10-04T07:30:00.000Z',
  pod_end_date_time: '2026-10-04T09:30:00.000Z',
  pod_type: 'PAID',
  pod_amount: 499,
  pod_occurrence: 'ONCE',
  no_of_spots: 8,
  pod_info: null,
  what_this_pod_offers: [],
  available_perks: [],
  payment_terms: null,
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
  pod_attendees: ['user-2', 'user-3'],
  attendance: null,
  is_active: true,
  is_deleted: false,
  venue_approval_status: 'APPROVED',
  completed_at: null,
  ...over,
});

export const podTablePage = (resultKey: string, rows: readonly unknown[]) => ({
  [resultKey]: { __typename: 'PodTablePage', total: rows.length, rows },
});

export const clubRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'Club',
  id: 'club-1',
  club_name: 'Sunrise Tennis Club',
  meetup_venues_id: ['venue-1'],
  super_category_id: 'super-sports',
  category_id: 'cat-tennis',
  ...over,
});

export const venueRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: 'venue-1',
  venue_name: 'Koramangala Courts',
  city: 'Bengaluru',
  locality: 'Koramangala',
  status: 'APPROVED',
  is_active: true,
  ...over,
});

/**
 * One approved and active venue, plus the two a pod form must never offer —
 * an approved venue that was switched off and one still under review.
 */
export const mixedVenues = [
  venueRow(),
  venueRow({ id: 'venue-2', venue_name: 'Closed Courts', is_active: false }),
  venueRow({ id: 'venue-3', venue_name: 'Pending Courts', status: 'SUBMITTED' }),
];

/** The PartnerPodLookups answer (myHost + clubs + venues + products). */
export const partnerLookups = (hostStatus: string | null) => ({
  myHost: hostStatus ? { __typename: 'Host', id: 'host-1', status: hostStatus } : null,
  clubs: [clubRow()],
  myVenues: mixedVenues,
  availablePodProducts: [],
});

/** The ClubAdminPodLookups answer. */
export const clubAdminLookups = (clubs: readonly unknown[] = [clubRow()]) => ({
  myAdminClubs: clubs,
  myVenues: mixedVenues,
  availablePodProducts: [],
});
