export interface CompletePodValues {
  host_user_id: string;
  /** The total on the venue's final bill, as typed — the proof of the agreed amount, required on a paid venue pod. */
  venue_bill_amount: string;
  /** The uploaded bill — the media picker's newline-separated value. */
  venue_bill_media: string;
  /** Charges on the bill beyond the agreed amount, as typed. Empty = none. */
  venue_extra_amount: string;
  /** Guests the venue charged for (a per-guest slot), as typed. Empty = everyone booked. */
  venue_pax: string;
  /** Hours the pod ran past its slot, as typed. Empty = none. */
  overtime_hours: string;
  media_text: string;
  notes: string;
}

export interface CompletePodDialogProps {
  open: boolean;
  pod: any;
  users: any[];
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: CompletePodValues) => Promise<void> | void;
}

export interface SettlementPreviewProps {
  podId: string;
  /** The venue's final bill total as typed — the proof of the agreed amount. */
  venueBillAmount: number;
  /** Charges on the bill beyond the agreed amount, as the server takes them (`venueExtraAmountOf`). */
  venueExtraAmount: number;
  /** The co-host picked as the payout beneficiary — their commission override
   * prices the settlement, so the preview must quote the same host. */
  hostUserId: string;
  /** The venue's usage typed so far — it prices the slot. */
  venueUsage?: { venue_pax?: number; overtime_hours?: number };
  /** The pod is FREE: no payout to preview. The settlement's `is_free` agrees once loaded. */
  free?: boolean;
  /** Told whether the agreed offer is a free venue (owed nothing, so its bill proves only extras) each time that changes. */
  onFreeVenue?: (freeVenue: boolean) => void;
}
