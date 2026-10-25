import { gql, type TypedDocumentNode } from '@apollo/client';

/** One venue booking's money terms, as staff read them. */
export interface VenueBookingTermsRow {
  slot_id: string;
  pod_id: string | null;
  pod_title: string;
  start_at: string;
  end_at: string;
  status: string;
  offer_status: string | null;
  model: string;
  rate: number;
  /** The fewest guests the venue is paid for, and the most (the pod's spots); 0 when unknown. */
  min_guests: number;
  max_guests: number;
  /** What the venue was asked to provide, and the note on the terms. */
  offerings: string[];
  note: string;
  /** 1 for the host's offer, +1 per counter; 0 for a booking made before offers. */
  round: number;
  /** Whose move it is while pending (HOST / VENUE); null once closed. */
  awaiting: string | null;
  /** When the pending answer is due (ISO), or null. */
  expires_at: string | null;
  venue_payout: number;
  platform_fee: number;
  total: number;
}

/** A venue's pending and booked holds with what was agreed (or is on the table), newest first. */
export const ADMIN_VENUE_BOOKING_TERMS: TypedDocumentNode<
  { adminVenueBookingTerms: VenueBookingTermsRow[] },
  { venue_id: string; limit?: number | null }
> = gql`
  query AdminVenueBookingTerms($venue_id: ID!, $limit: Int) {
    adminVenueBookingTerms(venue_id: $venue_id, limit: $limit) {
      slot_id
      pod_id
      pod_title
      start_at
      end_at
      status
      offer_status
      model
      rate
      min_guests
      max_guests
      offerings
      note
      round
      awaiting
      expires_at
      venue_payout
      platform_fee
      total
    }
  }
`;
