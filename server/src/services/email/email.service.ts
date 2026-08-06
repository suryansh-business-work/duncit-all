import fs from 'node:fs';
import path from 'node:path';
import { emailTranslationVars, recipientLocale } from './email-i18n';
import {
  emailTemplateService,
  renderTemplateBody,
} from '@modules/content/emailTemplate/emailTemplate.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { logs } from '@observability/log';
import { emailLogService } from '@modules/content/emailLog/emailLog.service';
import type { EmailLogSource } from '@modules/content/emailLog/emailLog.model';
import { getMailConfigs, getUrlConfigs } from '../../config/url-configs';
import { TEMPLATE_CATEGORIES, TEMPLATE_FOOTER_NOTES } from './template-categories';
import {
  SmtpProvider,
  resolveEmailProvider,
  type EmailCategory,
  type EmailDelivery,
  type EmailProviderConfig,
} from './email.provider';

/**
 * No mailbox at all — a local machine, or a fresh install before anyone has
 * added an entry. The SMTP provider builds a json transport for this, which
 * accepts and discards, so a signup still completes.
 */
const EMPTY_SMTP: EmailProviderConfig = {
  host: '',
  port: 587,
  user: '',
  pass: '',
  secure: false,
  from: '',
  replyTo: '',
  apiKey: '',
};

export type { EmailCategory } from './email.provider';

/** Legacy hardcoded logo URL still baked into DB-cached templates. */
const LEGACY_LOGO_URL = 'https://duncit.com/duncit-logo.svg';
/** Short TTL so we don't hit the branding singleton on every send. */
const BRAND_LOGO_TTL_MS = 60_000;
let brandCache: { logoUrl: string; appName: string; at: number } | null = null;

/**
 * Branding for one email, cached for a short TTL.
 *
 * The logo AND the brand name come from one read. They used to be two — the
 * footer fragment needed a name and asked for it separately — which quietly
 * doubled the singleton lookups on every send and defeated the cache this was
 * built around.
 *
 * Best-effort: any failure (or an empty logo) falls back to the legacy Duncit
 * logo, so an email always renders an image.
 */
async function getBrand(): Promise<{ logoUrl: string; appName: string }> {
  const now = Date.now();
  if (brandCache && now - brandCache.at < BRAND_LOGO_TTL_MS) return brandCache;

  let logoUrl = LEGACY_LOGO_URL;
  let appName = 'Duncit';
  try {
    const branding = await settingsService.getBranding();
    logoUrl = branding.logo_url || LEGACY_LOGO_URL;
    appName = branding.app_name || appName;
  } catch {
    logoUrl = LEGACY_LOGO_URL;
  }
  brandCache = { logoUrl, appName, at: now };
  return brandCache;
}

const getBrandLogoUrl = async (): Promise<string> => (await getBrand()).logoUrl;

/**
 * Replace any leftover hardcoded legacy logo URL with the resolved brand logo.
 * Covers templates already cached in the DB with the old hardcoded `src` that
 * the `{{brand_logo_url}}` var alone wouldn't touch.
 */
function swapLegacyLogo(html: string, brandLogoUrl: string): string {
  if (brandLogoUrl === LEGACY_LOGO_URL) return html;
  // Global literal replace without ES2021 `replaceAll` (tsconfig lib) and
  // without regex-escaping the URL's `/` and `.`.
  return html.split(LEGACY_LOGO_URL).join(brandLogoUrl);
}

/**
 * The values every header/footer fragment needs — the brand's name, where to
 * write for help, where the site lives, and the year on the copyright line.
 * Supplied on every send so a fragment is self-sufficient and no call site has
 * to know it exists.
 */
async function chromeVars(): Promise<Record<string, string>> {
  const [{ supportEmail, websiteUrl }, brand] = await Promise.all([getUrlConfigs(), getBrand()]);
  return {
    support_email: supportEmail,
    website_url: websiteUrl,
    app_name: brand.appName,
    year: String(new Date().getFullYear()),
  };
}

