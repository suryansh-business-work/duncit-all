import { OfferChatCard, VenueMinBusinessNote, VenueOfferPinnedBar, type OfferChatViewer } from '@duncit/availability-calendar';
import type { PinnedOfferSource, VenueChatOfferMove, VenueChatSide, VenueMinBusinessRow } from '@duncit/utils';
import { defineDemo } from '../../types';

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
