/**
 * Apollo / network error → user-friendly message. This module is dependency
 * free on purpose: the Apollo error shape is typed STRUCTURALLY so
 * @duncit/utils never needs @apollo/client. It used to be copy-pasted, byte
 * for byte, into mWeb and 16 portals.
 */

/** Friendly message shown when the server is unreachable. */
export const OFFLINE_MESSAGE =
  'Unable to connect to server. Please check your internet connection and try again.';

/** Default catch-all message when nothing better can be extracted. */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const NETWORK_FAILURE_RE = /failed to fetch|network request failed|load failed/i;

/**
 * True when a low-level fetch failure message ("Failed to fetch",
 * "NetworkError...", Safari's "Load failed") indicates a connectivity
 * problem. Shared with the apollo error links so the wording of the
 * detection lives in exactly one place.
 */
export function isNetworkFailureMessage(message: string): boolean {
  return NETWORK_FAILURE_RE.test(message);
}

/**
 * Structural subset of what the clients throw — no @apollo/client dependency.
 *
 * Two generations of Apollo are described here on purpose. v3 split a failure
 * into `networkError` and `graphQLErrors`; v4 throws one error and puts the
 * GraphQL ones on `errors` (CombinedGraphQLErrors). The native app, which
 * speaks raw fetch, matches neither and lands on `message`.
 */
type ApiErrorShape = {
  message?: string;
  networkError?: { message?: string } | null;
  graphQLErrors?: ReadonlyArray<{ message: string }>;
  errors?: ReadonlyArray<{ message: string }>;
};

/** One GraphQL error as either Apollo generation reports it. */
export interface GraphQLErrorLike {
  message?: string;
  extensions?: Record<string, unknown>;
}

/**
 * The first GraphQL error on a thrown error, whichever Apollo threw it.
 *
 * v3 hung them on `graphQLErrors`; v4 throws a single `CombinedGraphQLErrors`
 * carrying `errors`. Six call sites read `extensions` off that first entry to
 * decide what the UI does next — an error code, a rejected-content reason — so
 * the two shapes are reconciled here rather than at each of them.
 */
export function firstGraphQLError(err: unknown): GraphQLErrorLike | undefined {
  const shape = err as {
    graphQLErrors?: ReadonlyArray<GraphQLErrorLike>;
    errors?: ReadonlyArray<GraphQLErrorLike>;
  } | null;
  return shape?.graphQLErrors?.[0] ?? shape?.errors?.[0];
}

/**
 * Converts an Apollo / network error into a user-friendly message.
 * - "Failed to fetch" / "NetworkError" → connectivity message
 * - GraphQL errors → first error message
 * - Fallback → generic message (overridable via `fallback`)
 */
export function parseApiError(err: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  if (!err) return fallback;

  const e = err as ApiErrorShape;

  // Network-level error (server unreachable, no internet, etc.)
  if (e.networkError) {
    const msg = e.networkError.message ?? '';
    if (isNetworkFailureMessage(msg)) {
      return OFFLINE_MESSAGE;
    }
    return 'Network error. Please try again.';
  }

  // GraphQL-level errors (index access is guarded — the native app compiles
  // this source under noUncheckedIndexedAccess).
  const firstGraphQLError = e.graphQLErrors?.[0] ?? e.errors?.[0];
  if (firstGraphQLError) {
    return firstGraphQLError.message;
  }

  // Plain Error or string
  if (e.message) {
    if (isNetworkFailureMessage(e.message)) {
      return OFFLINE_MESSAGE;
    }
    return e.message;
  }

  return fallback;
}
