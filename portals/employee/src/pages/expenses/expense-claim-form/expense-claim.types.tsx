import type { EmployeeExpenseClaim } from '@duncit/utils';

export interface ExpenseClaimFormValues {
  /** The day the employee actually paid, not the day the claim was typed. */
  date: Date;
  category: string;
  /** The raw box contents — the schema is what turns it into money. */
  amount: string;
  merchant: string;
  payment_method: string;
  bill_number: string;
  /** Uploaded bill / receipt (image or PDF). Empty when none is attached yet. */
  bill_url: string;
  reference: string;
  description: string;
}

export interface ExpenseClaimFormProps {
  /** The claim being edited, or null to file a new one. */
  claim: EmployeeExpenseClaim | null;
  /** Admin-configured currency symbol for the amount adornment. */
  currency: string;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: ExpenseClaimFormValues) => Promise<void> | void;
}