/**
 * The variables a real send supplies, for the editor's preview.
 *
 * Without these a preview shows raw `{{t:email.fragment.help}}` and an empty
 * logo, which is not what anyone is about to send — and a header/footer
 * fragment is made almost entirely of them.
 */
export async function emailPreviewVars(): Promise<Record<string, string>> {
  const [logo, chrome, translations] = await Promise.all([
    getBrandLogoUrl(),
    chromeVars(),
    emailTranslationVars(null),
  ]);
  return { brand_logo_url: logo, ...chrome, ...translations };
}

/**
 * Hand the message to whichever provider is configured. The Tech portal's
 * active default decides — an SMTP entry sends over SMTP, a Resend entry sends
 * over the API — and `email.provider.ts` owns both. This file only knows what
 * the message says.
 */
async function deliver(
  email: {
    category: EmailCategory;
    to: string | string[];
    bcc?: string[];
    replyTo?: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  },
  /**
   * A specific Tech-portal entry to send through. The CRM lets a user pick
   * which mailbox they are writing from; everything else takes the active
   * default. This argument is why there does not need to be a second send
   * function that talks to the provider directly.
   */
  providerId?: string | null
): Promise<EmailDelivery & { entryId: string | null; entryName: string }> {
  const { from } = await getMailConfigs();
  const resolved = await resolveEmailProvider(providerId);
  // No entry configured at all is a local machine with no mailbox. The SMTP
  // provider's json transport accepts and discards, so a signup still works
  // rather than failing because nobody set email up.
  const provider = resolved?.provider ?? new SmtpProvider(EMPTY_SMTP);
  const info = await provider.send({
    ...email,
    from: resolved?.config.from || from,
    replyTo: email.replyTo ?? resolved?.config.replyTo ?? undefined,
  });
  return { ...info, entryId: resolved?.entryId ?? null, entryName: resolved?.entryName ?? '' };
}

/**
 * Render a template by name. Tries the DB first (which auto-imports the disk
 * file on first read), so admin edits in the email-template editor take
 * effect immediately. Falls back to direct disk read if Mongo is unreachable.
 */
async function renderTemplate(
  name: string,
  vars: Record<string, string>
): Promise<{ subject?: string; html: string }> {
  try {
    const r = await emailTemplateService.render(name, vars);
    return { subject: r.subject, html: r.html };
  } catch (error) {
    // Fallback: the database could not answer, so read the file.
    //
    // It goes through the SAME renderer as the normal path. It used to call
    // mjml2html directly, which quietly dropped the header/footer wrap and the
    // footer sentence — and since the on-disk templates became bodies with no
    // chrome of their own, that fallback started producing emails with no logo
    // and no footer at all. It also swallowed the reason, so nobody could see
    // it was happening.
    const filePath = path.join(__dirname, 'templates', `${name}.mjml`);
    if (!fs.existsSync(filePath)) throw error;

    logs.server.warn('email', 'template-disk-fallback', {
      template: name,
      error,
      msg: `Rendering "${name}" from disk — the database copy could not be read`,
    });

    const { html, errors } = await renderTemplateBody({
      mjml: fs.readFileSync(filePath, 'utf8'),
      fragment_key: TEMPLATE_CATEGORIES[name] ?? null,
      footer_note: TEMPLATE_FOOTER_NOTES[name] ?? '',
      vars,
    });
    if (errors.length) logs.server.warn('email', 'mjml', { template: name, errors });
    return { html };
  }
}

/**
 * A file on the message: inline bytes, or a URL the provider fetches.
 *
 * Both, because one send method serves both callers — a ticket transcript
 * arrives as bytes, and the CRM attaches an ImageKit link it never downloads.
 * The provider layer already understood both shapes; only this type did not.
 */
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  /** A URL instead of bytes. */
  path?: string;
  contentType?: string;
}

export interface SendResult extends EmailDelivery {
  /** Which Tech-portal entry carried it, for the CRM to record against a lead. */
  entryId?: string | null;
  entryName?: string;
}

/**
 * How a completed delivery should be filed. SMTP accepts a message and refuses
 * individual recipients in the same reply, so "the send did not throw" is not
 * the same as "everyone got it" — a bad address inside a batch used to be
 * recorded as SENT with nothing to show it was dropped.
 */
