import type { PodExpenseRow } from '../queries';

export interface PodExpenseFormValues {
  /** The day the money left Duncit, not the day the row was typed. */
  date: Date;
  category: string;
  amount: number;
  vendor_name: string;
  payment_method: string;
  bill_number: string;
  /** Uploaded bill / invoice (image or PDF). Empty when none is attached yet. */
  bill_url: string;
  reference: string;
  description: string;
}

export interface PodExpenseFormProps {
  /** The entry being edited, or null to record a new one. */
  expense: PodExpenseRow | null;
  /** Admin-configured currency symbol for the amount adornment. */
  currency: string;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: PodExpenseFormValues) => Promise<void> | void;
}

/** The GraphQL `PodExpenseInput` shape the mutations take. */
export interface PodExpenseInput {
  date: string;
  category: string;
  amount: number;
  vendor_name: string;
  payment_method: string;
  bill_number: string;
  bill_url: string;
  reference: string;
  description: string;
}
