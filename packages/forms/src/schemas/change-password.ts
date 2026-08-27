import { z } from 'zod';

import { makePasswordWithOtpSchema } from './password-with-otp';
import type { Translate } from './translate';

/**
 * Changing a password from inside the account is two steps:
 *  1. prove the current password, which requests a one-time code;
 *  2. enter that code plus the new password, twice.
 *
 * Mirrors the server's `requestPasswordChangeOtp` / `changePasswordWithOtp`
 * rules. Both surfaces had this schema hard-coded in English — the only pair of
 * the set that never reached a translator at all (rule 38) — so the messages now
 * come from keys the catalogue already carries.
 */
export function makeCurrentPasswordSchema(t: Translate) {
  return z.object({
    current_password: z.string().min(1, t('mweb.changePassword.enterYourCurrentPassword')),
  });
}

export type CurrentPasswordValues = z.infer<ReturnType<typeof makeCurrentPasswordSchema>>;

export const currentPasswordDefaults: CurrentPasswordValues = { current_password: '' };

/**
 * Step two — the emailed code and the new password, confirmed.
 *
 * Identical rules to the signed-out reset flow, because it is the same
 * decision — see `makePasswordWithOtpSchema`.
 */
export const makeNewPasswordSchema = makePasswordWithOtpSchema;

export type NewPasswordValues = z.infer<ReturnType<typeof makeNewPasswordSchema>>;

export { passwordWithOtpDefaults as newPasswordDefaults } from './password-with-otp';
