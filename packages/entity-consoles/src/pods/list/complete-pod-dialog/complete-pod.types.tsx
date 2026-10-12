export interface CompletePodValues {
  host_user_id: string;
  /** The venue's final bill. 0 = the booked slot price stands. */
  venue_bill_amount: number;
  /** The uploaded bill — the media picker's newline-separated value. */
  venue_bill_media: string;
  /** Pay the bill on top of the booked slot price rather than instead of it. */
  include_slot_price: boolean;
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
  venueBillAmount: number;
  /** The bill is paid on top of the booked slot price rather than instead of it. */
  includeSlotPrice: boolean;
  /** The co-host picked as the payout beneficiary — their commission override
   * prices the settlement, so the preview must quote the same host. */
  hostUserId: string;
}