function deliveryOutcome(info: EmailDelivery): { status: 'SENT' | 'FAILED'; reason?: string } {
  if (!info.rejected.length) return { status: 'SENT' };
  const refused = `Refused by the mail server: ${info.rejected.join(', ')}`;
  // Nobody accepted = nothing was delivered, whatever the provider returned.
  if (!info.accepted.length) return { status: 'FAILED', reason: refused };
  return { status: 'SENT', reason: refused };
}

/**
 * Send a templated email. THE method for anything with a template.
 *
 * Every outcome is recorded in the email log — sent, deliberately skipped, or
 * failed — because the expensive question is always "why did this person not
 * get their email?", and the answer is most often an attempt that never reached
 * a mail server at all and so appears in no provider's dashboard.
 *
 * It does not throw. A disabled template or a provider outage must not take a
 * checkout or a signup down with it; the caller gets a result saying what
 * happened, and the log carries the reason.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  template: string;
  vars?: Record<string, string>;
  attachments?: EmailAttachment[];
  /**
   * Why this is being sent. Metadata, not routing — it is what makes "how many
   * marketing emails went out" answerable, and what a suppression rule reads.
   */
  category?: EmailCategory;
  /** Overrides the recipient's saved language, for the rare address that is
   * not a user account. Omitted = looked up from `to`, then the default. */
  locale?: string | null;
}): Promise<SendResult> {
  const startedAt = Date.now();
  const category = opts.category ?? 'transactional';

  const notSent = (reason: string, status: 'SKIPPED' | 'FAILED'): SendResult => {
    logs.server.warn('email', 'not-sent', { to: opts.to, template: opts.template, reason });
    void emailLogService.record({
      to: opts.to,
      subject: opts.subject,
      template: opts.template,
      category,
      status,
      reason,
      duration_ms: Date.now() - startedAt,
    });
    return { messageId: '', provider: 'none', accepted: [], rejected: [], skipped: true };
  };

  // The cheapest failures first, so a message with nobody to send to never
  // reaches a renderer or a provider — and is still on the record.
  if (!opts.to?.trim()) return notSent('No recipient address', 'FAILED');

  try {
    // Inside the try, not above it. `bySlug` reads Mongo and CREATES the row on
    // a slug's first use, so it throws on an outage and on two sends racing the
    // same new slug — and a throw here escaped the whole function, taking both
    // the log row and the "does not throw" promise below with it. A password
    // reset then failed as a GraphQL error after the OTP was already stored.
    const template = await emailTemplateService.bySlug(opts.template);
    if (!template) return notSent(`Template "${opts.template}" does not exist`, 'FAILED');
    if (template.is_active === false) {
      return notSent(`Template "${opts.template}" is not active`, 'SKIPPED');
    }

    const brandLogoUrl = await getBrandLogoUrl();
    // Localized copy arrives as `t:<key>` vars, so templates pick it up through
    // the SAME {{ }} substitution as every other variable (rule 38). Caller vars
    // stay last so an explicit value always wins.
    const locale = opts.locale ?? (await recipientLocale(opts.to));
    const translations = await emailTranslationVars(locale);
    const vars = {
      brand_logo_url: brandLogoUrl,
      // Supplied on every send so a header/footer fragment never has to be told
      // them, and no call site has to remember to pass them.
      ...(await chromeVars()),
      ...translations,
      ...opts.vars,
    };
    const rendered = await renderTemplate(opts.template, vars);
    const html = swapLegacyLogo(rendered.html, brandLogoUrl);
    const info = await deliver({
      category,
      to: opts.to,
      subject: rendered.subject || opts.subject,
      html,
      attachments: opts.attachments,
    });

    const outcome = deliveryOutcome(info);
    void emailLogService.record({
      to: opts.to,
      subject: rendered.subject || opts.subject,
      template: opts.template,
      fragment_key: template.fragment_key ?? null,
      category,
      status: outcome.status,
      reason: outcome.reason,
      provider: info.provider,
      message_id: info.messageId,
      // What this person actually received, and what it was filled in with.
      // A template is edited; a row from two weeks ago has to keep showing the
      // email as it went out, not as the template reads today.
      html,
      vars: opts.vars,
      duration_ms: Date.now() - startedAt,
    });
    logs.server.info('email', 'send', {
      to: opts.to,
      template: opts.template,
      category,
      provider: info.provider,
      messageId: info.messageId,
    });
    // A send everyone refused is not a send. Callers read `skipped` to decide
    // whether to tell a user their email is on the way.
    return { ...info, skipped: outcome.status === 'FAILED' };
  } catch (error: any) {
    return notSent(error?.message || 'Send failed', 'FAILED');
  }
}

