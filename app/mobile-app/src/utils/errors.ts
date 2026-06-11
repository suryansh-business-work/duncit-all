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

/** Error raised when an HTTP request fails or times out. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
