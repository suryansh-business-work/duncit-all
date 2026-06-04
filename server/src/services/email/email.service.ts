import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';
import nodemailer, { Transporter } from 'nodemailer';
import { emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { getMailConfigs } from '../../config/url-configs';

let transporter: Transporter | null = null;
let transporterKey = '';

async function getTransporter(): Promise<Transporter> {
  const { host, port, user, pass } = await getMailConfigs();
  const nextKey = [host, port, user, pass ? 'secret' : ''].join('|');
  if (transporter && transporterKey === nextKey) return transporter;
  transporterKey = nextKey;
  if (!host) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      user && pass
        ? { user, pass }
        : undefined,
  });
  return transporter;
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
  } catch {
    // Fallback: render straight from disk.
    const filePath = path.join(__dirname, 'templates', `${name}.mjml`);
    let raw = fs.readFileSync(filePath, 'utf8');
    for (const [k, v] of Object.entries(vars)) {
      raw = raw.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v);
    }
    const { html, errors } = mjml2html(raw, { validationLevel: 'soft' }) as unknown as {
      html: string;
      errors: any[];
    };
    if (errors?.length) console.warn('MJML warnings:', errors);
    return { html };
  }
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  template: string;
  vars?: Record<string, string>;
  attachments?: EmailAttachment[];
}) {
  const rendered = await renderTemplate(opts.template, opts.vars ?? {});
  const { from } = await getMailConfigs();
  const info = await (await getTransporter()).sendMail({
    from,
    to: opts.to,
    subject: rendered.subject || opts.subject,
    html: rendered.html,
    attachments: opts.attachments,
  });
  // eslint-disable-next-line no-console
  console.log(`📧 Email queued -> ${opts.to} (${info.messageId})`);
  return info;
}

export async function sendHtmlEmail(opts: {
  to: string | string[];
  bcc?: string[];
  subject: string;
  html: string;
}) {
  const { from } = await getMailConfigs();
  const info = await (await getTransporter()).sendMail({
    from,
    to: opts.to,
    bcc: opts.bcc,
    subject: opts.subject,
    html: opts.html,
  });
  // eslint-disable-next-line no-console
  console.log(`📧 Campaign email queued (${info.messageId})`);
  return info;
}

export function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Duncit 🎉',
    template: 'welcome',
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
    vars: { name: opts.name },
  });
}

export function sendAdminAccessRevokedEmail(opts: { to: string; name: string }) {
  return sendEmail({
    to: opts.to,
    subject: 'Your Duncit admin access was removed',
    template: 'admin-access-revoked',
    vars: { name: opts.name },
  });
}

export function sendEmailVerificationOtpEmail(opts: { to: string; name: string; otp: string; expiresMinutes: string }) {
  return sendEmail({
    to: opts.to,
    subject: 'Verify your Duncit email',
    template: 'email-verification-otp',
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
    vars: opts,
  });
}
