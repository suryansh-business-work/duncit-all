import type { EmailVerificationStatus } from '@modules/crm/emailVerification/emailVerification.model';

/**
 * What a person reading a check is told: the final word on an address, and
 * each test behind it.
 *
 * The verifier answers in four statuses; a reader is given three verdicts. An
 * UNKNOWN (the mail server would not say) is RISKY to them — it is not proof
 * the mailbox exists, and not proof it does not. The four statuses stay on the
 * record so nothing the verifier said is lost.
 */

export const EMAIL_VERDICTS = ['VALID', 'RISKY', 'INVALID'] as const;
export type EmailVerdict = (typeof EMAIL_VERDICTS)[number];

const STATUSES_BY_VERDICT: Readonly<Record<EmailVerdict, readonly EmailVerificationStatus[]>> = {
  VALID: ['VERIFIED'],
  RISKY: ['RISKY', 'UNKNOWN'],
  INVALID: ['INVALID'],
};

export const verdictOf = (status: EmailVerificationStatus): EmailVerdict =>
  EMAIL_VERDICTS.find((verdict) => STATUSES_BY_VERDICT[verdict].includes(status)) ?? 'RISKY';

/** The statuses one verdict covers — how a verdict filter reaches the stored status. */
export const statusesOf = (verdict: string): readonly EmailVerificationStatus[] =>
  (EMAIL_VERDICTS as readonly string[]).includes(verdict) ? STATUSES_BY_VERDICT[verdict as EmailVerdict] : [];

/** The verifier's flags as kept on every check record. */
export interface EmailCheckFlags {
  is_valid_syntax: boolean;
  accepts_mail: boolean;
  can_connect_smtp: boolean;
  is_deliverable: boolean;
  is_catch_all: boolean;
  has_full_inbox: boolean;
  is_disabled: boolean;
  is_disposable: boolean;
  is_role_account: boolean;
}

/** Every test, in the order a reader is shown them — each later one leans on the ones above it. */
export const EMAIL_CHECK_KEYS = [
  'SYNTAX',
  'MAIL_SERVER',
  'SMTP_CONNECTION',
  'MAILBOX_EXISTS',
  'MAILBOX_ENABLED',
  'INBOX_HAS_SPACE',
  'NOT_CATCH_ALL',
  'NOT_DISPOSABLE',
  'NOT_ROLE_ACCOUNT',
] as const;
export type EmailCheckKey = (typeof EMAIL_CHECK_KEYS)[number];

/** One test's outcome. `passed` is null when the test could not run because one it depends on failed. */
export interface EmailCheck {
  key: EmailCheckKey;
  passed: boolean | null;
}

/**
 * Each test's outcome from the stored flags.
 *
 * A failed step leaves the tests below it unrun rather than failed: with no
 * mail server there is nothing to ask whether the inbox is full, and the
 * stored `false` is only the absence of an answer. Reporting those as crosses
 * would tell the reader something nobody found out.
 */
export function checksOf(flags: EmailCheckFlags): EmailCheck[] {
  const syntax = flags.is_valid_syntax;
  const server = syntax && flags.accepts_mail;
  const smtp = server && flags.can_connect_smtp;
  const outcomes: Record<EmailCheckKey, boolean | null> = {
    SYNTAX: syntax,
    MAIL_SERVER: syntax ? flags.accepts_mail : null,
    SMTP_CONNECTION: server ? flags.can_connect_smtp : null,
    MAILBOX_EXISTS: smtp ? flags.is_deliverable : null,
    MAILBOX_ENABLED: smtp ? !flags.is_disabled : null,
    INBOX_HAS_SPACE: smtp ? !flags.has_full_inbox : null,
    NOT_CATCH_ALL: smtp ? !flags.is_catch_all : null,
    // Read off the address itself, so they need nothing but a well-formed one.
    NOT_DISPOSABLE: syntax ? !flags.is_disposable : null,
    NOT_ROLE_ACCOUNT: syntax ? !flags.is_role_account : null,
  };
  return EMAIL_CHECK_KEYS.map((key) => ({ key, passed: outcomes[key] }));
}
