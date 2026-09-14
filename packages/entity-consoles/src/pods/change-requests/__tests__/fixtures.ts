import type { PodChangeCandidateRow, PodChangeSlotRow } from '@duncit/pod-change-requests';
import type { PodChangeOffer, PodChangeRow } from '@duncit/utils';

/**
 * Realistic Change Requests records for the queue suites — a DUN-POD pod, INR
 * slot prices, the statuses the SDL actually answers. Test harness only.
 */
export const makeRequest = (over: Partial<PodChangeRow> = {}): PodChangeRow => ({
  id: 'req-doc-1',
  change_request_no: 'DUN-CR-1042',
  role: 'VENUE',
  status: 'OPEN',
  resolution: 'NONE',
  reason: 'Our terrace is being renovated that weekend.',
  health_penalty: 5,
  attendees_at_request: 9,
  pod: {
    id: 'pod-doc-4821',
    pod_slug: 'sunday-board-games',
    pod_title: 'Sunday board games',
    pod_date_time: '2026-10-04T12:30:00.000Z',
    club_slug: 'bangalore-board-gamers',
    attendee_count: 9,
  },
  pod_cancelled: false,
  requested_by: {
    user_id: 'user-venue-1',
    full_name: 'Asha Rao',
    email: 'asha@thirdwave.in',
    phone: '+91 98450 12345',
  },
  from_venue_id: 'venue-1',
  from_venue_name: 'Third Wave Coffee, Indiranagar',
  from_club_id: 'club-1',
  from_club_name: 'Bangalore Board Gamers',
  offer: null,
  offer_history: [],
  events: [],
  created_at: '2026-09-12T08:15:00.000Z',
  resolved_at: null,
  ...over,
});

export const makeOffer = (over: Partial<PodChangeOffer> = {}): PodChangeOffer => ({
  user_id: 'user-venue-2',
  display_name: 'Dialogues Cafe',
  contact: { user_id: 'user-venue-2', full_name: 'Kiran Shetty', email: 'kiran@dialogues.in', phone: '+91 99000 11122' },
  venue_id: 'venue-2',
  venue_name: 'Dialogues Cafe, Koramangala',
  venue_slot_id: 'slot-1',
  slot_start_at: '2026-10-04T13:00:00.000Z',
  slot_end_at: '2026-10-04T16:00:00.000Z',
  slot_price: 2500,
  club_id: null,
  status: 'PENDING',
  offered_at: '2026-09-13T10:00:00.000Z',
  responded_at: null,
  pass_reason: '',
  ...over,
});

export const makeCandidate = (over: Partial<PodChangeCandidateRow> = {}): PodChangeCandidateRow => ({
  id: 'cand-1',
  user_id: 'user-venue-2',
  label: 'Dialogues Cafe, Koramangala',
  detail: 'Cafe · 3.1 km away',
  full_name: 'Kiran Shetty',
  email: 'kiran@dialogues.in',
  phone: '+91 99000 11122',
  venue_id: 'venue-2',
  club_id: null,
  club_name: '',
  ...over,
});

export const makeSlot = (over: Partial<PodChangeSlotRow> = {}): PodChangeSlotRow => ({
  id: 'slot-1',
  venue_id: 'venue-2',
  start_at: '2026-10-04T13:00:00.000Z',
  end_at: '2026-10-04T16:00:00.000Z',
  price: 2500,
  capacity: 24,
  space_label: 'Upper deck',
  ...over,
});

const gqlContact = (contact: PodChangeRow['requested_by']) => ({ __typename: 'PodChangeContact', ...contact });

const gqlOffer = (offer: PodChangeOffer) => ({
  __typename: 'PodChangeOffer',
  ...offer,
  contact: gqlContact(offer.contact),
});

/** A row as the GraphQL response carries it — every object typed. */
export const gqlRequest = (row: PodChangeRow) => ({
  __typename: 'PodChangeRequest',
  ...row,
  pod: { __typename: 'PodChangePodRef', ...row.pod },
  requested_by: gqlContact(row.requested_by),
  offer: row.offer ? gqlOffer(row.offer) : null,
  offer_history: row.offer_history.map(gqlOffer),
  events: row.events.map((event) => ({ __typename: 'PodChangeEvent', ...event })),
});

export const gqlCandidate = (row: PodChangeCandidateRow) => ({ __typename: 'PodChangeCandidate', ...row });

export const gqlSlot = (row: PodChangeSlotRow) => ({ __typename: 'PodChangeVenueSlot', ...row });
