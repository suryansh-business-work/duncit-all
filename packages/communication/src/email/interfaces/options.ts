/**
 * What a caller passes to send an email. Nothing in this file names a vendor —
 * that is the point: Resend today, SES or Postmark tomorrow, and this shape
 * does not move.
 */

/**
 * Why the email is being sent. Metadata, not a separate method: a single
 * `send()` keeps one code path to test and one place to add a rule, and the
 * category is what suppression, reporting and consent are decided on. Marketing
 * can be unsubscribed from; a booking receipt cannot.
 */
export type EmailCategory =
  | 'transactional'
  | 'authentication'
  | 'marketing'
  | 'service'
  | 'notification'
  | 'support'
  | 'billing'
  | 'legal'
  | 'internal';

/** Every category, in the order above — handy for a settings screen. */
export const EMAIL_CATEGORIES: readonly EmailCategory[] = [
  'transactional',
  'authentication',
  'marketing',
  'service',
  'notification',
  'support',
  'billing',
  'legal',
  'internal',
] as const;

/**
 * A file on the message. `content` is raw bytes or a string; a provider that
 * wants base64 encodes it itself, so a caller never has to know which does.
 */
export interface EmailAttachment {
  filename: string;
  content: Uint8Array | string;
  /** Guessed from the filename when omitted. */
  contentType?: string;
}

export interface EmailSendOptions {
  /** Why this email is being sent. Required — see {@link EmailCategory}. */
  category: EmailCategory;

  /** One address or several. Every recipient sees the others. */
  to: string | string[];
  cc?: string[];
  /** Hidden from everyone else on the message. */
  bcc?: string[];

  /** Required. A template may override it with its own rendered subject. */
  subject: string;

  /** Name of a registered template. Renders `html`/`text` from `variables`. */
  template?: string;
  /** Ready-made HTML body. Used when there is no template. */
  html?: string;
  /** Plain-text body. Derived from the HTML when omitted. */
  text?: string;

  /** Values for the template's placeholders. */
  variables?: Record<string, unknown>;

  attachments?: EmailAttachment[];

  /** Where a reply should go, when that is not the from address. */
  replyTo?: string;
  /** Sender override. Falls back to the channel's configured `from`. */
  from?: string;

  /** Free-form labels for the provider's own reporting. */
  tags?: string[];
  /** Key/value pairs carried with the message and echoed back on webhooks. */
  metadata?: Record<string, string>;
  /** Extra SMTP/API headers, e.g. `List-Unsubscribe`. */
  headers?: Record<string, string>;

  /**
   * Send-once key. A retry that reuses it must not produce a second email.
   * Left out, one is derived from the message so an accidental double-call is
   * still de-duplicated by a provider that supports it.
   */
  idempotencyKey?: string;
}
