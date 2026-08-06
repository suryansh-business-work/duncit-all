import { CommunicationError } from '../../errors';

/**
 * Email's typed failures.
 *
 * Every one extends {@link CommunicationError}, so `retryable` means the same
 * thing here as it does for WhatsApp and a caller can branch on it without
 * knowing which channel threw. Four of the five are never worth retrying; the
 * two that can be are marked as such at the throw site.
 */

/** The caller's own options are wrong. Retrying sends the same bad request. */
export class EmailValidationError extends CommunicationError {
  /** The option at fault, so a caller can point at the field. */
  readonly field: string;

  constructor(message: string, field: string) {
    super(message, { code: 'EMAIL_VALIDATION_FAILED', retryable: false });
    this.field = field;
  }
}

/** No provider registered, no API key, or no from address. */
export class EmailConfigurationError extends CommunicationError {
  constructor(message: string, provider?: string) {
    super(message, { code: 'EMAIL_NOT_CONFIGURED', provider, retryable: false });
  }
}

/** A template is missing, or its body could not be rendered. */
export class EmailTemplateError extends CommunicationError {
  /** The template that failed, so a log line names it. */
  readonly template: string;

  constructor(message: string, template: string, cause?: unknown) {
    super(message, { code: 'EMAIL_TEMPLATE_FAILED', retryable: false, cause });
    this.template = template;
  }
}

/**
 * The provider refused the message, or could not be reached.
 *
 * `retryable` is the field to branch on: a rejected key or an unverified
 * sending domain repeats identically, while a 5xx or a dropped socket may not.
 */
export class EmailProviderError extends CommunicationError {
  /** HTTP status, when the failure came back as one. */
  readonly status?: number;

  constructor(
    message: string,
    options: {
      provider: string;
      status?: number;
      retryable?: boolean;
      cause?: unknown;
      /** Overridden by the rate-limit subclass so the two are told apart by code. */
      code?: string;
    },
  ) {
    super(message, {
      code: options.code ?? 'EMAIL_PROVIDER_FAILED',
      provider: options.provider,
      retryable: options.retryable ?? false,
      cause: options.cause,
    });
    this.status = options.status;
  }
}

/**
 * The provider is throttling. Separate from a plain provider failure because
 * the answer is different: wait and send again rather than fix and redeploy.
 * Always retryable, and carries the wait when the provider states one.
 */
export class EmailRateLimitError extends EmailProviderError {
  /** Seconds to wait before sending again, when the provider says so. */
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: { provider: string; status?: number; retryAfterSeconds?: number; cause?: unknown },
  ) {
    super(message, { ...options, retryable: true, code: 'EMAIL_RATE_LIMITED' });
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
