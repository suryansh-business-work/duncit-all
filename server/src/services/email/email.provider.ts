import { createHash } from 'node:crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { logs } from '@observability/log';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';

/**
 * The server's email provider layer.
 *
 * Mirrors `@duncit/communication`'s email channel: a {@link PreparedEmail} goes
 * in, one vendor's API call comes out, and nothing above this file knows which
 * vendor is live. It is a copy rather than an import because `server/src` takes
 * no `@duncit/*` dependency (project rule 40) — the server runs compiled `dist`
 * on plain Node, where a source-only workspace package does not resolve. Same
 * arrangement as `@duncit/slack`. CHANGE ONE, CHANGE THE OTHER.
 *
 * Two senders used to keep their own nodemailer: the transactional service and
 * the CRM's lead comms. Both now come through here, so an admin who switches
 * provider switches both, and a fix to one is not a fix to only one.
 */

/**
 * Why the email is being sent. Metadata, not a separate method — it is what
 * suppression, reporting and consent are decided on, and it is what makes
 * "how many marketing emails did we send" answerable.
 */
export const EMAIL_CATEGORIES = [
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

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/** A file on the message: inline bytes, or a URL the provider fetches. */
export interface PreparedAttachment {
  filename: string;
  content?: Buffer | string;
  /** A URL instead of bytes — how the CRM attaches an ImageKit file. */
  path?: string;
  contentType?: string;
}

/** A message after rendering and normalisation, ready for any provider. */
export interface PreparedEmail {
  category: EmailCategory;
  from: string;
  to: string | string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: PreparedAttachment[];
}

export interface EmailDelivery {
  messageId: string;
  provider: string;
  /**
   * Who the provider took the message for. SMTP answers per recipient, so a
   * campaign can record which addresses its server refused outright; an HTTP
   * API takes the message whole, so everyone is accepted and a later bounce is
   * the only signal. Both shapes are reported the same way here.
   */
  accepted: string[];
  rejected: string[];
}

export interface EmailProvider {
  readonly name: string;
  send(email: PreparedEmail): Promise<EmailDelivery>;
}

/** The credentials one provider needs, read from a Tech-portal env entry. */
export interface EmailProviderConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  replyTo: string;
  /** Set when the entry is a Resend one rather than an SMTP one. */
  apiKey: string;
}

// --- SMTP -------------------------------------------------------------------

let transporter: Transporter | null = null;
let transporterKey = '';

/**
 * One transporter per credential set. Keyed on the credentials themselves
 * (hashed) so a password rotated in the Tech portal rebuilds it — a constant
 * key meant a password-only change kept reusing the stale transporter and every
 * send failed SMTP auth until a process restart.
 */
function transporterFor(config: EmailProviderConfig): Transporter {
  const nextKey = createHash('sha256')
    .update(`${config.host} ${config.port} ${config.user} ${config.pass}`)
    .digest('hex');
  if (transporter && transporterKey === nextKey) return transporter;
  transporterKey = nextKey;
  // No host configured: nodemailer's jsonTransport accepts and discards, which
  // is what a local dev environment with no mailbox should do.
  transporter = config.host
    ? nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465 || config.secure,
        auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

export class SmtpProvider implements EmailProvider {
  readonly name = 'smtp';

  constructor(private readonly config: EmailProviderConfig) {}

  async send(email: PreparedEmail): Promise<EmailDelivery> {
    const info = await transporterFor(this.config).sendMail({
      from: email.from,
      to: email.to,
      bcc: email.bcc,
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
      attachments: email.attachments,
    });
    return {
      messageId: String(info.messageId ?? ''),
      provider: this.name,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    };
  }
}

// --- Resend -----------------------------------------------------------------

const RESEND_URL = 'https://api.resend.com/emails';

/** Resend only accepts letters, numbers, underscore and dash in a tag. */
function tagSafe(value: string): string {
  let out = '';
  for (const char of value) out += /[A-Za-z0-9_-]/.test(char) ? char : '_';
  return out.slice(0, 256);
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(private readonly config: EmailProviderConfig) {}

  async send(email: PreparedEmail): Promise<EmailDelivery> {
    const payload: Record<string, unknown> = {
      from: email.from,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      html: email.html,
      // The category rides as a tag so Resend's own dashboard can slice by it.
      tags: [{ name: 'category', value: tagSafe(email.category) }],
    };
    if (email.bcc?.length) payload.bcc = email.bcc;
    if (email.replyTo) payload.reply_to = email.replyTo;
    if (email.attachments?.length) {
      payload.attachments = email.attachments.map((file) => ({
        filename: file.filename,
        ...(file.path ? { path: file.path } : { content: toBase64(file.content ?? '') }),
      }));
    }

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      const reason = data.message ?? data.error ?? data.name ?? `HTTP ${res.status}`;
      throw new Error(`Resend rejected the email: ${reason} (HTTP ${res.status})`);
    }
    const recipients = [...(Array.isArray(email.to) ? email.to : [email.to]), ...(email.bcc ?? [])];
    return {
      messageId: String(data.id ?? ''),
      provider: this.name,
      accepted: recipients,
      rejected: [],
    };
  }
}

const toBase64 = (content: Buffer | string): string =>
  Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(content, 'utf8').toString('base64');

// --- Selection --------------------------------------------------------------

/** One config value as a string. An entry field is only ever a scalar. */
const str = (config: Record<string, unknown>, key: string): string => {
  const value = config[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

/**
 * The entry to send through.
 *
 * An explicit id wins whatever category it sits in — the CRM's mailbox picker
 * stores the entry id, not a category, and `resolveRuntime` looks an id up
 * directly. With no id, a Resend default is preferred over an SMTP one, so an
 * admin switches every email in the product by marking one entry default.
 */
async function resolveEntry(providerId?: string | null) {
  if (providerId) {
    const picked = await envEntryService.resolveRuntime('EMAIL', providerId);
    if (picked) return picked;
  }
  return (
    (await envEntryService.resolveRuntime('RESEND')) ??
    (await envEntryService.resolveRuntime('EMAIL'))
  );
}

/**
 * The provider behind the resolved entry.
 *
 * Decided by the entry's SHAPE, not its category: an API key with no SMTP host
 * is Resend, anything else is SMTP. Reading the shape is what keeps an explicit
 * entry id — which may sit in either category — from being sent the wrong way.
 */
export async function resolveEmailProvider(
  providerId?: string | null
): Promise<{
  provider: EmailProvider;
  config: EmailProviderConfig;
  entryId: string;
  entryName: string;
} | null> {
  const entry = await resolveEntry(providerId);
  if (!entry) return null;

  const raw = entry.config as Record<string, unknown>;
  const fromAddress = str(raw, 'from_address');
  const fromName = str(raw, 'from_name');
  const config: EmailProviderConfig = {
    host: str(raw, 'host'),
    port: Number(str(raw, 'port')) || 587,
    user: str(raw, 'user'),
    pass: str(raw, 'password'),
    secure: str(raw, 'secure') === 'true',
    from: fromName && fromAddress ? `${fromName} <${fromAddress}>` : fromAddress,
    replyTo: str(raw, 'reply_to'),
    apiKey: str(raw, 'api_key'),
  };

  // An API key with no SMTP host is Resend; anything else is SMTP.
  const provider = config.apiKey && !config.host ? new ResendProvider(config) : new SmtpProvider(config);
  logs.server.debug('email', 'provider', { provider: provider.name, entry: entry.name });
  return { provider, config, entryId: entry.id, entryName: entry.name };
}
