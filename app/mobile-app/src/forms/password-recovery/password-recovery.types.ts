import type { PasswordRecoveryChannel } from '@duncit/utils';
import {
  makeContactOtpSchema,
  makeContactValueSchema,
  makePasswordPairSchema,
  type Translate,
} from '@duncit/forms/schemas';

import { fallbackT } from '@/i18n/fallback';

/**
 * The rules the three recovery steps validate against. Twin of mWeb's
 * src/pages/forgot-password-page/recovery.types.ts.
 *
 * All three already exist in `@duncit/forms/schemas`: an email-or-phone value, a
 * six-digit code, and a password typed twice. Recovery asks the same three
 * questions the contact-change sheet and the change-password flow ask, so it
 * imports their answers rather than writing a fourth set (rule 40).
 */
export type {
  ContactOtpValues as RecoveryCodeValues,
  ContactValueValues as RecoveryLookupValues,
  PasswordPairValues as RecoveryPasswordValues,
} from '@duncit/forms/schemas';

export const makeRecoveryLookupSchema = (
  channel: PasswordRecoveryChannel,
  t: Translate = fallbackT,
) => makeContactValueSchema(channel, t);

export const recoveryCodeSchema = makeContactOtpSchema(fallbackT);

export const makeRecoveryPasswordSchema = (t: Translate = fallbackT) => makePasswordPairSchema(t);
