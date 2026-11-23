import type { UploadSurface } from '@duncit/media-picker';
import type { RentalBookingRow } from '@duncit/utils';
import type { RentalProofOutput } from '@duncit/forms/schemas';

export type { RentalProofFormValues, RentalProofOutput } from '@duncit/forms/schemas';

export interface AddProofFormProps {
  booking: Pick<RentalBookingRow, 'name' | 'venue_id'>;
  /** The Upload Settings surface the photo picker caps and compresses for. */
  uploadSurface: UploadSurface;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: RentalProofOutput) => Promise<void> | void;
  onCancel: () => void;
}
