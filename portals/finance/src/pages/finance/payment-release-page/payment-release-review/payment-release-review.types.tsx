export interface PaymentReleaseReviewValues {
  status: 'APPROVED' | 'REJECTED';
  approval_type: 'FULL' | 'PARTIAL';
  approved_amount: number;
  approval_reason: string;
  /** Who funds the payout's shortfall — asked for, and required, only when approving one that has a shortfall. */
  shortfall_funding_note?: string;
}

export interface PaymentReleaseReviewFormProps {
  request: any;
  /** The Finance currency symbol, for the shortfall the dialog names. */
  symbol: string;
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: PaymentReleaseReviewValues) => Promise<void> | void;
}