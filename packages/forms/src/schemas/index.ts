/**
 * `@duncit/forms/schemas` — the RHF + Zod contracts mWeb, the native app and
 * the partner console share.
 *
 * MUI-free on purpose: the package root renders `RhfTextField` and cannot reach
 * the native app, but the RULES can and must — mWeb and native had written each
 * of these twice and were already refusing different input with different
 * sentences (rules 27 and 40).
 *
 * Every export is a `make*Schema(t)` factory rather than a schema constant,
 * because the messages are localized copy and a Zod schema is built outside
 * React. A surface binds them once against its own bundled-English fallback:
 *
 * ```ts
 * import { makeLoginSchema } from '@duncit/forms/schemas';
 * import { fallbackT } from '../../i18n/fallback';
 * export const loginSchema = makeLoginSchema(fallbackT);
 * ```
 *
 * The `*Defaults` objects carry no copy, so they are plain constants.
 */
export type { Translate } from './translate';

export {
  makePasswordPairSchema,
  makePasswordWithOtpSchema,
  passwordPairDefaults,
  passwordWithOtpDefaults,
  type PasswordPairValues,
  type PasswordWithOtpValues,
} from './password-with-otp';

export {
  forgotPasswordDefaults,
  loginDefaults,
  LOGIN_CHANNELS,
  makeForgotPasswordSchema,
  makeLoginSchema,
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ForgotPasswordValues,
  type LoginChannel,
  type LoginFormValues,
  type ResetPasswordValues,
} from './auth';

export {
  currentPasswordDefaults,
  makeCurrentPasswordSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from './change-password';

export {
  deleteAccountDefaults,
  makeDeleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account';

export {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawInput,
  type WithdrawMethod,
  type WithdrawValues,
} from './withdraw';

export {
  blankAddress,
  makeAddressSchema,
  type AddressValues,
} from './address';

export {
  makeContactOtpSchema,
  makeContactValueSchema,
  type ContactOtpValues,
  type ContactValueValues,
} from './contact-change';

export {
  makeSignupSchema,
  makeWhatsappNumberSchema,
  signupDefaults,
  whatsappNumberDefaults,
  whatsappNumberShape,
  type SignupFormValues,
  type WhatsappNumberValues,
} from './signup';
