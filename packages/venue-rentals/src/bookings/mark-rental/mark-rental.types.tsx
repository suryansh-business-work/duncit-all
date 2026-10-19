import type { RentalBookingRow } from '@duncit/utils';
import type { MarkRentalOutput } from '@duncit/forms/schemas';

export type { MarkRentalOutput, MarkRentalValues } from '@duncit/forms/schemas';

export interface MarkRentalFormProps {
  booking: RentalBookingRow;
  /** Finance's rule: whether the venue hands the deposit back at the venue. */
  depositRefundable: boolean;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: MarkRentalOutput) => Promise<void> | void;
  onCancel: () => void;
}
