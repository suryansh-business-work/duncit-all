import { gql } from '@apollo/client';

/** Venue-owner earnings summary + payout history (Venue Earnings page). */
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

/** Summary-only variant for the compact link card on the Venue Studio page. */
export const VENUE_EARNINGS_SUMMARY = gql`
  query VenueEarningsSummary {
    myVenueEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
    }
  }
`;
