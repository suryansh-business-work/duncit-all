import type { OfferQuote, OfferTerms } from '@/components/venue-offer/offer-format';
import {
  PodMessageType,
  VenueChatSide,
  VenueOfferModel,
  VenueOfferParty,
  VenueOfferStatus,
  VenuePricingModel,
} from '@/generated/graphql/graphql';
import type { OfferReviseAnswers } from '@/hooks/useOfferRevise';
import type { HostOfferAnswers } from '@/hooks/usePodVenueOffer';
import type { VenueChatMessage, VenueChatRoom } from '@/hooks/useVenueChat';
import type { VenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';

/**
 * Booking-offer data for the offer suites: a priced quote, a live offer, a
 * venue-chat move and both sides' answer APIs with nothing in flight. Each
 * suite overrides only what its case is about.
 */

/** A server quote at `pax` guests: the venue's payout, Duncit's fee on top, the total the pod pays. */
export const offerQuote = (venuePayout: number, total: number, pax = 20): OfferQuote => ({
  model: VenuePricingModel.PerPax,
  rate: 300,
  pax,
  hours: 2,
  base: venuePayout,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_pct: 0,
  taxes: 0,
  platform_fee_pct: 10,
  platform_fee: total - venuePayout,
  venue_payout: venuePayout,
  total,
  deposit: 0,
});

/**
 * A host's per-guest offer for 20 guests, at least 8 paid for, waiting on the
 * venue (round 1) — three counters a side, none used yet.
 */
export const offerTerms = (over: Partial<OfferTerms> = {}): OfferTerms => ({
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  pod_id: 'pod-1',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  space_label: 'Court 2',
  model: VenueOfferModel.PerGuest,
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['A projector', '10 chairs'],
  note: 'We bring our own snacks',
  images: [],
  pets: false,
  status: VenueOfferStatus.Sent,
  round: 1,
  awaiting: VenueOfferParty.Venue,
  expires_at: '2026-08-30T18:00:00.000Z',
  counters_per_side: 3,
  host_counters_used: 0,
  venue_counters_used: 0,
  quote: offerQuote(6000, 6600, 20),
  quote_min: offerQuote(2400, 2640, 8),
  counter: null,
  ...over,
});

/** The venue's counter: ₹350 per guest, at least 10, on round 2 — now the host's move; the venue has used one counter. */
export const counteredOffer = (over: Partial<OfferTerms> = {}): OfferTerms =>
  offerTerms({
    status: VenueOfferStatus.Countered,
    round: 2,
    awaiting: VenueOfferParty.Host,
    venue_counters_used: 1,
    counter: {
      model: VenueOfferModel.PerGuest,
      rate: 350,
      min_guests: 10,
      offerings: ['A projector'],
      note: 'Weekend rate',
      images: [],
      at: '2026-08-29T10:00:00.000Z',
      quote: offerQuote(7000, 7700, 20),
      quote_min: offerQuote(3500, 3850, 10),
    },
    ...over,
  });

type ChatOfferMove = NonNullable<VenueChatMessage['offer']>;

/** One move of the offer as a venue-chat OFFER line carries it. */
export const offerMove = (over: Partial<ChatOfferMove> = {}): ChatOfferMove => ({
  slot_id: 'slot-1',
  round: 1,
  event: 'OFFER',
  by: 'HOST',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['A projector'],
  note: '',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  space_label: '',
  pets: false,
  venue_receives_min: 2400,
  venue_receives_max: 6000,
  total_min: 2640,
  total_max: 6600,
  expires_at: '2026-08-30T18:00:00.000Z',
  reason: '',
  images: [],
  ...over,
});

const idleState = () => ({
  busy: false,
  error: null,
  notice: null,
  clearError: jest.fn(),
  clearNotice: jest.fn(),
});

/** The venue's answers, nothing in flight; each answer resolves `done` (true closes its sheet). */
export const venueAnswersApi = (
  over: Partial<VenueOfferAnswers> = {},
  done = true,
): VenueOfferAnswers => ({
  ...idleState(),
  accept: jest.fn().mockResolvedValue(done),
  reject: jest.fn().mockResolvedValue(done),
  counter: jest.fn().mockResolvedValue(done),
  ...over,
});

/** Edit / withdraw of one's own counter, nothing in flight; each resolves `done`. */
export const reviseAnswersApi = (
  over: Partial<OfferReviseAnswers> = {},
  done = true,
): OfferReviseAnswers => ({
  ...idleState(),
  edit: jest.fn().mockResolvedValue(done),
  withdraw: jest.fn().mockResolvedValue(done),
  ...over,
});

/** The host's answers, nothing in flight; each answer resolves `done`. */
export const hostAnswersApi = (
  over: Partial<HostOfferAnswers> = {},
  done = true,
): HostOfferAnswers => ({
  ...idleState(),
  accept: jest.fn().mockResolvedValue(done),
  reject: jest.fn().mockResolvedValue(done),
  counter: jest.fn().mockResolvedValue(done),
  ...over,
});

/**
 * A venue thread as `venueChatRoom` reads it: the host's side unless told
 * otherwise, both parties' contact cards, and nobody's read mark yet.
 */
export const venueChatRoomFixture = (over: Partial<VenueChatRoom> = {}): VenueChatRoom => ({
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_date_time: null,
  venue_id: 'venue-1',
  venue_name: 'Court House',
  venue_photo: null,
  my_side: VenueChatSide.Host,
  pod_is_free: false,
  counterpart_name: 'Asha Rao',
  counterpart_phone: '+91 9000000001',
  counterpart_email: null,
  host: {
    user_id: 'host-1',
    name: 'Ravi Kumar',
    photo: null,
    username: 'ravi',
    bio: 'Weekend badminton host',
    phone: '+91 9000000002',
    email: 'ravi@example.com',
  },
  venue: {
    venue_id: 'venue-1',
    venue_name: 'Court House',
    photo: null,
    venue_type: 'Sports court',
    capacity: 40,
    address: '12 MG Road, Indiranagar, Bengaluru',
    name: 'Asha Rao',
    phone: '+91 9000000001',
    email: '',
  },
  read_marks: [],
  ...over,
});

/** A text line in a venue thread, from the venue's side (`u2`) unless told otherwise; each suite gives it its own words. */
export const venueChatLine = (over: Partial<VenueChatMessage> = {}): VenueChatMessage => ({
  id: 'l1',
  pod_id: 'pod-1',
  club_id: null,
  user_id: 'u2',
  user_name: 'Asha',
  user_photo: null,
  type: PodMessageType.Text,
  text: null,
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: '2026-08-29T10:00:00.000Z',
  reply_to_id: null,
  reply_to: null,
  mentions: [],
  mention_users: [],
  edited_at: null,
  offer: null,
  ...over,
});
