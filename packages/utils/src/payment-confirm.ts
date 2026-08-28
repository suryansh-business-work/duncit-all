/**
 * Surviving a verify call that never came back — the framework-free half,
 * shared by mWeb and the native app (rules 27/40).
 *
 * By the time a client calls `verifyRazorpayPayment` the money has already left
 * the buyer's account. If that request dies in TRANSPORT — a timeout, a dropped
 * connection, a 502 while the API container recycles — the booking has very
 * likely still been made; the only thing that failed is our knowledge of it.
 * Showing a network error there is the worst answer available, so the client
 * asks the server what actually happened instead of guessing.
 */

import { isNetworkFailureMessage } from './parse-api-error';

/**
 * Structural subset of what the two clients throw — Apollo's `ApolloError` on
 * mWeb, the native client's `ApiError`. Typed structurally so this package
 * needs neither `@apollo/client` nor the app's own error class.
 */
type TransportErrorShape = {
  name?: string;
  message?: string;
  /** graphql-request / fetch style. */
  status?: number;
  /** Apollo's ServerError / ServerParseError. */
  statusCode?: number;
  response?: { status?: number };
  networkError?: { message?: string; statusCode?: number } | null;
  graphQLErrors?: ReadonlyArray<unknown>;
};

/** How a dead connection names itself when it arrives with no status to read. */
const TRANSPORT_MESSAGE_RE =
  /timed ?out|timeout|abort|network error|socket hang up|connection (closed|reset)/i;

/** The HTTP status of the failure, wherever the client hung it. */
function statusOf(error: TransportErrorShape): number | undefined {
  return (
    error.statusCode ?? error.status ?? error.response?.status ?? error.networkError?.statusCode
  );
}

/**
 * Statuses that mean the request never ran to completion on the resolver, so
 * asking what happened is legitimate. 0 is no response at all; 408 and 425 are
 * literally "took too long, try again" — and 408 is not hypothetical, it is
 * what Node's own headersTimeout/requestTimeout and nginx's client_*_timeout
 * return to a buyer on a flaky uplink; 429 is "we did not run it".
 */
const TRANSPORT_STATUSES = new Set([0, 408, 425, 429]);

/** 5xx is the edge or the container rather than the resolver. */
function isTransportStatus(status: number): boolean {
  return TRANSPORT_STATUSES.has(status) || status >= 500;
}

/** True when a failed GraphQL call failed in transport, not in business logic —
 *  the server may still have completed the work. */
export function isTransportError(error: unknown): boolean {
  if (!error) return false;
  const e = error as TransportErrorShape;

  // A GraphQL error means the resolver RAN and refused. Asking again changes
  // nothing, and re-asking would bury a real failure under a spinner.
  if (e.graphQLErrors?.length) return false;

  const status = statusOf(e);
  if (typeof status === 'number' && isTransportStatus(status)) return true;

  // Read the message even when a status came back: a proxy can answer a dead
  // connection with a status and still describe a timeout.
  const message = `${e.name ?? ''} ${e.message ?? ''} ${e.networkError?.message ?? ''}`;
  if (isNetworkFailureMessage(message)) return true;
  if (TRANSPORT_MESSAGE_RE.test(message)) return true;
  // A status the server chose is the server answering, so only a call that got
  // none at all falls back to "there is a networkError object at all".
  return typeof status !== 'number' && !!e.networkError;
}

/** The one field the poller reads. Callers keep their own richer row type
 * through the generic, so a polled payment can drive the success screen. */
export interface PaymentStatusLike {
  status: string;
}

