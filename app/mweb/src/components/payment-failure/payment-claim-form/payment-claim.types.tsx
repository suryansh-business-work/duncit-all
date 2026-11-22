import type { PaymentClaimValues } from '@duncit/forms/schemas';

/** What the claim form holds — the shared @duncit/forms contract the native sheet uses too. */
export type PaymentClaimFormValues = PaymentClaimValues;

/** The registered contact support will reach the buyer on; '' when the account has none. */
export interface PaymentClaimContact {
  phone: string;
  email: string;
}

export interface PaymentClaimFormProps {
  submitting: boolean;
  /** Inline failure from the last submit; the buyer can fix or resend. */
  error: string | null;
  contact: PaymentClaimContact;
  onSubmit: (values: PaymentClaimFormValues) => void | Promise<void>;
  onCancel: () => void;
}
