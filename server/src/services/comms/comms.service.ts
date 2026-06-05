import nodemailer from 'nodemailer';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import type { EnvCategory } from '@modules/platform/envEntry/envEntry.model';

/**
 * Outbound lead communications. Email goes through the Tech-portal EMAIL (SMTP)
 * entry; calls go through the TWILIO entry. The selected entry (provider_id) is
 * used when active, else the category default. Credentials are owned by the
 * Tech portal's Environment Variables — there is no `.env` fallback.
 */
export interface CommsResult {
  ok: boolean;
  message: string;
  provider: string;
  provider_id?: string | null;
  external_id?: string | null;
  recording_url?: string | null;
}

const str = (config: Record<string, unknown>, key: string) => {
  const v = config[key];
  return v === undefined || v === null ? '' : String(v);
};

const notConfigured = (provider: string, what: string): CommsResult => ({
  ok: false,
  provider,
  provider_id: null,
  message: `No active ${provider.toUpperCase()} entry for ${what}. Add one under Environment Variables in the Tech portal.`,
});

async function resolve(category: EnvCategory, providerId?: string | null) {
  return envEntryService.resolveRuntime(category, providerId);
}

export const commsService = {
  /** Send an email via the selected/default EMAIL (SMTP) env entry. */
  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    provider_id?: string | null;
    /** Optional file attachments addressed by URL (e.g. ImageKit links). */
    attachments?: { url: string; name?: string | null }[] | null;
  }): Promise<CommsResult> {
    const entry = await resolve('EMAIL', input.provider_id);
    if (!entry) return notConfigured('smtp', 'email');
    const cfg = entry.config as Record<string, unknown>;
    const host = str(cfg, 'host');
    if (!host) return { ok: false, provider: 'smtp', provider_id: entry.id, message: `${entry.name} has no SMTP host configured` };
    const port = Number(str(cfg, 'port')) || 587;
    const user = str(cfg, 'user');
    const pass = str(cfg, 'password');
    const from = str(cfg, 'from_address') || user;
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465 || str(cfg, 'secure') === 'true',
        auth: user && pass ? { user, pass } : undefined,
      });
      const attachments = (input.attachments ?? [])
        .filter((a) => a && a.url)
        .map((a) => ({ filename: a.name || a.url.split('/').pop() || 'attachment', path: a.url }));
      const info = await transporter.sendMail({
        from: str(cfg, 'from_name') ? `${str(cfg, 'from_name')} <${from}>` : from,
        to: input.to,
        replyTo: str(cfg, 'reply_to') || undefined,
        subject: input.subject,
        html: input.body,
        attachments: attachments.length ? attachments : undefined,
      });
      return {
        ok: true,
        provider: 'smtp',
        provider_id: entry.id,
        external_id: String(info.messageId ?? '') || null,
        message: `Email sent to ${input.to} via ${entry.name}`,
      };
    } catch (err: any) {
      return { ok: false, provider: 'smtp', provider_id: entry.id, message: err?.message || `${entry.name} email failed` };
    }
  },

  /** Place a call via the selected/default TWILIO env entry. */
  async call(input: { to: string; provider_id?: string | null }): Promise<CommsResult> {
    const entry = await resolve('TWILIO', input.provider_id);
    if (!entry) return notConfigured('twilio', 'calls');
    const cfg = entry.config as Record<string, unknown>;
    const sid = str(cfg, 'account_sid');
    const token = str(cfg, 'auth_token');
    const from = str(cfg, 'phone_number');
    if (!sid || !token || !from) {
      return { ok: false, provider: 'twilio', provider_id: entry.id, message: `${entry.name} needs Account SID, auth token and phone number` };
    }
    try {
      const body = new URLSearchParams({
        To: input.to,
        From: from,
        Twiml: '<Response><Say>Connecting your Duncit call.</Say></Response>',
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, provider: 'twilio', provider_id: entry.id, message: json?.message || `Twilio call failed (HTTP ${res.status})` };
      }
      return {
        ok: true,
        provider: 'twilio',
        provider_id: entry.id,
        external_id: String(json?.sid ?? '') || null,
        recording_url: null,
        message: `Call initiated to ${input.to} via ${entry.name}`,
      };
    } catch (err: any) {
      return { ok: false, provider: 'twilio', provider_id: entry.id, message: err?.message || `${entry.name} call failed` };
    }
  },
};
