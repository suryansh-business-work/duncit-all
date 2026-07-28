import { gql } from '@apollo/client';

/** Server-side potential-earnings waterfall. The server bills payable spots
 * (total − 1, the host's own seat is free) — no money math happens here. */
export const POTENTIAL_POD_EARNINGS = gql`
  query PotentialPodEarnings(
    $pod_amount: Float!
    $no_of_spots: Int!
    $venue_id: ID
    $venue_amount: Float
  ) {
    potentialPodEarnings(
      pod_amount: $pod_amount
      no_of_spots: $no_of_spots
      venue_id: $venue_id
      venue_amount: $venue_amount
    ) {
      total_spots
      payable_spots
      waterfall {
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        club_admin_pct
        club_admin_amount
        venue_amount
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        host_earn_pct
      }
    }
  }
`;

/** ₹x99 ticket-price ladder for the Step-4 "Suggested Ticket Prices" modal.
 * Same inputs as the earnings projection minus the price the host is choosing —
 * the server returns only candidates that pay the host something. */
export const SUGGESTED_TICKET_PRICES = gql`
  query SuggestedTicketPrices($no_of_spots: Int!, $venue_id: ID, $venue_amount: Float) {
    suggestedTicketPrices(no_of_spots: $no_of_spots, venue_id: $venue_id, venue_amount: $venue_amount) {
      price
      host_receives
    }
  }
`;

/** The waterfall shape the shared statement builder consumes (server rupees). */
export type { EarningsWaterfall } from '@duncit/utils';

export interface EarningsProjection {
  total_spots: number;
  payable_spots: number;
  waterfall: import('@duncit/utils').EarningsWaterfall;
}

export interface SuggestedTicketPrice {
  price: number;
  host_receives: number;
}
