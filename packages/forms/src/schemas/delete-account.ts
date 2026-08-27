import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * Delete-account contract.
 *
 * The code still proves who is asking; what it buys has changed. Submitting
 * this FILES a request for the Tech portal rather than deleting anything, so
 * the reason line rides along with it — somebody reads that before acting.
 * Mirrors the server's `submitAccountDeletionRequestSchema`.
 */
export function makeDeleteAccountSchema(t: Translate) {
  return z.object({
    otp: z.string().trim().regex(OTP_6, t('mweb.account.deletion.validation.otpPattern')),
    reason: z.string().trim().max(1000, t('mweb.account.deletion.validation.reasonTooLong')),
  });
}

export type DeleteAccountValues = z.infer<ReturnType<typeof makeDeleteAccountSchema>>;

export const deleteAccountDefaults: DeleteAccountValues = { otp: '', reason: '' };
