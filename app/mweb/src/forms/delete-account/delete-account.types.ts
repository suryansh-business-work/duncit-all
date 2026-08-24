import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';
import { fallbackT, type Translate } from '../../i18n/fallback';

/**
 * Delete-account contract — RHF + Zod.
 *
 * The code still proves who is asking; what it buys has changed. Submitting
 * this form FILES a request for the Tech portal rather than deleting anything,
 * so the reason line rides along with it — somebody reads that before acting.
 * Mirrors the server's `submitAccountDeletionRequestSchema`, and the native
 * app validates the identical rules.
 */
export function makeDeleteAccountSchema(t: Translate = fallbackT) {
  return z.object({
    otp: z.string().trim().regex(OTP_6, t('mweb.account.deletion.validation.otpPattern')),
    reason: z.string().trim().max(1000, t('mweb.account.deletion.validation.reasonTooLong')),
  });
}

export const deleteAccountSchema = makeDeleteAccountSchema();

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

export const deleteAccountDefaults: DeleteAccountValues = {
  otp: '',
  reason: '',
};
