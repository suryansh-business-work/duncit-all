import { extractDocumentText } from '../../media/intelMedia.extract';
import type { ResolvedEntry } from '../intel.credentials';
import type { ConnectorDriver, SyncContext, TestResult } from '../intel.driver';
import { fetchJson, htmlToText, ProviderError } from '../intel.http';

/**
 * Gmail: an OAuth client + refresh token from the chosen Tech portal GMAIL
 * entry (gmail.readonly scope). One document per thread — subject, people and
 * every message body — with PDF/text attachments optionally appended.
 * Incremental runs ask Gmail only for threads after the last run.
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const ATTACHMENT_TYPES = new Set(['application/pdf', 'text/plain', 'text/csv', 'text/markdown']);
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface Part {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: Part[];
}

interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: Part;
}

export async function accessToken(entry: ResolvedEntry): Promise<string> {
  const { client_id, client_secret, refresh_token } = entry.config;
  if (!client_id || !client_secret || !refresh_token) throw new ProviderError(`The Tech portal entry "${entry.name}" needs a client id, client secret and refresh token.`, 0);
  const body = new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' });
  const res = await fetchJson<{ access_token?: string }>('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.access_token) throw new ProviderError('Google did not issue an access token', 401);
  return res.access_token;
}

const decode = (data?: string) => (data ? Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64') : Buffer.alloc(0));
const header = (part: Part | undefined, name: string) => part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

function flatten(part: Part | undefined, out: Part[] = []): Part[] {
  if (!part) return out;
  out.push(part);
  for (const child of part.parts ?? []) flatten(child, out);
  return out;
}

function bodyText(parts: Part[]): string {
  const plain = parts.find((p) => p.mimeType === 'text/plain' && !p.filename && p.body?.data);
  if (plain) return decode(plain.body?.data).toString('utf8');
  const html = parts.find((p) => p.mimeType === 'text/html' && !p.filename && p.body?.data);
  return html ? htmlToText(decode(html.body?.data).toString('utf8')) : '';
}

async function attachmentsText(messageId: string, parts: Part[], token: string): Promise<string[]> {
  const out: string[] = [];
  for (const p of parts) {
    if (!p.filename || !p.body?.attachmentId || !ATTACHMENT_TYPES.has(p.mimeType ?? '') || (p.body.size ?? 0) > MAX_ATTACHMENT_BYTES) continue;
    const att = await fetchJson<{ data?: string }>(`${API}/messages/${messageId}/attachments/${p.body.attachmentId}`, { headers: { Authorization: `Bearer ${token}` } });
    const extracted = await extractDocumentText(decode(att.data), p.mimeType ?? '', { ocr: false });
    out.push(`[attachment: ${p.filename}]\n${extracted.pages.map((pg) => pg.text).join('\n').slice(0, 20_000)}`);
  }
  return out;
}

export const gmailDriver: ConnectorDriver = {
  async test(_connector, entry): Promise<TestResult> {
    try {
      const token = await accessToken(entry);
      const profile = await fetchJson<{ emailAddress?: string; threadsTotal?: number }>(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      return { ok: true, message: `Connected to ${profile.emailAddress ?? 'the mailbox'}.`, details: [`${profile.threadsTotal ?? 0} thread(s) in the mailbox`] };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed', details: [] };
    }
  },

  async sync(ctx: SyncContext) {
    const token = await accessToken(ctx.entry);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const cfg = ctx.connector.config as { query?: string; max_threads?: number; include_attachments?: boolean; history_days?: number };
    const startedAt = Math.floor(Date.now() / 1000);
    const after = ctx.mode === 'INCREMENTAL' && typeof ctx.cursor.after === 'number' ? ctx.cursor.after : startedAt - (cfg.history_days ?? 90) * 86_400;
    const q = `${cfg.query ?? 'in:inbox'} after:${after}`.trim();
    let pageToken = '';
    let read = 0;
    do {
      const params = new URLSearchParams({ q, maxResults: '100', ...(pageToken ? { pageToken } : {}) });
      const page = await fetchJson<{ threads?: Array<{ id: string }>; nextPageToken?: string }>(`${API}/threads?${params}`, auth);
      for (const { id } of page.threads ?? []) {
        if (read >= (cfg.max_threads ?? 500)) break;
        read += 1;
        const thread = await fetchJson<{ messages?: GmailMessage[] }>(`${API}/threads/${id}?format=full`, auth);
        const messages = thread.messages ?? [];
        const first = messages[0]?.payload;
        const blocks: string[] = [];
        for (const m of messages) {
          const parts = flatten(m.payload);
          blocks.push(`From: ${header(m.payload, 'From')}\nTo: ${header(m.payload, 'To')}\nDate: ${header(m.payload, 'Date')}\n\n${bodyText(parts)}`);
          if (cfg.include_attachments) blocks.push(...(await attachmentsText(m.id, parts, token)));
        }
        const lastDate = Number(messages.at(-1)?.internalDate ?? Date.now());
        const ok = await ctx.emit({
          external_id: id,
          title: header(first, 'Subject') || '(no subject)',
          url: `https://mail.google.com/mail/u/0/#all/${id}`,
          text: blocks.join('\n\n---\n\n'),
          metadata: { from: header(first, 'From'), messages: messages.length },
          updated_at: new Date(lastDate),
        });
        if (!ok) return;
      }
      pageToken = page.nextPageToken ?? '';
    } while (pageToken && read < (cfg.max_threads ?? 500));
    ctx.cursor.after = startedAt - 3600;
    ctx.log(`${read} thread(s) read for "${q}"`);
  },
};