export interface ConfirmPaymentOptions<T extends PaymentStatusLike = PaymentStatusLike> {
  /** Reads the payment's current status from the server. Rejects on transport failure. */
  fetchStatus: () => Promise<T | null>;
  attempts?: number;
  delayMs?: number;
  /** How long a single read may take before it counts as "not read yet". */
  readTimeoutMs?: number;
  /** Injectable so nothing sleeps in a test run. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_ATTEMPTS = 12;
const DEFAULT_DELAY_MS = 2500;
const DEFAULT_READ_TIMEOUT_MS = 8000;

/** PENDING is the only status worth waiting on; the rest are the server's
 * final word and end the poll immediately. */
const SETTLED_STATUSES = new Set(['SUCCESS', 'FAILED', 'REFUNDED']);

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

/** One poll that never throws AND always settles: the read goes down the same
 * connection the verify call just died on, so it can hang half-open rather than
 * fail. Without a deadline that first read never returns, the loop never
 * advances, and the buyer waits under the processing overlay forever. A read
 * that misses the deadline is simply "not read yet". */
async function readQuietly<T>(
  fetchStatus: () => Promise<T | null>,
  timeoutMs: number
): Promise<T | null> {
  try {
    // The rejection is swallowed on the read itself, not by the race, so a read
    // that fails after losing to the deadline cannot surface as an unhandled
    // rejection. Neither side of the race can reject, so the only way out of
    // this block other than the return below is fetchStatus throwing where it
    // stands — before a deadline was ever armed, which is why the cleanup sits
    // on the settled path rather than in a finally.
    // Definite assignment, not `| undefined`: the executor below runs
    // synchronously, so by the time the race settles there IS a timer. React
    // Native's clearTimeout takes a required id, so a widened type here fails
    // the mobile typecheck even though the DOM lib tolerates it.
    let timer!: ReturnType<typeof globalThis.setTimeout>;
    const read = fetchStatus().catch(() => null);
    const deadline = new Promise<null>((resolve) => {
      timer = globalThis.setTimeout(() => resolve(null), timeoutMs);
    });
    const row = await Promise.race([read, deadline]);
    globalThis.clearTimeout(timer);
    return row;
  } catch {
    // fetchStatus threw synchronously.
    return null;
  }
}

/**
 * Poll the payment until the server confirms it, so a transport timeout on the
 * verify call never surfaces to the buyer whose money was already taken.
 *
 * Returns the settled row, or the last row seen when the window closes with the
 * payment still PENDING, or null when it could not be read at all.
 */
export async function confirmPaymentAfterTransportFailure<
  T extends PaymentStatusLike = PaymentStatusLike,
>(options: ConfirmPaymentOptions<T>): Promise<T | null> {
  const {
    fetchStatus,
    attempts = DEFAULT_ATTEMPTS,
    delayMs = DEFAULT_DELAY_MS,
    readTimeoutMs = DEFAULT_READ_TIMEOUT_MS,
    sleep = wait,
  } = options;

  let latest: T | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Wait BEFORE the first read: the verify call has only just died and the
    // work that settles the payment needs a moment to land.
    await sleep(delayMs);
    const row = await readQuietly(fetchStatus, readTimeoutMs);
    if (row) {
      latest = row;
      if (SETTLED_STATUSES.has(row.status)) return row;
    }
  }
  return latest;
}

/**
 * The outcomes the buyer has to be TOLD about.
 *
 * The poll above returns whichever row the server settled on — a genuinely
 * FAILED or REFUNDED payment included. A caller that asks only
 * `status === 'SUCCESS'` therefore hands a buyer whose payment definitively
 * failed the "being confirmed, it will appear in your bookings shortly" line,
 * and they either pay a second time or wait for a booking that will never
 * exist. That is a worse lie than the timeout this feature exists to hide.
 */
export type UnconfirmedOutcome = 'FAILED' | 'REFUNDED' | 'PENDING';

/**
 * i18n keys for those outcomes. A SUCCESS carries none — the confirmation
 * screen IS the message. The copy lives in the bundle (rule 38) and only the
 * keys live here, so mWeb and the native app cannot drift apart (rule 27).
 */
export const CONFIRM_OUTCOME_KEYS: Record<UnconfirmedOutcome, string> = {
  FAILED: 'mweb.checkout.errorConfirmFailed',
  REFUNDED: 'mweb.checkout.errorConfirmRefunded',
  PENDING: 'mweb.checkout.errorConfirmPending',
};

/** What the confirmation poll concluded. The SUCCESS arm carries the row so the
 * caller drives its confirmation screen without re-reading the status itself. */
export type ConfirmedPayment<T extends PaymentStatusLike = PaymentStatusLike> =
  | { outcome: 'SUCCESS'; payment: T }
  | { outcome: UnconfirmedOutcome; messageKey: string };

/** Turn the poll's result into the one thing the buyer should see next. */
export function classifyConfirmedPayment<T extends PaymentStatusLike>(
  payment: T | null | undefined
): ConfirmedPayment<T> {
  if (payment?.status === 'SUCCESS') return { outcome: 'SUCCESS', payment };
  if (payment?.status === 'FAILED') {
    return { outcome: 'FAILED', messageKey: CONFIRM_OUTCOME_KEYS.FAILED };
  }
  if (payment?.status === 'REFUNDED') {
    return { outcome: 'REFUNDED', messageKey: CONFIRM_OUTCOME_KEYS.REFUNDED };
  }
  // Still PENDING after every attempt, or never readable at all: we genuinely
  // do not know, so say only what is true and stop them paying twice.
  return { outcome: 'PENDING', messageKey: CONFIRM_OUTCOME_KEYS.PENDING };
}
