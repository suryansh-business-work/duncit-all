import type { EmailValidationCheckKey, EmailValidationVerdict } from '@duncit/gql-types';

/**
 * Server key → translation key for everything a validation result names.
 * Written out literally, once, because the localization gate finds keys by
 * searching the source — a key built at the call site would be invisible to it.
 */

export const CHECK_LABEL_KEYS: Readonly<Record<EmailValidationCheckKey, string>> = {
  SYNTAX: 'shell.emailValidation.check.syntax',
  MAIL_SERVER: 'shell.emailValidation.check.mailServer',
  SMTP_CONNECTION: 'shell.emailValidation.check.smtpConnection',
  MAILBOX_EXISTS: 'shell.emailValidation.check.mailboxExists',
  MAILBOX_ENABLED: 'shell.emailValidation.check.mailboxEnabled',
  INBOX_HAS_SPACE: 'shell.emailValidation.check.inboxHasSpace',
  NOT_CATCH_ALL: 'shell.emailValidation.check.notCatchAll',
  NOT_DISPOSABLE: 'shell.emailValidation.check.notDisposable',
  NOT_ROLE_ACCOUNT: 'shell.emailValidation.check.notRoleAccount',
};

/** Every test in the order the server runs them — what the dialog lists while it waits. */
export const CHECK_ORDER = Object.keys(CHECK_LABEL_KEYS) as EmailValidationCheckKey[];

export const VERDICT_LABEL_KEYS: Readonly<Record<EmailValidationVerdict, string>> = {
  VALID: 'shell.emailValidation.verdict.valid',
  RISKY: 'shell.emailValidation.verdict.risky',
  INVALID: 'shell.emailValidation.verdict.invalid',
};

export const VERDICT_HINT_KEYS: Readonly<Record<EmailValidationVerdict, string>> = {
  VALID: 'shell.emailValidation.verdictHint.valid',
  RISKY: 'shell.emailValidation.verdictHint.risky',
  INVALID: 'shell.emailValidation.verdictHint.invalid',
};

/** The MUI colour each verdict is drawn in — a theme palette name, never a literal. */
export const VERDICT_COLOR: Readonly<Record<EmailValidationVerdict, 'success' | 'warning' | 'error'>> = {
  VALID: 'success',
  RISKY: 'warning',
  INVALID: 'error',
};