/**
 * Send ready-made HTML. THE method for anything without a template — campaigns,
 * support transcripts, release notices, CRM lead mail.
 *
 * `provider_id` is why there is no second send function: the CRM lets a user
 * pick which mailbox they are writing from, and that used to be reason enough
 * to call the provider directly and skip the logo swap, the from-address
 * fallback and the audit line along with it.
 *
 * Logged and non-throwing for the same reasons as {@link sendEmail}.
 */
export async function sendHtmlEmail(opts: {
  to: string | string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  /** Defaults to marketing: this is the campaign/bulk path. */
  category?: EmailCategory;
  /** A specific Tech-portal mailbox, for the CRM's "send as" picker. */
  provider_id?: string | null;
  /**
   * The template this HTML came from, when it came from one. A test send is
   * raw HTML by the time it reaches here, and a log row that cannot say WHICH
   * template was tested is a row nobody can use.
   */
  template?: string;
  fragment_key?: string | null;
  /** Overrides the request's surface in the log (e.g. CRM, TEST). */
  source?: EmailLogSource;
  source_detail?: string;
  /**
   * The variables the HTML was rendered with. This path receives finished HTML,
   * so it cannot work them out — but the log row is far more use with them, and
   * a test send is exactly the row someone opens to ask "what did it fill in?".
   */
  vars?: Record<string, string>;
}): Promise<SendResult> {
  const startedAt = Date.now();
  const category = opts.category ?? 'marketing';
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter((r) => r?.trim());

  const failed = (reason: string): SendResult => {
    logs.server.warn('email', 'not-sent', { to: recipients.join(', '), reason });
    void emailLogService.record({
      template: opts.template,
      fragment_key: opts.fragment_key,
      to: recipients,
      bcc: opts.bcc,
      subject: opts.subject,
      category,
      status: 'FAILED',
      reason,
      source: opts.source,
      source_detail: opts.source_detail,
      duration_ms: Date.now() - startedAt,
    });
    return { messageId: '', provider: 'none', accepted: [], rejected: [], skipped: true };
  };

  if (recipients.length === 0 && !opts.bcc?.length) return failed('No recipient address');
  if (!opts.html?.trim()) return failed('No message body');

  try {
    const brandLogoUrl = await getBrandLogoUrl();
    const html = swapLegacyLogo(opts.html, brandLogoUrl);
    const info = await deliver(
      {
        category,
        to: opts.to,
        bcc: opts.bcc,
        replyTo: opts.replyTo,
        subject: opts.subject,
        html,
        attachments: opts.attachments,
      },
      opts.provider_id
    );

    const outcome = deliveryOutcome(info);
    void emailLogService.record({
      template: opts.template,
      fragment_key: opts.fragment_key,
      to: recipients,
      bcc: opts.bcc,
      subject: opts.subject,
      category,
      status: outcome.status,
      reason: outcome.reason,
      provider: info.provider,
      message_id: info.messageId,
      source: opts.source,
      source_detail: opts.source_detail,
      html,
      vars: opts.vars,
      duration_ms: Date.now() - startedAt,
    });
    logs.server.info('email', 'send-html', {
      category,
      provider: info.provider,
      messageId: info.messageId,
    });
    // A send everyone refused is not a send. Callers read `skipped` to decide
    // whether to tell a user their email is on the way.
    return { ...info, skipped: outcome.status === 'FAILED' };
  } catch (error: any) {
    return failed(error?.message || 'Send failed');
  }
}

