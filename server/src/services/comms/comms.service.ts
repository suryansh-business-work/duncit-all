import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import type { EnvCategory } from '@modules/platform/envEntry/envEntry.model';
import { sendHtmlEmail } from '@services/email/email.service';

/**
 * Outbound lead communications. Email goes through the same provider layer as
 * every other email in the product (`services/email/email.provider.ts`), so an
 * admin who switches the active mailbox switches this too; calls go through
 * the TWILIO entry. The selected entry (provider_id) is used when active, else
 * the default. Credentials are owned by the Tech portal's Environment
 * Variables — there is no `.env` fallback.
 *
 * This file used to build its own nodemailer transport beside the transactional
 * service's. Two copies meant a fix to one was a fix to only one.
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
  const v = config[key] as string | number | boolean | undefined;
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
  /** Send a lead email through the selected/default email entry. */
  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    provider_id?: string | null;
    /** Optional file attachments addressed by URL (e.g. ImageKit links). */
    attachments?: { url: string; name?: string | null }[] | null;
  }): Promise<CommsResult> {
    // Through the ONE send method, with the mailbox the user picked. This used
    // to call `provider.send()` directly, which skipped the shared logo swap,
    // the from-address fallback, the audit log line and — once it existed — the
    // email log. `provider_id` is what made that shortcut look necessary.
    //
    // The entry is NOT resolved here first. It was, purely to name it in the
    // result a lead row stores — a second read of the same document for a
    // string the send already knows and now hands back.
    const attachments = (input.attachments ?? [])
      .filter((a) => a?.url)
      .map((a) => ({ filename: a.name || a.url.split('/').pop() || 'attachment', path: a.url }));

    const info = await sendHtmlEmail({
      to: input.to,
      subject: input.subject,
      html: input.body,
      // A lead email is a person writing to a person, not a system notice.
      category: 'service',
      provider_id: input.provider_id,
      attachments: attachments.length ? attachments : undefined,
      source: 'CRM',
      source_detail: input.provider_id ?? '',
    });

    // sendHtmlEmail reports rather than throws, so a refusal has to be read
    // off the result or a lead row would show a green tick for a send that
    // never happened.
    if (info.skipped) {
      return {
        ok: false,
        provider: info.provider,
        provider_id: info.entryId ?? null,
        message: `${info.entryName || 'Email'} could not send to ${input.to} — see Emails > Logs`,
      };
    }
    return {
      ok: true,
      provider: info.provider,
      provider_id: info.entryId ?? null,
      external_id: info.messageId || null,
      message: `Email sent to ${input.to} via ${info.entryName || info.provider}`,
    };
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
