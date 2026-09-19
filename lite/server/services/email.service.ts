import { createHash } from 'node:crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { LiteEmailLogModel } from '../models/emailLog.model';
import { LiteEmailTemplateModel } from '../models/emailTemplate.model';
import { log } from '../utils/log';
import { DEFAULT_TEMPLATES } from './email.templates';
import { envEntryService, readString, type EnvConfig } from './envEntry.service';
import { settingsService } from './settings.service';

/**
 * SMTP is the only transport, read from the console's EMAIL entry. With no
 * entry configured the send is recorded as SKIPPED — a fresh install still
 * signs people in through the stub code — and nothing above this file changes
 * when a mailbox is added.
 */
export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  replyTo: string;
}

let transporter: Transporter | null = null;
let transporterKey = '';

function smtpFrom(config: EnvConfig | null): SmtpConfig | null {
  if (!config) return null;
  const host = readString(config, 'host');
  if (!host) return null;
  const fromAddress = readString(config, 'from_address') || readString(config, 'user');
  const fromName = readString(config, 'from_name');
  return {
    host,
    port: Number.parseInt(readString(config, 'port') || '587', 10),
    user: readString(config, 'user'),
    pass: readString(config, 'password'),
    secure: config.secure === true,
    from: fromName ? `"${fromName.replaceAll('"', '')}" <${fromAddress}>` : fromAddress,
    replyTo: readString(config, 'reply_to'),
  };
}

function transporterFor(config: SmtpConfig): Transporter {
  const key = createHash('sha256').update(`${config.host} ${config.port} ${config.user} ${config.pass}`).digest('hex');
  if (transporter && transporterKey === key) return transporter;
  transporterKey = key;
  transporter?.close();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    pool: true,
  });
  return transporter;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string): string => value.replaceAll(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
const URL_IN_TEXT = /(https?:\/\/[^\s<]+)/g;

export type TemplateVars = Record<string, string | number>;

export function interpolate(template: string, vars: TemplateVars): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) => (vars[name] === undefined ? match : String(vars[name])));
}

/** Paragraphs of escaped text, links made clickable, inside the Duncit chrome. */
export function renderHtml(body: string, siteName: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block.trim()).replaceAll('\n', '<br />').replaceAll(URL_IN_TEXT, '<a href="$1" style="color:#D92D2D">$1</a>'))
    .filter(Boolean)
    .map((html) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#151515">${html}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#F6F6F8;font-family:Nunito,-apple-system,Segoe UI,Roboto,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F8;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px"><tr><td style="font-size:20px;font-weight:800;color:#D92D2D;padding-bottom:20px">${escapeHtml(siteName)}</td></tr><tr><td>${paragraphs}</td></tr><tr><td style="font-size:12px;color:#6b7280;padding-top:16px;border-top:1px solid #eee">${escapeHtml(siteName)} · ${escapeHtml(env.siteUrl)}</td></tr></table></td></tr></table></body></html>`;
}

export interface SendInput {
  to: string;
  templateKey: string;
  vars: TemplateVars;
  eventId?: string | null;
}

export interface SendOutcome {
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  message: string;
}

async function record(input: SendInput, subject: string, status: SendOutcome['status'], detail: { error?: string; messageId?: string }) {
  await LiteEmailLogModel.create({
    to: input.to,
    subject,
    template_key: input.templateKey,
    status,
    error: detail.error ?? '',
    message_id: detail.messageId ?? '',
    event_id: input.eventId ?? null,
  });
}

export const emailService = {
  async seedTemplates(): Promise<void> {
    for (const t of DEFAULT_TEMPLATES) {
      await LiteEmailTemplateModel.updateOne(
        { key: t.key },
        { $setOnInsert: { key: t.key, subject: t.subject, body: t.body, enabled: true }, $set: { name: t.name, description: t.description, vars: t.vars } },
        { upsert: true },
      );
    }
  },

  async smtp(): Promise<SmtpConfig | null> {
    return smtpFrom(await envEntryService.activeConfig('EMAIL'));
  },

  /** Send one templated email, log it, and never throw at the caller. */
  async send(input: SendInput): Promise<SendOutcome> {
    const settings = await settingsService.get();
    const vars: TemplateVars = { site_name: settings.site_name, ...input.vars };
    const template = await LiteEmailTemplateModel.findOne({ key: input.templateKey }).lean();
    if (!template) {
      log.error('email', 'send', { msg: 'unknown template', templateKey: input.templateKey });
      return { status: 'FAILED', message: `No template named ${input.templateKey}` };
    }
    const subject = interpolate(template.subject, vars);
    if (!template.enabled) {
      await record(input, subject, 'SKIPPED', { error: 'Template switched off' });
      return { status: 'SKIPPED', message: 'Template switched off' };
    }
    const outcome = await this.sendRaw(input.to, subject, interpolate(template.body, vars), settings.site_name);
    await record(input, subject, outcome.status, { error: outcome.status === 'SENT' ? '' : outcome.message, messageId: outcome.messageId });
    if (outcome.status === 'SENT') await LiteEmailTemplateModel.updateOne({ key: input.templateKey }, { $inc: { sent_count: 1 } });
    return outcome;
  },

  /** A plain send with no template; the console's "send test" uses this too. */
  async sendRaw(to: string, subject: string, body: string, siteName: string, override?: SmtpConfig | null): Promise<SendOutcome & { messageId?: string }> {
    const config = override ?? (await this.smtp());
    if (!config) return { status: 'SKIPPED', message: 'No mailbox configured (Console → Environment → Email)' };
    try {
      const info = await transporterFor(config).sendMail({
        from: config.from,
        to,
        replyTo: config.replyTo || undefined,
        subject,
        text: body,
        html: renderHtml(body, siteName),
      });
      return { status: 'SENT', message: `Sent to ${to}`, messageId: String(info.messageId ?? '') };
    } catch (error) {
      log.error('email', 'sendRaw', { error, to, subject });
      return { status: 'FAILED', message: error instanceof Error ? error.message : 'Send failed' };
    }
  },
};

export const smtpFromConfig = smtpFrom;
