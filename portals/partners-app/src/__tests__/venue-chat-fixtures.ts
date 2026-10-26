/**
 * The venue ↔ host chat as the server answers it, for the venue chat suites:
 * the room (with both sides' contact cards and how far each member has read),
 * the thread's lines (text, photo and offer moves, with their edits and
 * reactions) and the pod's live offer — every field the shared SDLs select, so
 * Apollo writes each answer whole. Test kit, not shipped code.
 */

export const START = '2026-12-05T12:30:00.000Z';
export const END = '2026-12-05T14:30:00.000Z';

/** 1 December 2026, 06:mm UTC — the thread's lines and read marks are placed on this clock. */
export const at = (minute: number): string => new Date(Date.UTC(2026, 11, 1, 6, minute)).toISOString();

export const breakdown = (venue_payout: number, total: number, pax: number) => ({
  __typename: 'VenuePriceBreakdown',
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  date: '2026-12-05',
  base: venue_payout,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: venue_payout,
  gst_pct: 0,
  taxes: 0,
  venue_payout,
  platform_fee_pct: 10,
  platform_fee: total - venue_payout,
  total,
  deposit: 0,
});

/** The pod's live offer (`podVenueOffer`): the host's first offer, waiting on the venue, three counters a side. */
export const liveOffer = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBookingOffer',
  slot_id: 'slot-1',
  status: 'SENT',
  round: 1,
  awaiting: 'VENUE',
  model: 'PER_GUEST',
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['10 chairs'],
  note: '',
  images: [],
  pets: false,
  space_label: '',
  expires_at: '2026-12-02T06:30:00.000Z',
  counters_per_side: 3,
  host_counters_used: 0,
  venue_counters_used: 0,
  quote: breakdown(6000, 6600, 20),
  quote_min: breakdown(2400, 2640, 8),
  counter: null,
  pod_id: 'pod-1',
  start_at: START,
  end_at: END,
  ...over,
});

/** The venue's counter as the live offer carries it. */
export const venueCounter = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueOfferCounter',
  model: 'FLAT',
  rate: 7000,
  min_guests: 0,
  offerings: [],
  note: '',
  images: [],
  at: null,
  quote: breakdown(7000, 7700, 20),
  quote_min: breakdown(7000, 7700, 20),
  ...over,
});

/** One move of the offer, as an OFFER line records it. */
export const move = (over: Record<string, unknown>) => ({
  __typename: 'VenueChatOffer',
  slot_id: 'slot-1',
  round: 1,
  event: 'OFFER',
  by: 'HOST',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['10 chairs'],
  note: 'We will bring our own speakers.',
  start_at: START,
  end_at: END,
  space_label: '',
  pets: false,
  venue_receives_min: 2400,
  venue_receives_max: 6000,
  total_min: 2640,
  total_max: 6600,
  expires_at: '2026-12-02T06:30:00.000Z',
  reason: '',
  images: [],
  ...over,
});

/** A text line from the host (Asha), as first sent, nobody reacting. */
export const line = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  pod_id: 'pod-1',
  user_id: 'u-host',
  user_name: 'Asha',
  user_photo: null,
  type: 'TEXT',
  text: 'Is the terrace free?',
  image_url: null,
  deleted: false,
  createdAt: at(0),
  edited_at: null,
  reactions: [],
  offer: null,
  ...over,
});

/** A line the signed-in venue owner (u-venue) sent. */
export const ownLine = (id: string, over: Record<string, unknown> = {}) =>
  line(id, { user_id: 'u-venue', user_name: 'Ravi', text: 'Yes, from 6 pm.', createdAt: at(2), ...over });

export const offerLine = (id: string, over: Record<string, unknown>) =>
  line(id, { type: 'OFFER', text: 'Booking offer', createdAt: at(5), offer: move(over) });

export const reaction = (user_id: string, emoji: string) => ({ __typename: 'PodMessageReaction', user_id, emoji });

/** How far one member has read the thread. */
export const readMark = (user_id: string, side: 'HOST' | 'VENUE', name: string, last_read_at: string) => ({
  __typename: 'VenueChatReadMark',
  user_id,
  side,
  name,
  photo: null,
  last_read_at,
});

export const hostCard = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueChatHostCard',
  user_id: 'u-host',
  name: 'Asha Rao',
  photo: null,
  username: 'asha',
  bio: 'Runs pottery evenings in Indiranagar.',
  phone: '+91 98000 00000',
  email: 'asha@host.test',
  ...over,
});

export const venueCard = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueChatVenueCard',
  venue_id: 'venue-1',
  venue_name: 'Skyline Banquets',
  photo: null,
  venue_type: 'Banquet hall',
  capacity: 120,
  address: '12 Residency Road, Bengaluru',
  name: 'Ravi',
  phone: '+91 97000 00000',
  email: 'events@skyline.test',
  ...over,
});

/** The room as the venue reads it, nobody else having read anything yet. */
export const room = (over: Record<string, unknown> = {}) => ({
  venueChatRoom: {
    __typename: 'VenueChatRoom',
    pod_id: 'pod-1',
    pod_title: 'Pottery night',
    pod_date_time: START,
    venue_id: 'venue-1',
    venue_name: 'Skyline Banquets',
    venue_photo: null,
    my_side: 'VENUE',
    pod_is_free: false,
    counterpart_name: 'Asha',
    counterpart_phone: '+91 98000 00000',
    counterpart_email: 'asha@host.test',
    host: hostCard(),
    venue: venueCard(),
    read_marks: [],
    ...over,
  },
});
