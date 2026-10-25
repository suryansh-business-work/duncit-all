import type { OfferQuote, OfferTerms } from '@/components/venue-offer/offer-format';
import {
  VenueOfferModel,
  VenueOfferParty,
  VenueOfferStatus,
  VenuePricingModel,
} from '@/generated/graphql/graphql';
import type { HostOfferAnswers } from '@/hooks/usePodVenueOffer';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
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

/** A host's per-guest offer for 20 guests, at least 8 paid for, waiting on the venue (round 1). */
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
  pets: false,
  status: VenueOfferStatus.Sent,
  round: 1,
  awaiting: VenueOfferParty.Venue,
  expires_at: '2026-08-30T18:00:00.000Z',
  quote: offerQuote(6000, 6600, 20),
  quote_min: offerQuote(2400, 2640, 8),
  counter: null,
  ...over,
});

/** The venue's counter: ₹350 per guest, at least 10, on round 2 — now the host's move. */
export const counteredOffer = (over: Partial<OfferTerms> = {}): OfferTerms =>
  offerTerms({
    status: VenueOfferStatus.Countered,
    round: 2,
    awaiting: VenueOfferParty.Host,
    counter: {
      model: VenueOfferModel.PerGuest,
      rate: 350,
      min_guests: 10,
      offerings: ['A projector'],
      note: 'Weekend rate',
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
