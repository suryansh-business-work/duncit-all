import { VenueRentalUnit } from '@/generated/graphql/graphql';
import type { RentalDetail } from '@/hooks/useRentalBookingDetail';

/**
 * One rental as the server hands its venue the detail view: a racket returned
 * damaged, ₹300 of the ₹500 deposit being refunded through Razorpay, with a
 * proof and its activity. Tests override what they need.
 */
/** The pod the fixture rental was booked for (test data, not interface copy). */
export const FIXTURE_POD_TITLE = 'Sunday Smash';

export function rentalDetailFixture(over: Partial<RentalDetail> = {}): RentalDetail {
  return {
    booking: {
      id: 'b1',
      currency_symbol: '₹',
      name: 'Racket',
      image_url: '',
      unit: VenueRentalUnit.Slot,
      rate: 300,
      units: 1,
      quantity: 1,
      rent_amount: 300,
      deposit_amount: 500,
      status: 'DAMAGED',
      damage_claim: 200,
      damage_note: 'Cracked frame',
      refund_due: 300,
      refund_status: 'DUE',
      deposit_at_venue: 0,
      venue_amount: 470,
      marked_at: '2026-11-21T18:00:00.000Z',
      created_at: '2026-11-20T10:00:00.000Z',
      refund_state: 'PROCESSING',
      refund_eligible: 300,
      refund_pending: 300,
      refunded_amount: 0,
      refund_outstanding: 300,
      refund_review_reason: null,
      deposit_policy: 'DUNCIT_REFUND',
    },
    guest: { name: 'Asha Rao', phone: '+919876543210' },
    venue: {
      name: 'Smash Arena',
      contact_name: 'Ravi',
      phone: '+918888888888',
      address: '12 Court Road',
    },
    pod: {
      title: FIXTURE_POD_TITLE,
      starts_at: '2026-11-21T16:00:00.000Z',
      ends_at: '2026-11-21T18:00:00.000Z',
    },
    refunds: [
      {
        id: 'rf1',
        source: 'RENTAL',
        status: 'PROCESSING',
        amount: 300,
        requested_at: '2026-11-21T18:05:00.000Z',
        processed_at: null,
        created_at: '2026-11-21T18:01:00.000Z',
      },
    ],
    proofs: [
      {
        note: 'Frame cracked at the throat',
        image_urls: ['https://ik.imagekit.io/duncit/proof-1.jpg'],
        added_by_name: 'Ravi',
        added_by_role: 'VENUE',
        added_at: '2026-11-21T18:02:00.000Z',
      },
    ],
    events: [
      {
        type: 'DAMAGED',
        at: '2026-11-21T18:00:00.000Z',
        actor_name: 'Ravi',
        actor_role: 'VENUE',
        amount: 200,
        detail: 'Cracked frame',
      },
      {
        type: 'REFUND_QUEUED',
        at: '2026-11-21T18:01:00.000Z',
        actor_name: '',
        actor_role: 'SYSTEM',
        amount: 300,
        detail: '',
      },
    ],
    ...over,
  };
}
