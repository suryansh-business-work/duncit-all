/**
 * The venue thread as the server answers it — the room, its lines, the live
 * offer and the line mutations — for the two venue chat suites. Every object
 * carries the fields its document selects, so MockedProvider writes it whole.
 * Test kit, not shipped code.
 */
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { POD_VENUE_OFFER_TERMS } from '@duncit/availability-calendar';
import {
  DELETE_VENUE_CHAT_MESSAGE_SDL,
  EDIT_VENUE_CHAT_MESSAGE_SDL,
  MARK_VENUE_CHAT_READ_SDL,
  REACT_TO_VENUE_CHAT_MESSAGE_SDL,
  VENUE_CHAT_PAGE,
} from '@duncit/utils';
import { VENUE_CHAT_MESSAGES, VENUE_CHAT_ROOM } from '../queries';

export const START = '2026-12-05T12:30:00.000Z';
export const END = '2026-12-05T14:30:00.000Z';
/** A minute of the morning the thread was written in (06:mm UTC, 1 December). */
export const at = (minute: number, second = 0) =>
  `2026-12-01T06:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`;

const breakdown = (venue_payout: number, total: number, pax: number) => ({
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

/** The live offer as `podVenueOffer` answers it: 3 counters a side, the venue has used one. */
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
  venue_counters_used: 1,
  quote: breakdown(6000, 6600, 20),
  quote_min: breakdown(2400, 2640, 8),
  counter: null,
  pod_id: 'pod-1',
  start_at: START,
  end_at: END,
  ...over,
});

export const counter = {
  __typename: 'VenueOfferCounter',
  model: 'FLAT',
  rate: 7000,
  min_guests: 0,
  offerings: [],
  note: 'Weekend rate',
  images: [],
  at: null,
  quote: breakdown(7000, 7700, 20),
  quote_min: breakdown(7000, 7700, 20),
};

const move = (over: Record<string, unknown> = {}) => ({
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
  note: '',
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

/** A text line from the venue's Ravi at 06:00, unless told otherwise. */
export const line = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  pod_id: 'pod-1',
  user_id: 'u-venue',
  user_name: 'Ravi',
  user_photo: null,
  type: 'TEXT',
  text: 'Hello!',
  image_url: null,
  deleted: false,
  createdAt: at(0),
  edited_at: null,
  reactions: [],
  offer: null,
  ...over,
});

/** A line the reader (the host, u-host) wrote. */
export const myLine = (id: string, minute: number, over: Record<string, unknown> = {}) =>
  line(id, { user_id: 'u-host', user_name: 'Asha', createdAt: at(minute), ...over });

export const offerLine = (id: string, minute: number, over: Record<string, unknown>) =>
  line(id, {
    type: 'OFFER',
    text: 'Booking offer',
    user_id: over.by === 'HOST' ? 'u-host' : 'u-venue',
    createdAt: at(minute),
    offer: move(over),
  });

/** How far a member has read, as the room and the socket report it. */
export const readMark = (user_id: string, side: 'HOST' | 'VENUE', name: string, last_read_at: string) => ({
  __typename: 'VenueChatReadMark',
  user_id,
  side,
  name,
  photo: null,
  last_read_at,
});

export const HOST_CARD = {
  __typename: 'VenueChatHostCard',
  user_id: 'u-host',
  name: 'Asha Rao',
  photo: null,
  username: 'asha',
  bio: 'Pottery teacher',
  phone: '+91 90000 11111',
  email: 'asha@host.test',
};

export const VENUE_CARD = {
  __typename: 'VenueChatVenueCard',
  venue_id: 'venue-1',
  venue_name: 'Skyline Banquets',
  photo: null,
  venue_type: 'Banquet hall',
  capacity: 120,
  address: '4 MG Road, Bengaluru',
  name: 'Ravi',
  phone: '+91 98000 00000',
  email: 'ravi@venue.test',
};

export const roomMock = (my_side: 'HOST' | 'VENUE', over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: VENUE_CHAT_ROOM, variables: { pod_id: 'pod-1' } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      venueChatRoom: {
        __typename: 'VenueChatRoom',
        pod_id: 'pod-1',
        pod_title: 'Pottery night',
        pod_date_time: START,
        venue_id: 'venue-1',
        venue_name: 'Skyline Banquets',
        venue_photo: null,
        my_side,
        pod_is_free: false,
        counterpart_name: my_side === 'HOST' ? 'Ravi' : 'Asha',
        counterpart_phone: '+91 98000 00000',
        counterpart_email: 'ravi@venue.test',
        host: HOST_CARD,
        venue: VENUE_CARD,
        read_marks: [],
        ...over,
      },
    },
  },
});

export const linesMock = (lines: object[]): MockedResponse => ({
  request: { query: VENUE_CHAT_MESSAGES, variables: { pod_id: 'pod-1', limit: VENUE_CHAT_PAGE } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { venueChatMessages: lines } },
});

export const offerMock = (offer: object | null, seen: unknown[] = []): MockedResponse => ({
  request: { query: POD_VENUE_OFFER_TERMS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: unknown) => {
    seen.push(variables);
    return { data: { podVenueOffer: offer } };
  },
});

// The same documents useVenueChatLineActions sends: MockedProvider matches on the printed query.
const REACT = gql(REACT_TO_VENUE_CHAT_MESSAGE_SDL);
const EDIT = gql(EDIT_VENUE_CHAT_MESSAGE_SDL);
const DELETE = gql(DELETE_VENUE_CHAT_MESSAGE_SDL);
const MARK_READ = gql(MARK_VENUE_CHAT_READ_SDL);

type Outcome = { line: object } | { error: Error };
const answer = (field: string, outcome: Outcome) =>
  'error' in outcome ? { error: outcome.error } : { result: { data: { [field]: outcome.line } } };

export const reactMock = (variables: { message_id: string; emoji: string }, outcome: Outcome): MockedResponse => ({
  request: { query: REACT, variables },
  ...answer('reactToVenueChatMessage', outcome),
});

export const editMock = (variables: { message_id: string; text: string }, outcome: Outcome): MockedResponse => ({
  request: { query: EDIT, variables },
  ...answer('editVenueChatMessage', outcome),
});

export const deleteMock = (message_id: string, error?: Error): MockedResponse => ({
  request: { query: DELETE, variables: { message_id } },
  ...(error ? { error } : { result: { data: { deleteVenueChatMessage: true } } }),
});

/** Answers every "read to the end" and keeps what each was sent. */
export const markReadMock = (sent: unknown[] = []): MockedResponse => ({
  request: { query: MARK_READ, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: unknown) => {
    sent.push(variables);
    return { data: { markVenueChatRead: true } };
  },
});
