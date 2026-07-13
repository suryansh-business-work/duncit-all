export interface PaymentReleaseReviewValues {
  status: 'APPROVED' | 'REJECTED';
  approval_type: 'FULL' | 'PARTIAL';
  approved_amount: number;
  approval_reason: string;
}

export interface PaymentReleaseReviewFormProps {
  request: any;
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: PaymentReleaseReviewValues) => Promise<void> | void;
}