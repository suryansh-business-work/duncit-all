/** A failed API call, carrying the user-facing message and the server's error code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly extensions?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    const code = this.extensions?.code;
    return typeof code === 'string' ? code : undefined;
  }
}

/** The message to show for any thrown value; `fallback` when it carries none. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** The server's error code (UNAUTHENTICATED, TWO_FACTOR_REQUIRED, …) of a thrown value. */
export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}
