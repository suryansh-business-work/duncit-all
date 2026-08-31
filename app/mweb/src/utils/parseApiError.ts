/**
 * Structural, so it reads a v3-shaped error, a v4 `CombinedGraphQLErrors`
 * (which carries `errors`) and a plain fetch failure without importing any of
 * them.
 */
type ApiErrorShape = {
  message?: string;
  networkError?: { message?: string } | null;
  graphQLErrors?: ReadonlyArray<{ message: string }>;
  errors?: ReadonlyArray<{ message: string }>;
};

/**
 * Converts an Apollo / network error into a user-friendly message.
 * - "Failed to fetch" / "NetworkError" → connectivity message
 * - GraphQL errors → first error message
 * - Fallback → generic message
 */
export function parseApiError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';

  const e = err as ApiErrorShape;

  // Network-level error (server unreachable, no internet, etc.)
  if (e.networkError) {
    const msg = e.networkError.message ?? '';
    if (/failed to fetch|network request failed|load failed/i.test(msg)) {
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }
    return 'Network error. Please try again.';
  }

  // GraphQL-level errors
  const firstGraphQLError = e.graphQLErrors?.[0] ?? e.errors?.[0];
  if (firstGraphQLError) {
    return firstGraphQLError.message;
  }

  // Plain Error or string
  if (e.message) {
    if (/failed to fetch|network request failed|load failed/i.test(e.message)) {
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }
    return e.message;
  }

  return 'Something went wrong. Please try again.';
}
