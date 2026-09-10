export interface CompletePodValues {
  host_user_id: string;
  venue_bill_amount: number;
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
  /** The co-host picked as the payout beneficiary — their commission override
   * prices the settlement, so the preview must quote the same host. */
  hostUserId: string;
}