export function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Duncit 🎉',
    template: 'welcome',
    category: 'transactional',
    vars: { name },
  });
}

export function sendAdminCredentialsEmail(opts: {
  to: string;
  name: string;
  email: string;
  password: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: 'Your Duncit Super Admin Credentials',
    template: 'admin-credentials',
    category: 'authentication',
    vars: {
      name: opts.name,
      email: opts.email,
      password: opts.password,
    },
  });
}

export function sendAdminAccessGrantedEmail(opts: { to: string; name: string }) {
  return sendEmail({
    to: opts.to,
    subject: 'Welcome to Duncit as an Admin',
    template: 'admin-access-granted',
    category: 'internal',
    vars: { name: opts.name },
  });
}

/** Partner access (Host / Venue Partner / Club Admin / Product Seller) went
 * live — the Partners-account link + login guidance (existing Duncit account;
 * passwords are never emailed). */
export function sendPartnerAccessGrantedEmail(opts: {
  to: string;
  name: string;
  partner_type: string;
  portal_url: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.partner_type} access is live 🎉`,
    template: 'partner-access-granted',
    category: 'notification',
    vars: {
      name: opts.name,
      partner_type: opts.partner_type,
      portal_url: opts.portal_url,
      email: opts.to,
    },
  });
}

export function sendAdminAccessRevokedEmail(opts: { to: string; name: string }) {
  return sendEmail({
    to: opts.to,
    subject: 'Your Duncit admin access was removed',
    template: 'admin-access-revoked',
    category: 'internal',
    vars: { name: opts.name },
  });
}

export function sendEmailVerificationOtpEmail(opts: { to: string; name: string; otp: string; expiresMinutes: string }) {
  return sendEmail({
    to: opts.to,
    subject: 'Verify your Duncit email',
    template: 'email-verification-otp',
    category: 'authentication',
    vars: opts,
  });
}

export function sendPasswordResetOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
  expiresMinutes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: 'Reset your Duncit password',
    template: 'password-reset-otp',
    category: 'authentication',
    vars: opts,
  });
}

export function sendPasswordChangeOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
  expiresMinutes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: 'Confirm your Duncit password change',
    template: 'password-change-otp',
    category: 'authentication',
    vars: opts,
  });
}

export function sendAccountDeletionOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
  expiresMinutes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: 'Confirm your Duncit account deletion',
    template: 'account-deletion-otp',
    category: 'authentication',
    vars: opts,
  });
}

export function sendInterviewApplicantEmail(opts: {
  to: string;
  name: string;
  type: string;
  about: string;
  slots: string;
  ref: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.type} application is received`,
    template: 'interview-applicant',
    category: 'notification',
    vars: opts,
  });
}

export function sendInterviewAdminEmail(opts: {
  to: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  about: string;
  slots: string;
  adminLink: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `New ${opts.type} application — ${opts.name}`,
    template: 'interview-admin',
    category: 'internal',
    vars: opts,
  });
}

export function sendInterviewScheduledEmail(opts: {
  to: string;
  name: string;
  type: string;
  slot: string;
  link: string;
  ref: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.type} interview is scheduled`,
    template: 'interview-scheduled',
    category: 'notification',
    vars: opts,
  });
}

export function sendMeetingScheduledEmail(opts: {
  to: string;
  name: string;
  kind: string;
  slot: string;
  link: string;
  notes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.kind} onboarding meeting is scheduled`,
    template: 'meeting-scheduled',
    category: 'notification',
    vars: opts,
  });
}

export function sendMeetingBookedEmail(opts: {
  to: string;
  name: string;
  kind: string;
  slot: string;
  notes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.kind} onboarding meeting is booked`,
    template: 'meeting-booked',
    category: 'notification',
    vars: opts,
  });
}

export function sendMeetingCancelledEmail(opts: {
  to: string;
  name: string;
  kind: string;
  slot: string;
  notes: string;
  /** Staff cancellation reason line; empty for self-cancels. */
  reason?: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.kind} onboarding meeting is cancelled`,
    template: 'meeting-cancelled',
    category: 'notification',
    vars: { ...opts, reason: opts.reason ?? '' },
  });
}

