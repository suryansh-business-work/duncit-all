import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

import type { Translate } from './translate';

/** A recovery code is eight characters, shown as `ABCD-EFGH`. */
const RECOVERY_CODE_LENGTH = 8;

/** How a person copies a recovery code — case, spaces and the dash are not part of it. */
const recoveryLength = (value: string) =>
  [...value].filter((char) => char !== '-' && char !== ' ').length;

/**
 * The authenticator-app code box — the console's Profile > Security setup and
 * the second step of a console sign-in.
 *
 * `allowRecovery` is off while setting up (only the app can prove the scan) and
 * on everywhere a lost phone must not mean a lost account: signing in and
 * turning the app off. Mirrors the server's `twoFactorCodeSchema`, which reads
 * six digits as an app code and anything else as a recovery code.
 */
export function makeTwoFactorCodeSchema(t: Translate, { allowRecovery }: { allowRecovery: boolean }) {
  const message = allowRecovery
    ? t('shell.twoFactor.validation.codeOrRecovery')
    : t('shell.twoFactor.validation.code');
  return z.object({
    code: z
      .string()
      .trim()
      .refine(
        (value) =>
          OTP_6.test(value) || (allowRecovery && recoveryLength(value) === RECOVERY_CODE_LENGTH),
        message,
      ),
  });
}

export type TwoFactorCodeValues = z.infer<ReturnType<typeof makeTwoFactorCodeSchema>>;

export const twoFactorCodeDefaults: TwoFactorCodeValues = { code: '' };
