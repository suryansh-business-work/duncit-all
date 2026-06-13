/** Shared types for the host's "Complete Pod" flow (venue bill + party media). */

export interface PodCompleteValues {
  venue_bill_amount: string;
  bill_url: string;
  media_text: string;
}

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  bill_url: '',
  media_text: '',
};

/** One reconciled settlement party returned by podSettlementPreview / breakdown. */
export interface SettlementParty {
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number;
  duncit_amount: number;
  payout_pct: number;
  payout_amount: number;
}

export interface PodSettlement {
  currency_symbol: string;
  collected_total: number;
  has_venue: boolean;
  host: SettlementParty;
  venue: SettlementParty | null;
}