/** Alerts a venue owner that a host requested one of their availability slots
 * and it's waiting for approval in the Partners portal's Slot Requests inbox. */
export function sendVenueSlotRequestEmail(opts: {
  to: string;
  owner_name: string;
  venue_name: string;
  pod_title: string;
  host_name: string;
  when: string;
  review_url: string;
  /** One-tap CTAs into the decision page with the intent pre-selected. */
  approve_url: string;
  decline_url: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `New slot booking request — ${opts.pod_title}`,
    template: 'venue-slot-request',
    category: 'notification',
    vars: opts,
  });
}

export function sendPodUpdatedEmail(opts: {
  to: string;
  name: string;
  pod_title: string;
  when: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Pod updated — ${opts.pod_title}`,
    template: 'pod-updated',
    category: 'notification',
    vars: opts,
  });
}

export function sendPodCancelledEmail(opts: {
  to: string;
  name: string;
  pod_title: string;
  when: string;
  reason: string;
  /** "Your payment of ₹X will be refunded." line; empty for free attendees. */
  refund_line?: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Pod cancelled — ${opts.pod_title}`,
    template: 'pod-cancelled',
    category: 'notification',
    vars: { ...opts, refund_line: opts.refund_line ?? '' },
  });
}

export function sendPodRefundEmail(opts: {
  to: string;
  name: string;
  pod_title: string;
  amount: string;
  reason: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Refund initiated — ${opts.pod_title}`,
    template: 'pod-refund',
    category: 'billing',
    vars: opts,
  });
}

/** A replacement booked the seat a member released via Backout. */
export function sendBackoutSpotFilledEmail(opts: {
  to: string;
  name: string;
  pod_title: string;
  /** "Your refund of ₹X will be processed…" line; empty for free bookings. */
  refund_line: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Your spot was filled — ${opts.pod_title}`,
    template: 'pod-backout-spot-filled',
    category: 'notification',
    vars: opts,
  });
}

export function sendMeetingScheduledAdminEmail(opts: {
  to: string;
  name: string;
  email: string;
  kind: string;
  slot: string;
  link: string;
  notes: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.kind} onboarding meeting scheduled — ${opts.name}`,
    template: 'meeting-scheduled-admin',
    category: 'internal',
    vars: opts,
  });
}

/** Staff rescheduled the meeting or changed its details (link/instructions). */
export function sendMeetingRescheduledEmail(opts: {
  to: string;
  name: string;
  kind: string;
  slot: string;
  link: string;
  notes: string;
  /** "rescheduled" | "updated" — drives the heading/intro copy. */
  change: string;
}) {
  const updated = opts.change === 'updated';
  return sendEmail({
    to: opts.to,
    subject: updated
      ? `Your Duncit ${opts.kind} onboarding meeting details were updated`
      : `Your Duncit ${opts.kind} onboarding meeting was rescheduled`,
    template: 'meeting-rescheduled',
    category: 'notification',
    vars: {
      ...opts,
      heading: updated ? 'Your meeting details were updated' : 'Your meeting was rescheduled',
      intro: updated
        ? `We've updated the details of your ${opts.kind} onboarding meeting. Here's the latest:`
        : `Your ${opts.kind} onboarding meeting has been moved to a new time:`,
    },
  });
}

/** Onboarding decision after the meeting — the applicant was approved. */
export function sendMeetingApprovedEmail(opts: { to: string; name: string; kind: string }) {
  return sendEmail({
    to: opts.to,
    subject: `Your Duncit ${opts.kind} onboarding is approved 🎉`,
    template: 'meeting-approved',
    category: 'notification',
    vars: opts,
  });
}

/** Onboarding decision after the meeting — the applicant was not approved. */
export function sendMeetingRejectedEmail(opts: { to: string; name: string; kind: string }) {
  return sendEmail({
    to: opts.to,
    subject: `Update on your Duncit ${opts.kind} onboarding`,
    template: 'meeting-rejected',
    category: 'notification',
    vars: opts,
  });
}
