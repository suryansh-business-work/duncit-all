import { OfferChatCard, type OfferChatViewer } from '@duncit/availability-calendar';
import type { VenueChatOfferMove } from '@duncit/utils';
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
