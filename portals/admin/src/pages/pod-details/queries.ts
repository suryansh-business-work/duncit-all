import { gql } from '@apollo/client';

/** One line of the finance waterfall, as `@duncit/ui` draws it. */
const WATERFALL_FIELDS = `
  version
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
  venue_commission_pct
  venue_commission_amount
  venue_receives
  host_amount
  host_commission_pct
  host_commission_amount
  host_receives
  duncit_revenue
  host_earn_pct
`;

/** The live cancellation-risk picture for one pod — computed by the server
 * from the same waterfall the auto-cancel sweep decides on. */
export const POD_CANCELLATION_RISK = gql`
  query PodCancellationRisk($id: ID!) {
    podCancellationRisk(pod_doc_id: $id) {
      pod_id
      state
      at_risk
      hours_until_start
      lead_hours
      window_hours
      alert_hours
      cancel_at
      currency_symbol
      collected_total
      venue_amount
      shortfall
      waterfall { ${WATERFALL_FIELDS} }
      attendees {
        booked_seats
        total_spots
        seats_available
        ticket_price
        spots_needed
      }
      alerted_at
      alert_count
      next_alert_at
    }
  }
`;

export interface PodCancellationRiskAttendees {
  booked_seats: number;
  /** 0 means unlimited. */
  total_spots: number;
  seats_available: number;
  ticket_price: number;
  /** Bookings at the ticket price that would close the gap; null when bookings alone cannot. */
  spots_needed: number | null;
}

export interface PodCancellationRiskView {
  pod_id: string;
  state:
    | 'AT_RISK'
    | 'HEALTHY'
    | 'AUTO_CANCEL_OFF'
    | 'NO_VENUE_COST'
    | 'NOT_UPCOMING'
    | 'OUTSIDE_WINDOW';
  at_risk: boolean;
  hours_until_start: number;
  lead_hours: number;
  window_hours: number;
  alert_hours: number;
  cancel_at: string | null;
  currency_symbol: string;
  collected_total: number;
  venue_amount: number;
  shortfall: number;
  waterfall: Record<string, number>;
  attendees: PodCancellationRiskAttendees;
  alerted_at: string | null;
  alert_count: number;
  next_alert_at: string | null;
}
