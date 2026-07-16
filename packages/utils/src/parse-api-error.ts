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

/** Structural subset of ApolloError — no @apollo/client dependency. */
type ApiErrorShape = {
  message?: string;
  networkError?: { message?: string } | null;
  graphQLErrors?: ReadonlyArray<{ message: string }>;
};

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

  // GraphQL-level errors
  if (e.graphQLErrors?.length) {
    return e.graphQLErrors[0].message;
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
