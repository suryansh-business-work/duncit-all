/** One ledger expense as the drawer reads it back. */
export interface ExpenseRecord {
  id: string;
  expense_id: string;
  date: string;
  category: string;
  amount: number;
  refund_total: number;
  net_amount: number;
  description: string;
  vendor_name: string;
  payment_method: string;
  reference: string;
  attachment_url: string;
  related_from_type: string;
  related_from_id: string | null;
  related_from_name: string;
  paid_by: string;
  compensation_status: string;
  compensation_method: string;
  compensated_amount: number;
  pending_compensation: number;
  compensation_date: string | null;
  compensation_reference: string;
  refunds: Array<{
    refund_id: string;
    date: string;
    amount: number;
    note: string;
    created_at: string;
  }>;
  created_at: string;
}

export interface ExpenseFormValues {
  date: Date;
  /** A configured CATEGORY key — never a hand-typed word. */
  category: string;
  /** The raw box contents; the schema is what turns it into money. */
  amount: string;
  vendor_name: string;
  payment_method: string;
  reference: string;
  description: string;
  attachment_url: string;
  /** A configured RELATED_FROM_TYPE key; '' means "not attributed". */
  related_from_type: string;
  /** The entity's document id. Its NAME is resolved server-side on save. */
  related_from_id: string;
  paid_by: string;
  compensation_method: string;
  compensated_amount: string;
  compensation_date: Date | null;
  compensation_reference: string;
  /**
   * The one part of the compensation status a person states. PENDING /
   * PARTIAL / FULL all follow from the amount, so there is no dropdown for
   * them and nothing to keep in step with the numbers.
   */
  compensation_rejected: boolean;
}

export interface ExpenseFormProps {
  /** The expense being edited, or null to record a new one. */
  expense: ExpenseRecord | null;
  /** Admin-configured currency symbol for the amount adornments. */
  currency: string;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void> | void;
}

/** The GraphQL `CreateExpenseInput` shape the mutations take. */
export interface ExpenseInput {
  date: string;
  category: string;
  amount: number;
  vendor_name: string;
  payment_method: string;
  reference: string;
  description: string;
  attachment_url: string;
  related_from_type: string;
  related_from_id: string | null;
  paid_by: string;
  compensation_method: string;
  compensated_amount: number;
  compensation_date: string | null;
  compensation_reference: string;
  compensation_rejected: boolean;
}
