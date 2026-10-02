import { z } from 'zod';
import { filled, matches, maxLen, obj, shape, str } from '@utils/zod-fields';
import { DELETION_REQUEST_SURFACES } from './accountDeletion.model';

/**
 * What a member may put in the request.
 *
 * Moved here from auth's `deleteMyAccountSchema` along with the mutation it
 * guarded: the code is still the proof, but the thing it now buys is a queued
 * request, and the reason line rides with it.
 */
export const submitAccountDeletionRequestSchema = obj(
  shape({
    otp: str(z.string().check(matches(/^\d{6}$/, 'Enter the 6 digit OTP'), filled()), { required: true }),
    // Optional and free text — the person reviewing it reads this, nothing
    // decides on it. Bounded because it reaches a table cell.
    reason: str(z.string().check(maxLen(1000)).optional()),
    surface: str(z.enum(DELETION_REQUEST_SURFACES).optional(), { oneOf: DELETION_REQUEST_SURFACES }),
  })
);

export type SubmitAccountDeletionRequestDTO = z.infer<typeof submitAccountDeletionRequestSchema>;
