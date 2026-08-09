import { createHash } from 'node:crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { logs } from '@observability/log';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';

/**
 * The server's email provider layer.
 *
 * Shaped after `@duncit/communication`'s email channel: a {@link PreparedEmail}
 * goes in, one send comes out, and nothing above this file knows how. It is a
 * copy rather than an import because `server/src` takes no `@duncit/*`
 * dependency (project rule 40) — the server runs compiled `dist` on plain Node,
 * where a source-only workspace package does not resolve. Same arrangement as
 * `@duncit/slack`.
 *
 * SMTP is the ONLY transport. The {@link EmailProvider} seam is kept because
 * the delivery record and the email log are written in its vocabulary, not
 * because there is a second vendor to choose between — the package still ships
 * an HTTP provider the server deliberately does not, so do not mirror one back
 * in from there without being asked for it.
 *
 * Two senders used to keep their own nodemailer: the transactional service and
 * the CRM's lead comms. Both now come through here, so an admin who switches
 * mailbox switches both, and a fix to one is not a fix to only one.
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
  /**
   * True when the send was deliberately not made — today only because the
   * template is switched off. Distinguishes "we chose not to" from "it went to
   * nobody", which look identical in an empty `accepted`.
   */
  skipped?: boolean;
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
 * An explicit id wins — the CRM's mailbox picker stores the entry id, not a
 * category, and `resolveRuntime` looks an id up directly. With no id, the
 * EMAIL category's active default is used, so an admin switches every email in
 * the product by marking one entry default.
 */
async function resolveEntry(providerId?: string | null) {
  if (providerId) {
    const picked = await envEntryService.resolveRuntime('EMAIL', providerId);
    if (picked) return picked;
  }
  return envEntryService.resolveRuntime('EMAIL');
}

/**
 * The provider behind the resolved entry. SMTP is the only email transport the
 * product has, so the entry supplies credentials and nothing chooses a vendor.
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
  };

  const provider = new SmtpProvider(config);
  logs.server.debug('email', 'provider', { provider: provider.name, entry: entry.name });
  return { provider, config, entryId: entry.id, entryName: entry.name };
}
