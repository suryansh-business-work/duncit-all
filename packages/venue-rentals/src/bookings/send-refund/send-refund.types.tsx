export interface SendRefundValues {
  note: string;
}

/** The trimmed note the mutation sends. */
export type SendRefundOutput = SendRefundValues;

export interface SendRefundFormProps {
  /** The confirmation sentence: how much Razorpay sends, and to whom. */
  body: string;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SendRefundOutput) => Promise<void> | void;
  onCancel: () => void;
}
