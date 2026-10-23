import { gql } from '@apollo/client';
import { VENUE_OFFER_FIELDS, type BookingOffer } from '@duncit/availability-calendar';

/** One request plus the venue's money on it — readable before AND after the
 * decision, so a re-opened email link shows the outcome instead of an error. */
export const VENUE_SLOT_DECISION = gql`
  query VenueSlotDecision($slot_id: ID!) {
    venueSlotDecision(slot_id: $slot_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
      whole_day
      price
      space_label
      requested_at
      pod_id
      pod_title
      pod_description
      host_name
      host_email
      host_phone
      decision
      decided_at
      decline_reason
      venue_commission_pct
      venue_commission_amount
      venue_receives
      pod_is_free
      offer { ${VENUE_OFFER_FIELDS} }
    }
  }
`;

export interface SlotDecisionRow {
  slot_id: string;
  venue_id: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  /** A whole-day (or whole-date-range) booking. */
  whole_day: boolean;
  price: number;
  space_label: string;
  requested_at: string;
  pod_id: string;
  pod_title: string;
  pod_description: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  decision: 'NONE' | 'APPROVED' | 'DECLINED';
  decided_at: string | null;
  decline_reason: string;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  /** A FREE pod: the host settles the venue directly, so every figure above is
   * 0 and the page shows the free-pod notice instead of the earnings. */
  pod_is_free: boolean;
  /** Set when the request is a host's offer: answered with Accept, Counter or Reject. */
  offer: BookingOffer | null;
}
