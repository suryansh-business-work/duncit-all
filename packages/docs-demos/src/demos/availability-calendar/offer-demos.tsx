import {
  OfferChatCard,
  OfferTermsPanel,
  VenueMinBusinessNote,
  VenueOfferPinnedBar,
  type OfferChatViewer,
  type OfferTerms,
  type PriceBreakdown,
} from '@duncit/availability-calendar';
import type { PinnedOfferSource, VenueChatOfferMove, VenueChatSide, VenueMinBusinessRow } from '@duncit/utils';
import { defineDemo } from '../../types';

/** A free venue's quote: nothing to pay at any guests. */
const FREE_QUOTE: PriceBreakdown = {
  model: 'FLAT',
  rate: 0,
  pax: 20,
  hours: 2,
  date: '2026-12-05',
  base: 0,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: 0,
  gst_pct: 0,
  taxes: 0,
  venue_payout: 0,
  platform_fee_pct: 10,
  platform_fee: 0,
  total: 0,
  deposit: 0,
};

/** One move of a booking offer, as the pod's venue chat draws it. */
export const offerChatCardDemo = defineDemo<{ move: VenueChatOfferMove; viewer: OfferChatViewer; newest: boolean }>({
  id: 'offer-chat-card',
  title: 'Booking offers: one move as a card in the venue chat',
  note:
    "Switch viewer between VENUE, HOST and STAFF: the heading and the money read from that side (staff read it as a record, in the third person). Set min_guests to 20 and the guests and money collapse to one amount. Change event to DECLINED with a reason, or EXPIRED — and newest false hides the answer-by time. Without a live offer this demo shows no answer buttons; the chat pages pass `answering`.",
  mock: {
    viewer: 'VENUE',
    newest: true,
    move: {
      slot_id: 'slot-1',
      round: 1,
      event: 'OFFER',
      by: 'HOST',
      model: 'PER_GUEST',
      rate: 300,
      min_guests: 8,
      max_guests: 20,
      offerings: ['10 chairs', 'A projector'],
      note: 'We will bring our own speakers.',
      start_at: '2026-12-05T12:30:00.000Z',
      end_at: '2026-12-05T14:30:00.000Z',
      space_label: 'Terrace',
      pets: false,
      venue_receives_min: 2400,
      venue_receives_max: 6000,
      total_min: 2640,
      total_max: 6600,
      expires_at: '2026-12-02T06:30:00.000Z',
      reason: '',
    },
  },
  render: (mock) => <OfferChatCard move={mock.move} viewer={mock.viewer} newest={mock.newest} />,
});

/** The bar pinned to the top of a venue chat: where the offer stands, and the counters each side has left. */
export const venueOfferPinDemo = defineDemo<{ offer: PinnedOfferSource; side: VenueChatSide }>({
  id: 'venue-offer-pin',
  title: 'Booking offers: the pinned bar at the top of the venue chat',
  note:
    'Flip side between HOST and VENUE: "Your move" follows awaiting. Pod Settings splits a total of counters equally (counters_per_side); raise venue_counters_used to 3 and the venue has none left. Set status to ACCEPTED and the counters and the answer-by time go.',
  mock: {
    side: 'HOST',
    offer: {
      status: 'COUNTERED',
      awaiting: 'HOST',
      expires_at: '2026-12-02T06:30:00.000Z',
      counters_per_side: 3,
      host_counters_used: 1,
      venue_counters_used: 2,
    },
  },
  render: (mock) => <VenueOfferPinnedBar offer={mock.offer} side={mock.side} />,
});

/** A host asked the venue for the window free: the venue accepts or declines it, and nobody counters. */
export const freeVenueOfferDemo = defineDemo<{ offer: OfferTerms; podIsFree: boolean }>({
  id: 'free-venue-offer',
  title: 'Booking offers: a free venue, as the venue answers it',
  note:
    'The host picked Free venue and said why, so the terms read "Free venue", no money is quoted and the venue reads the reason. counters_per_side is 0 — a free booking is only accepted or declined, and the pinned bar says so. Change free_justification.reason to INITIATIVE or CAMPAIGN, or clear details; set model to FLAT with a rate and free_pod true for a priced offer on a free pod.',
  mock: {
    podIsFree: false,
    offer: {
      slot_id: 'slot-1',
      status: 'SENT',
      round: 1,
      awaiting: 'VENUE',
      model: 'FREE',
      rate: 0,
      pax: 20,
      min_guests: 0,
      offerings: ['A quiet corner', '10 chairs'],
      note: 'We will credit your venue on every post.',
      images: [],
      pets: false,
      space_label: 'Terrace',
      expires_at: '2026-12-02T06:30:00.000Z',
      counters_per_side: 0,
      host_counters_used: 0,
      venue_counters_used: 0,
      free_pod: false,
      free_justification: { reason: 'PROMOTIONAL', details: 'Launch week for the new terrace', accepted_at: '2026-12-01T06:30:00.000Z' },
      quote: FREE_QUOTE,
      quote_min: FREE_QUOTE,
      counter: null,
    },
  },
  render: (mock) => (
    <>
      <VenueOfferPinnedBar offer={mock.offer} side="VENUE" />
      <OfferTermsPanel offer={mock.offer} podIsFree={mock.podIsFree} />
    </>
  ),
});

/** What a picked venue usually expects from one booking, as Create Pod shows it. */
export const venueMinBusinessDemo = defineDemo<{ rows: VenueMinBusinessRow[] }>({
  id: 'venue-min-business',
  title: 'Booking offers: the business a venue hopes each booking brings',
  note: 'The venue lists one amount per basis in its Booking offers settings. Remove every row and nothing is drawn; a basis this client does not know is left out.',
  mock: {
    rows: [
      { model: 'PER_GUEST', amount: 200 },
      { model: 'PER_HOUR', amount: 400 },
    ],
  },
  render: (mock) => <VenueMinBusinessNote rows={mock.rows} money={(value) => `₹${value}`} testId="demo-min-business" />,
});
