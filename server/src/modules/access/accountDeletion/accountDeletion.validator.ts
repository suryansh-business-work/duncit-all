import * as yup from 'yup';
import { DELETION_REQUEST_SURFACES } from './accountDeletion.model';

/**
 * What a member may put in the request.
 *
 * Moved here from auth's `deleteMyAccountSchema` along with the mutation it
 * guarded: the code is still the proof, but the thing it now buys is a queued
 * request, and the reason line rides with it.
 */
export const submitAccountDeletionRequestSchema = yup.object({
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit OTP')
    .required(),
  // Optional and free text — the person reviewing it reads this, nothing
  // decides on it. Bounded because it reaches a table cell.
  reason: yup.string().max(1000).optional(),
  surface: yup.string().oneOf([...DELETION_REQUEST_SURFACES]).optional(),
});

export type SubmitAccountDeletionRequestDTO = yup.InferType<
  typeof submitAccountDeletionRequestSchema
>;
