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
      venue_payout
      platform_fee
      total
    }
  }
`;
