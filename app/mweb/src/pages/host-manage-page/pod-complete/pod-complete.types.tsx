/** Shared types for the host's "Complete Pod" flow (venue bill amount + party media). */

export interface PodCompleteValues {
  venue_bill_amount: string;
  media_text: string;
}

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  media_text: '',
};

/** The GST-inclusive money waterfall for one pod (finance engine v2):
 * payment → GST → platform fee → pool → venue's fixed slot price → the host
 * keeps the remainder → Duncit commission out of each side. */
export interface PodFinanceWaterfall {
  version: number;
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  venue_amount: number;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  duncit_revenue: number;
  host_earn_pct: number;
}

/** One booking on the completion roster. Attendance comes from the door scan,
 * so `attended` is true only once a host has scanned that ticket. */
export interface PodSettlementAttendee {
  membership_id: string;
  user_id: string;
  name: string;
  seats: number;
  attended: boolean;
  attended_at: string | null;
  amount: number;
}

export interface PodSettlement {
  currency_symbol: string;
  collected_total: number;
  has_venue: boolean;
  /** Seats the settlement was computed on — the ones scanned in. */
  paying_attendees: number;
  attended_seats: number;
  booked_seats: number;
  /** Money from the attended bookings: what the payout was computed from. */
  attended_total: number;
  attendees: PodSettlementAttendee[];
  waterfall: PodFinanceWaterfall;
}
