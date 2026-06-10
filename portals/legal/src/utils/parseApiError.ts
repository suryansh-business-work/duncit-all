import type { ApolloError } from '@apollo/client';

/**
 * Converts an Apollo / network error into a user-friendly message.
 * - "Failed to fetch" / "NetworkError" → connectivity message
 * - GraphQL errors → first error message
 * - Fallback → generic message
 */
export function parseApiError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';

  const e = err as ApolloError & { message?: string; networkError?: { message?: string } };

  if (e.networkError) {
    const msg = e.networkError.message ?? '';
    if (/failed to fetch|network request failed|load failed/i.test(msg)) {
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }
    return 'Network error. Please try again.';
  }

  if (e.graphQLErrors?.length) {
    return e.graphQLErrors[0].message;
  }

  if (e.message) {
    if (/failed to fetch|network request failed|load failed/i.test(e.message)) {
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }
    return e.message;
  }

  return 'Something went wrong. Please try again.';
}
