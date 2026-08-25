/**
 * The @handle a profile is shared as — the part mWeb and the native app share.
 *
 * Rule 27 says the two must be identical; rule 40 says they share LOGIC, never
 * UI. The state machine and the copy live here; the MUI field and the Tamagui
 * field stay in their apps.
 *
 * A handle is MINTED by the server from the member's name at signup
 * (`generateUsername` in `server/src/modules/access/user/username.ts`), and its
 * owner may then change it from Edit profile. The server is the only one of the
 * three that DECIDES: the pattern below is restated here so a malformed handle
 * never costs a round trip, and `setMyUsername` re-checks and lets the unique
 * index settle the race.
 *
 * The pattern RESTATES `@duncit/regex`'s USERNAME rather than importing it, for
 * the same reason `pod-attendance.ts` restates OTP_6: `@duncit/utils` is
 * deliberately zero-dependency — the native app resolves it through a Metro
 * workaround that breaks on any sibling `@duncit/*` import. Keep the three in
 * sync.
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
  String(value ?? '')
    .trim()
    .toLowerCase();

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

/** Only a free, well-formed handle that is not already yours is worth saving. */
export const canSaveUsername = (status: UsernameStatus): boolean => status === 'AVAILABLE';

/** True while the status is a refusal rather than progress — drives error styling. */
export const isUsernameError = (status: UsernameStatus): boolean =>
  status === 'INVALID' || status === 'TAKEN' || status === 'RESERVED';

/**
 * Must Edit profile's Save button stay disabled because of the handle?
 *
 * The handle shares its Save with the rest of the profile, so this answers for
 * the WHOLE form: a half-typed or taken handle blocks the name and the address
 * next to it, because letting them through would either write a handle the
 * server refuses or quietly drop the one that was typed.
 *
 * `CHECKING` blocks too. The check is 400ms behind the last keystroke, so
 * without it a fast typist reaches Save while the answer for what they typed is
 * still in flight, and the button would be reporting the previous handle.
 *
 * An account that has NO handle yet is the one case an empty field is fine:
 * there is nothing to clear and nothing to break, so the rest of the profile
 * still saves. With a handle in hand, emptying the field is a refusal — a
 * profile cannot go back to having no address.
 */
export function usernameBlocksSave(status: UsernameStatus, hasCurrent: boolean): boolean {
  if (status === 'AVAILABLE' || status === 'CURRENT') return false;
  if (status === 'IDLE') return hasCurrent;
  return true;
}

/** The shareable profile URL for a handle (or, before one exists, an id). */
export const profileUrl = (origin: string, handle: string): string => `${origin}/u/${handle}`;

export interface UsernameFieldStateInput {
  /** What is in the field, already normalized. */
  value: string;
  /** The handle the account has now, or null while it has none. */
  current: string | null;
  /** The debounced check's latest answer for `value`. */
  check: UsernameCheckState;
  /** Where the profile link points — the browser origin, or the app's web base. */
  origin: string;
}

export interface UsernameFieldState {
  status: UsernameStatus;
  /**
   * The link the handle produces: the one being typed once the server has said
   * yes to it, and otherwise the one that works today. Empty only for an
   * account that has no handle and has not yet typed a usable one.
   */
  link: string;
  /** The status is a refusal rather than progress — drives error styling. */
  errored: boolean;
}

/**
 * Everything the @handle field renders, derived once for both surfaces.
 *
 * The MUI field and the Tamagui field disagree about how to draw a text box and
 * agree about absolutely everything else, so this is where "everything else"
 * lives (rule 40). Showing the link for the handle being typed — rather than
 * only the saved one — is the point of the field: seeing the new address before
 * saving is what makes the warning about already-shared links land.
 */
export function usernameFieldState(
  input: Readonly<UsernameFieldStateInput>,
): UsernameFieldState {
  const status = usernameStatus({
    value: input.value,
    current: input.current,
    checking: input.check.checking,
    available: input.check.available,
    reason: input.check.reason,
  });
  const handle = canSaveUsername(status) ? input.value : input.current;
  return {
    status,
    link: handle ? profileUrl(input.origin, handle) : '',
    errored: isUsernameError(status),
  };
}

