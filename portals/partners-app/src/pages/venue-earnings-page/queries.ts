import { gql } from '@apollo/client';

/**
 * Venue-owner earnings summary + payout history — the same operation mWeb's
 * Venue Earnings page runs. The server sums every venue the owner has; the
 * fields are only the ones this page renders.
 */
export const VENUE_EARNINGS = gql`
  query VenueEarnings {
    myVenueEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
      pods_completed
      this_month_earnings
    }
    myVenuePayouts {
      id
      pod_title
      status
      amount_requested
      approved_amount
      created_at
      breakdown {
        version
        share_amount
        commission_pct
        commission_amount
        payout_amount
      }
    }
  }
`;

export interface VenueEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

interface PayoutBreakdown {
  version: number;
  share_amount: number;
  commission_pct: number;
  commission_amount: number;
  payout_amount: number;
}

export interface VenuePayout {
  id: string;
  pod_title: string;
  status: string;
  amount_requested: number;
  approved_amount?: number | null;
  created_at: string;
  breakdown?: PayoutBreakdown | null;
}

export interface VenueEarningsData {
  myVenueEarningsSummary: VenueEarningsSummary | null;
  myVenuePayouts: VenuePayout[] | null;
}

/**
 * What the payout pays: the approved amount once finance has approved it, else
 * the v2 breakdown's payout, else what was requested (mWeb's PayoutList rule).
 */
export const payableOf = (payout: VenuePayout): number =>
  payout.approved_amount ?? payout.breakdown?.payout_amount ?? payout.amount_requested;
