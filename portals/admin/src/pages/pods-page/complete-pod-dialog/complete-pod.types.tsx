export interface CompletePodValues {
  host_user_id: string;
  venue_bill_amount: number;
  bill_url: string;
  media_text: string;
  notes: string;
}

export interface CompletePodDialogProps {
  open: boolean;
  pod: any | null;
  users: any[];
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: CompletePodValues) => Promise<void> | void;
}

export interface SettlementPreviewProps {
  podId: string;
  venueBillAmount: number;
}
