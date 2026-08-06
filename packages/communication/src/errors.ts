/**
 * Typed failures.
 *
 * A caller has to be able to tell "you gave me a bad phone number" from "the
 * provider is down" without reading a string, because the first is a bug to fix
 * and the second is a retry. Every throw from this package is one of these.
 */

/** Base for everything this package throws. */
export class CommunicationError extends Error {
  /** Machine-readable, stable across providers. */
  readonly code: string;
  /** The provider involved, when one was reached. */
  readonly provider?: string;
  /** Whether trying the same call again could plausibly succeed. */
  readonly retryable: boolean;
  /** The provider's own response, when there was one. */
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      code: string;
      provider?: string;
      retryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.provider = options.provider;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

/** The caller's own options are wrong. Never retryable — retrying sends the same bad request. */
export class CommunicationValidationError extends CommunicationError {
  /** The option at fault, so a caller can point at the field. */
  readonly field: string;

  constructor(message: string, field: string) {
    super(message, { code: 'VALIDATION_FAILED', retryable: false });
    this.field = field;
  }
}

/** The provider has no API key, or no provider is registered at all. */
export class CommunicationConfigError extends CommunicationError {
  constructor(message: string, provider?: string) {
    super(message, { code: 'NOT_CONFIGURED', provider, retryable: false });
  }
}

/** The provider was reached and refused, or could not be reached. */
export class CommunicationProviderError extends CommunicationError {
  /** HTTP status, when the failure came back as one. */
  readonly status?: number;

  constructor(
    message: string,
    options: {
      provider: string;
      status?: number;
      retryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message, {
      code: 'PROVIDER_FAILED',
      provider: options.provider,
      retryable: options.retryable ?? false,
      cause: options.cause,
    });
    this.status = options.status;
  }
}
