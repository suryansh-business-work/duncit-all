import { HttpTransport, type RetryPolicy } from '../../transport';
import type { CommunicationLogger } from '../../types';
import { EmailConfigurationError, EmailProviderError, EmailRateLimitError } from '../errors';
import type { EmailProvider, EmailSendResult, PreparedEmail } from '../interfaces/provider';
import { toBase64 } from '../utils/base64';

/**
 * Resend — the first email provider.
 *
 * All it does is translate a {@link PreparedEmail} into Resend's field names and
 * translate their answer back into this package's errors. It owns no retry
 * logic, no validation and no rendering: those are the transport's, the
 * channel's and the renderer's jobs, which is why adding SES or Postmark later
 * is a file this size and nothing else.
 */

const DEFAULT_BASE_URL = 'https://api.resend.com';
const SEND_PATH = '/emails';

/** A setting that may be a fixed string or read live, so a rotated key needs no restart. */
export type ResendConfigValue =
  string | (() => string | null | undefined | Promise<string | null | undefined>);

export interface ResendConfig {
  apiKey: ResendConfigValue;
  /** Defaults to Resend's own host. Point it elsewhere for a sandbox. */
  baseUrl?: ResendConfigValue;
  fetchImpl?: typeof fetch;
  retry?: Partial<RetryPolicy>;
  timeoutMs?: number;
  logger?: CommunicationLogger;
}

async function resolve(value: ResendConfigValue | undefined): Promise<string> {
  if (typeof value === 'function') return (await value()) ?? '';
  return value ?? '';
}

/** Trim trailing slashes without a regex — `/\/+$/` backtracks (Sonar S8786). */
function withoutTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** Resend only accepts letters, numbers, underscore and dash in a tag. */
function tagSafe(value: string): string {
  let out = '';
  for (const char of value) {
    const ok = /[A-Za-z0-9_-]/.test(char);
    out += ok ? char : '_';
  }
  return out.slice(0, 256);
}

/** Resend's own words for a failure, whichever field it used this time. */
function reasonFrom(body: Record<string, unknown>, status: number): string {
  const message = body.message ?? body.error ?? body.name;
  return typeof message === 'string' && message ? message : `HTTP ${status}`;
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  private readonly config: ResendConfig;
  private readonly transport: HttpTransport;

  constructor(config: ResendConfig) {
    this.config = config;
    this.transport = new HttpTransport({
      provider: this.name,
      fetchImpl: config.fetchImpl,
      retry: config.retry,
      timeoutMs: config.timeoutMs,
      logger: config.logger,
    });
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(await resolve(this.config.apiKey));
  }

  async send(email: PreparedEmail): Promise<EmailSendResult> {
    const apiKey = await resolve(this.config.apiKey);
    if (!apiKey) {
      throw new EmailConfigurationError(
        'Resend has no API key configured. Set it before sending.',
        this.name,
      );
    }
    const baseUrl = withoutTrailingSlash((await resolve(this.config.baseUrl)) || DEFAULT_BASE_URL);

    const response = await this.transport.request<Record<string, unknown>>({
      url: `${baseUrl}${SEND_PATH}`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Resend de-duplicates on this, so the transport's own retry cannot put
        // a second copy of a receipt in someone's inbox.
        'Idempotency-Key': email.idempotencyKey,
      },
      body: this.toPayload(email),
    });

    if (!response.ok) this.fail(response.status, response.data, response.headers);

    const id = response.data.id;
    return {
      messageId: typeof id === 'string' && id ? id : null,
      provider: this.name,
      accepted: [...email.to, ...email.cc, ...email.bcc],
      raw: response.data,
    };
  }

  /** Turn Resend's refusal into the right typed error. */
  private fail(
    status: number,
    data: Record<string, unknown>,
    headers: Record<string, string>,
  ): never {
    const reason = reasonFrom(data, status);
    if (status === 429) {
      const retryAfter = Number(headers['retry-after']);
      throw new EmailRateLimitError(`Resend is rate limiting: ${reason}`, {
        provider: this.name,
        status,
        retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
        cause: data,
      });
    }
    throw new EmailProviderError(`Resend rejected the email: ${reason} (HTTP ${status})`, {
      provider: this.name,
      status,
      // A bad key or an unverified sending domain repeats identically.
      retryable: status >= 500,
      cause: data,
    });
  }

  /** The message in Resend's own field names. */
  private toPayload(email: PreparedEmail): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    };

    if (email.cc.length) payload.cc = email.cc;
    if (email.bcc.length) payload.bcc = email.bcc;
    if (email.replyTo) payload.reply_to = email.replyTo;
    if (Object.keys(email.headers).length) payload.headers = email.headers;

    if (email.attachments.length) {
      payload.attachments = email.attachments.map((file) => ({
        filename: file.filename,
        content: toBase64(file.content),
        ...(file.contentType ? { content_type: file.contentType } : {}),
      }));
    }

    // Resend's tags are name/value pairs, not bare strings, and the category is
    // one of them — that is what makes "how did marketing perform" answerable
    // in their dashboard without a separate report.
    const tags = [
      { name: 'category', value: tagSafe(email.category) },
      ...email.tags.map((tag) => ({ name: tagSafe(tag), value: '1' })),
      ...Object.entries(email.metadata).map(([key, value]) => ({
        name: tagSafe(key),
        value: tagSafe(value),
      })),
    ];
    payload.tags = tags;

    return payload;
  }
}
