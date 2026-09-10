/**
 * Signup step two, checked as it is typed — the half mWeb and the native app
 * share.
 *
 * "Email already in use" used to be discovered on the LAST step: the code step
 * asked for a WhatsApp code, and that request was the first time the email and
 * the number were looked up. A taken one was a refusal two screens after the
 * box that asked for it, with a code already on its way to the number. Both
 * boxes ask the server as they are typed now, and the step cannot be left
 * while one of them is somebody's — the way the @handle box on Edit profile
 * has always worked. The round trip itself is `scheduleAvailabilityCheck`,
 * which that box shares (rule 34); what lives here is what the answer means
 * for signup.
 *
 * It is a hint, not the gate: `requestSignupWhatsAppOtp` and `register` refuse
 * a taken contact again, because two people can be typing the same one at once.
 */
import {
  idleAvailabilityCheck,
  scheduleAvailabilityCheck,
  type AvailabilityCheckState,
} from './availability-check';

/** What a contact box knows about the value currently in it. */
export type SignupContactCheckState = AvailabilityCheckState<boolean>;

/** No answer yet, and nothing asked. */
export const IDLE_SIGNUP_CONTACT_CHECK: SignupContactCheckState = idleAvailabilityCheck();

/** What the box should be saying right now. */
export type SignupContactStatus = 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'TAKEN' | 'UNKNOWN';

/**
 * The one place a contact box's state is decided.
 *
 * UNKNOWN is a failed ask — a network blink, a refused request — and it
 * deliberately does NOT block. The person is one step from a code request that
 * checks the same thing, and refusing to let them type on because a hint could
 * not be fetched would turn an outage of this query into an outage of signup.
 */
export function signupContactStatus(
  candidate: string | null,
  check: Readonly<SignupContactCheckState>,
): SignupContactStatus {
  if (!candidate) return 'IDLE';
  if (check.checking) return 'CHECKING';
  if (check.failed) return 'UNKNOWN';
  if (check.answer === null) return 'CHECKING';
  return check.answer ? 'AVAILABLE' : 'TAKEN';
}

/**
 * Must Continue stay disabled because of this box?
 *
 * Taken, obviously. CHECKING too: the ask is 400ms behind the last keystroke,
 * so without it a fast typist reaches Continue while the answer for what they
 * typed is still in flight, and the step is left on the previous value.
 */
export const signupContactBlocksContinue = (status: SignupContactStatus): boolean =>
  status === 'TAKEN' || status === 'CHECKING';

/** The step as a whole: any box that blocks, blocks. */
export const signupContactsBlockContinue = (
  statuses: readonly SignupContactStatus[],
): boolean => statuses.some(signupContactBlocksContinue);

/**
 * The email as the server will look it up — trimmed and lower-cased, which is
 * how `auth.email` is stored — or null unless `shape` accepts it, so a
 * half-typed address never costs a round trip.
 *
 * The shape is handed in because it is `EMAIL` from @duncit/regex, which this
 * zero-dependency package cannot import; the signup schema runs the very same
 * one, so the box asks about exactly what the form would accept.
 */
export function signupEmailCandidate(value: string, shape: RegExp): string | null {
  const mailbox = String(value ?? '')
    .trim()
    .toLowerCase();
  return mailbox && shape.test(mailbox) ? mailbox : null;
}

/** The two patterns the WhatsApp row is checked against — the signup schema's
 * DIAL_CODE and PHONE_INTL, handed in for the reason `signupEmailCandidate` gives. */
export interface SignupPhoneShapes {
  extension: RegExp;
  number: RegExp;
}

/**
 * Both boxes, joined the way the code step prints them (`+91 9845012345`), or
 * null unless both shapes accept — the dial code alone is never worth asking
 * about, and a number short of the pattern is still being typed.
 */
export function signupPhoneCandidate(
  extension: string,
  number: string,
  shapes: Readonly<SignupPhoneShapes>,
): string | null {
  const ext = String(extension ?? '').trim();
  const digits = String(number ?? '').trim();
  if (!ext || !digits) return null;
  if (!shapes.extension.test(ext) || !shapes.number.test(digits)) return null;
  return `${ext} ${digits}`;
}

export interface SignupContactCheckOptions {
  /** From `signupEmailCandidate` / `signupPhoneCandidate`: null asks nothing. */
  candidate: string | null;
  /** Asks the server; resolves to whether the contact is free. */
  ask: (candidate: string) => Promise<boolean>;
  onState: (state: SignupContactCheckState) => void;
  /** Reported, never rendered. */
  onError: (error: unknown, candidate: string) => void;
}

/**
 * The round trip, debounced and stale-proof — `scheduleAvailabilityCheck`
 * typed to a yes/no. Returns the cleanup, which is a React effect's contract,
 * so each surface's hook supplies only its transport and its logger.
 */
export const scheduleSignupContactCheck = (
  options: Readonly<SignupContactCheckOptions>,
): (() => void) => scheduleAvailabilityCheck<boolean>(options);

/** The copy a contact box needs: its own hint, and the two lines that replace it. */
export interface SignupContactCopy {
  hint: string;
  checking: string;
  taken: string;
}

/** What renders under the box: the error line, when there is one, and the helper. */
export interface SignupContactLines {
  hint: string;
  error?: string;
}

/**
 * The lines under a contact box, decided once for both surfaces: the refusal
 * takes the error line while the contact is somebody's, "checking" replaces the
 * hint while the answer is in flight, and every other state keeps the box's
 * own hint — including UNKNOWN, which says nothing rather than something wrong.
 */
export function signupContactLines(
  status: SignupContactStatus,
  copy: Readonly<SignupContactCopy>,
): SignupContactLines {
  if (status === 'TAKEN') return { hint: copy.hint, error: copy.taken };
  if (status === 'CHECKING') return { hint: copy.checking };
  return { hint: copy.hint };
}
