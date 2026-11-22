/** REVIEW decides a yellow case; NOT_REFUNDABLE closes a never-captured one as a bank reversal. */
export type ReviewFailedPaymentMode = 'REVIEW' | 'NOT_REFUNDABLE';

export interface ReviewFailedPaymentValues {
  decision: 'APPROVED' | 'REJECTED';
  note: string;
}

export interface ReviewFailedPaymentFormProps {
  open: boolean;
  mode: ReviewFailedPaymentMode;
  /** Shown in the dialog so the person knows which case they are deciding. */
  subject: string;
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: ReviewFailedPaymentValues) => Promise<void> | void;
}
