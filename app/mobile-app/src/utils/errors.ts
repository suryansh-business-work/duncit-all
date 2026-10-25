/** Normalises any thrown value into a human-readable message for the UI. */
export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}

/** Error raised when an HTTP request fails or times out.
 *
 * Carries the GraphQL error's `extensions` when there is one: the message alone
 * cannot tell an "unknown Google account" apart from "this email already has a
 * password", and the login screen has to branch on exactly that. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly extensions?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The GraphQL `extensions.code` of a failure, or null when it carries none. */
export function errorCode(error: unknown): string | null {
  if (error instanceof ApiError && typeof error.extensions?.code === 'string') {
    return error.extensions.code;
  }
  return null;
}

/**
 * The GraphQL `extensions.reason` of a failure, or null when it carries none —
 * the finer cause beside the code (a booking-offer answer refused with
 * OFFER_CHANGED because the other side moved first).
 */
export function errorReason(error: unknown): string | null {
  if (error instanceof ApiError && typeof error.extensions?.reason === 'string') {
    return error.extensions.reason;
  }
  return null;
}
