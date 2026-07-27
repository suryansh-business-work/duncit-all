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
        platform_fee_pct
        platform_fee_amount
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

/** The waterfall fields the panel renders (all server-computed rupees). */
export interface EarningsWaterfall {
  amount: number;
  gst_pct: number;
  gst_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  club_admin_pct: number;
  club_admin_amount: number;
  venue_amount: number;
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  host_earn_pct: number;
}

export interface EarningsProjection {
  total_spots: number;
  payable_spots: number;
  waterfall: EarningsWaterfall;
}
