import { EmailProviderError } from '../errors';
import type { EmailProvider, EmailSendResult, PreparedEmail } from '../interfaces/provider';

/**
 * A provider that sends nothing and remembers everything.
 *
 * Shipped rather than left in a test file because every consumer needs it: a
 * test that asserts "the booking flow emails the buyer" should not depend on a
 * network, and a local dev environment should not need a real API key to click
 * through signup. Reach for this instead of writing another stub.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';

  /** Every message that was sent, oldest first. */
  readonly sent: PreparedEmail[] = [];

  /**
   * @param options.failWith Reject every send with this message, for testing
   * the unhappy path. `retryable` decides which branch a caller takes.
   */
  constructor(
    private readonly options: { failWith?: string; retryable?: boolean; configured?: boolean } = {},
  ) {}

  async isConfigured(): Promise<boolean> {
    return this.options.configured ?? true;
  }

  async send(email: PreparedEmail): Promise<EmailSendResult> {
    if (this.options.failWith) {
      throw new EmailProviderError(this.options.failWith, {
        provider: this.name,
        retryable: this.options.retryable ?? false,
      });
    }
    this.sent.push(email);
    return {
      // Derived from the send-once key, so asserting on it is stable across runs.
      messageId: `mock-${email.idempotencyKey}`,
      provider: this.name,
      accepted: [...email.to, ...email.cc, ...email.bcc],
      raw: { mock: true },
    };
  }

  /** The most recent message, for the common single-send assertion. */
  get last(): PreparedEmail | undefined {
    return this.sent.at(-1);
  }

  /** Forget everything sent so far. Call between tests. */
  reset(): void {
    this.sent.length = 0;
  }
}
