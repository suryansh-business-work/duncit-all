import type { RentalBookingRow } from '@duncit/utils';
import type { MarkRentalOutput, MarkRentalValues } from './mark-rental.schema';

export type { MarkRentalOutput, MarkRentalValues };

export interface MarkRentalFormProps {
  booking: RentalBookingRow;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: MarkRentalOutput) => Promise<void> | void;
  onCancel: () => void;
}
