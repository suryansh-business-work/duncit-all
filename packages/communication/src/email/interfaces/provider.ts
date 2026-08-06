import type { EmailAttachment, EmailCategory } from './options';

/**
 * The contract every email provider answers to.
 *
 * A provider receives a {@link PreparedEmail} — already validated, already
 * rendered, addresses already normalised. It maps that onto one vendor's API
 * and nothing else. Adding SES, SendGrid, Postmark, Brevo or Mailgun is one
 * new file against this interface; no call site changes.
 */

/** A message after validation, template rendering and normalisation. */
export interface PreparedEmail {
  category: EmailCategory;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  /** Always present — derived from the HTML when the caller gave none. */
  text: string;
  attachments: EmailAttachment[];
  replyTo?: string;
  tags: string[];
  metadata: Record<string, string>;
  headers: Record<string, string>;
  /** Always present — derived from the message when the caller gave none. */
  idempotencyKey: string;
}

/** What a send returns, whichever provider handled it. */
export interface EmailSendResult {
  /** The provider's own id for the accepted message, when it gives one. */
  messageId: string | null;
  /** Which provider handled it — useful in logs when more than one is live. */
  provider: string;
  /** Everyone the message went to, after normalisation. */
  accepted: string[];
  /** The provider's untouched response, for anything the shape above omits. */
  raw: unknown;
}

export interface EmailProvider {
  /** Identifies the provider in results, errors and logs. */
  readonly name: string;
  /** Send one prepared message. Throws an `EmailProviderError` on failure. */
  send(email: PreparedEmail): Promise<EmailSendResult>;
  /** Whether the provider has everything it needs to send. */
  isConfigured(): Promise<boolean>;
}
