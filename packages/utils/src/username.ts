/**
 * The @handle a profile is shared as — the part mWeb and the native app share.
 *
 * Rule 27 says the two must be identical; rule 40 says they share LOGIC, never
 * UI. The state machine and the copy live here, the MUI field and the Tamagui
 * field stay in their apps.
 *
 * The pattern below RESTATES `@duncit/regex`'s USERNAME rather than importing
 * it, for the same reason `pod-attendance.ts` restates OTP_6: `@duncit/utils`
 * is deliberately zero-dependency — the native app resolves it through a Metro
 * workaround that breaks on any sibling `@duncit/*` import. Keep the two in
 * sync; the server mirrors them a third time in
 * `server/src/modules/access/user/username.ts`, and the server is the only one
 * of the three that decides anything.
 */

/** 3–30 chars: lowercase letters, digits, single hyphens, alphanumeric ends. */
export const USERNAME_PATTERN = /^(?=.{3,30}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why the server refused a handle. Codes, so the client owns the sentence. */
export type UsernameRejection = 'FORMAT' | 'RESERVED' | 'TAKEN';

/** What the field should be saying right now. */
export type UsernameStatus =
  | 'IDLE'
  | 'INVALID'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'TAKEN'
  | 'RESERVED'
  | 'CURRENT';

/** Trim + lower-case, exactly as the server normalizes before it checks. */
export const normalizeUsername = (value: string | null | undefined): string =>
  String(value ?? '').trim().toLowerCase();

export interface UsernameStatusInput {
  /** What is in the field, already normalized. */
  value: string;
  /** The handle the account has now, or null while it has none. */
  current: string | null;
  /** A debounced check is in flight. */
  checking: boolean;
  /** The last answer for THIS value, or null when there is not one yet. */
  available: boolean | null;
  reason: UsernameRejection | null;
}

/**
 * The one place the field's state is decided.
 *
 * Order matters and is the whole point: the account's OWN handle is reported as
 * current rather than taken (it IS taken — by them), and the shape is checked
 * before anything is sent, so typing a space never costs a round trip.
 */
export function usernameStatus(input: Readonly<UsernameStatusInput>): UsernameStatus {
  if (!input.value) return 'IDLE';
  if (input.current && input.value === input.current) return 'CURRENT';
  if (!USERNAME_PATTERN.test(input.value)) return 'INVALID';
  if (input.checking || input.available === null) return 'CHECKING';
  if (input.available) return 'AVAILABLE';
  if (input.reason === 'RESERVED') return 'RESERVED';
  if (input.reason === 'FORMAT') return 'INVALID';
  return 'TAKEN';
}

/** Only a free, well-formed handle that is not already yours can be saved. */
export const canSaveUsername = (status: UsernameStatus): boolean => status === 'AVAILABLE';

/** True while the status is a refusal rather than progress — drives error styling. */
export const isUsernameError = (status: UsernameStatus): boolean =>
  status === 'INVALID' || status === 'TAKEN' || status === 'RESERVED';

/** The shareable profile URL for a handle (or, before one exists, an id). */
export const profileUrl = (origin: string, handle: string): string => `${origin}/u/${handle}`;

export type UsernameTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface UsernameLabels {
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  linkLabel: string;
  save: string;
  saved: string;
  saveFailed: string;
  copyLink: string;
  linkCopied: string;
  /** The one line under the field, for whichever state it is in. */
  status: (status: UsernameStatus, value: string) => string;
}

/**
 * Every key written out as a literal `t('…')` rather than composed from the
 * status, because `scripts/verify-translation-keys.mjs` greps source for the
 * literal string — a composed key fails the Shared Gates job as
 * shipped-but-never-rendered.
 */
export function buildUsernameLabels(t: UsernameTranslate): UsernameLabels {
  const byStatus: Record<UsernameStatus, string> = {
    IDLE: '',
    CHECKING: t('mweb.account.username.checking'),
    CURRENT: t('mweb.account.username.current'),
    INVALID: t('mweb.account.username.format'),
    TAKEN: t('mweb.account.username.taken'),
    RESERVED: t('mweb.account.username.reserved'),
    // Filled in per-call, because it names the handle being offered.
    AVAILABLE: '',
  };
  return {
    title: t('mweb.account.username.title'),
    subtitle: t('mweb.account.username.subtitle'),
    label: t('mweb.account.username.label'),
    placeholder: t('mweb.account.username.placeholder'),
    linkLabel: t('mweb.account.username.linkLabel'),
    save: t('mweb.account.username.save'),
    saved: t('mweb.account.username.saved'),
    saveFailed: t('mweb.account.username.saveFailed'),
    copyLink: t('mweb.account.username.copyLink'),
    linkCopied: t('mweb.account.username.linkCopied'),
    status: (status, value) =>
      status === 'AVAILABLE'
        ? t('mweb.account.username.available', { vars: { username: value } })
        : byStatus[status],
  };
}
