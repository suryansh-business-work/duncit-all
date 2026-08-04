import { gql } from '@apollo/client';

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
    }
  }
`;

export interface SlotDecisionRow {
  slot_id: string;
  venue_id: string;
  venue_name: string;
  start_at: string;
  end_at: string;
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
}