/** Long enough that typing a whole handle costs one request, short enough that
 * the answer arrives before the reader's finger leaves the key. */
export const USERNAME_CHECK_DEBOUNCE_MS = 400;

/** What the field knows about the value currently in it. */
export interface UsernameCheckState {
  checking: boolean;
  /** The answer for the CURRENT value, or null while there is not one. */
  available: boolean | null;
  reason: UsernameRejection | null;
}

/**
 * No answer yet — which `usernameStatus` reads as CHECKING, not as free.
 *
 * That is deliberate and is also what an unreachable server falls back to: a
 * check that could not be made is not permission to save.
 */
export const IDLE_USERNAME_CHECK: UsernameCheckState = {
  checking: false,
  available: null,
  reason: null,
};

/** The server's answer, narrowed to the two fields the field cares about. */
export interface UsernameCheckAnswer {
  available: boolean;
  reason?: UsernameRejection | null;
}

export interface UsernameCheckOptions {
  /** What is in the field, as typed. */
  value: string;
  /** The handle the account has now, or null while it has none. */
  current: string | null;
  /** Asks the server. Apollo on mWeb, `graphqlRequest` on native. */
  ask: (candidate: string) => Promise<UsernameCheckAnswer>;
  onState: (state: UsernameCheckState) => void;
  /** Reported, never rendered — the field stays in its waiting state. */
  onError: (error: unknown, candidate: string) => void;
}

/**
 * Ask the server whether a handle is free, once the typing stops, and hand back
 * the cleanup — which is exactly a React effect's contract, without either app
 * having to own the logic (rule 40; the two hooks were byte-for-byte twins).
 *
 * Three things make this correct rather than merely debounced:
 *  - a malformed value never leaves the device. Its shape is decidable here, so
 *    a request for it would be a round trip whose answer was already known;
 *  - the cleanup closes over THIS invocation, so a reply for a value no longer
 *    in the field is dropped. Without that, a slow "taken" for `rav` lands
 *    after a fast "available" for `ravi` and the field reports the wrong one;
 *  - a failed ask falls back to IDLE, which reads as still-checking. Telling
 *    somebody their handle is taken because the network blinked would be worse
 *    than making them wait, and Save stays disabled either way.
 */
export function scheduleUsernameCheck(options: Readonly<UsernameCheckOptions>): () => void {
  const candidate = normalizeUsername(options.value);
  if (!candidate || candidate === options.current || !USERNAME_PATTERN.test(candidate)) {
    options.onState(IDLE_USERNAME_CHECK);
    return () => undefined;
  }

  let live = true;
  options.onState({ checking: true, available: null, reason: null });
  const timer = setTimeout(() => {
    options.ask(candidate).then(
      (answer) => {
        if (!live) return;
        options.onState({
          checking: false,
          available: answer.available,
          reason: answer.reason ?? null,
        });
      },
      (error) => {
        if (!live) return;
        options.onError(error, candidate);
        options.onState(IDLE_USERNAME_CHECK);
      },
    );
  }, USERNAME_CHECK_DEBOUNCE_MS);

  return () => {
    live = false;
    clearTimeout(timer);
  };
}

export type UsernameTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface UsernameLabels {
  /** The `@handle` line, ready to render. */
  handle: (username: string) => string;
  label: string;
  placeholder: string;
  /** The warning under the field: an old link stops resolving when this changes. */
  hint: string;
  /** Caption above the link preview. */
  linkLabel: string;
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
    handle: (username) => `@${username}`,
    label: t('mweb.account.username.label'),
    placeholder: t('mweb.account.username.placeholder'),
    hint: t('mweb.account.username.hint'),
    linkLabel: t('mweb.account.username.linkLabel'),
    saveFailed: t('mweb.account.username.saveFailed'),
    copyLink: t('mweb.account.username.copyLink'),
    linkCopied: t('mweb.account.username.linkCopied'),
    status: (status, value) =>
      status === 'AVAILABLE'
        ? t('mweb.account.username.available', { vars: { username: value } })
        : byStatus[status],
  };
}
