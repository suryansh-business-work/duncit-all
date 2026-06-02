import nodemailer from 'nodemailer';
import { GraphQLError } from 'graphql';
import { EnvEntryModel, type EnvCategory } from './envEntry.model';
import type { EnvEntryConfig } from './envEntry.service';

export interface EnvTestRichResult {
  ok: boolean;
  message: string;
  url?: string | null;
  data?: string | null;
}

/** Load an entry's raw config (incl. secrets) or throw. */
async function rawConfig(id: string, expected: EnvCategory): Promise<EnvEntryConfig> {
  const doc = await EnvEntryModel.findById(id);
  if (!doc) throw new GraphQLError('Environment entry not found', { extensions: { code: 'NOT_FOUND' } });
  if (doc.category !== expected) {
    throw new GraphQLError(`Entry is not a ${expected} entry`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return (doc.config ?? {}) as EnvEntryConfig;
}

const str = (config: EnvEntryConfig, key: string) => (config[key] == null ? '' : String(config[key]));

async function touch(id: string) {
  await EnvEntryModel.updateOne({ _id: id }, { $set: { last_used_at: new Date() } });
}

/** Stamp the test outcome (green check / red) shown in the entries table. */
async function record(id: string, ok: boolean) {
  await EnvEntryModel.updateOne({ _id: id }, { $set: { last_tested_at: new Date(), last_test_ok: ok } });
}

/** Run a test fn and persist its pass/fail outcome before returning it. */
async function tracked(id: string, fn: () => Promise<EnvTestRichResult>): Promise<EnvTestRichResult> {
  const result = await fn();
  await record(id, result.ok);
  return result;
}

const impl = {
  /** Send a real email through the entry's SMTP config. */
  async email(id: string, to: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'EMAIL');
    const host = str(config, 'host');
    if (!host) return { ok: false, message: 'SMTP host is not configured' };
    if (!to.trim()) return { ok: false, message: 'Recipient is required' };
    const port = Number(str(config, 'port')) || 587;
    const user = str(config, 'user');
    const pass = str(config, 'password');
    const from = str(config, 'from_address') || user;
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465 || str(config, 'secure') === 'true',
        auth: user && pass ? { user, pass } : undefined,
      });
      const info = await transporter.sendMail({
        from: str(config, 'from_name') ? `${str(config, 'from_name')} <${from}>` : from,
        to: to.trim(),
        replyTo: str(config, 'reply_to') || undefined,
        subject: 'Duncit Tech — SMTP test email',
        html: '<p>This is a <strong>test email</strong> sent from the Duncit Tech portal to verify your SMTP entry.</p>',
      });
      await touch(id);
      return { ok: true, message: `Test email sent to ${to.trim()}`, data: String(info.messageId ?? '') };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Failed to send test email' };
    }
  },

  /** Upload a browser-supplied file to the entry's ImageKit and return the URL. */
  async imagekitUpload(id: string, fileBase64: string, fileName: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'IMAGEKIT');
    const privateKey = str(config, 'private_key');
    if (!privateKey) return { ok: false, message: 'ImageKit private key is not configured' };
    const raw = fileBase64.includes(',') ? fileBase64.split(',').pop() || '' : fileBase64;
    const bytes = Buffer.from(raw, 'base64');
    if (!bytes.length) return { ok: false, message: 'No file provided' };
    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(bytes)]), fileName || 'test-upload');
      form.append('fileName', fileName || `tech-test-${Date.now()}`);
      form.append('useUniqueFileName', 'true');
      form.append('folder', '/tech-tests');
      const auth = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: { Authorization: auth },
        body: form as any,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: `ImageKit upload failed: ${json?.message || res.statusText}` };
      await touch(id);
      return { ok: true, message: 'Uploaded to ImageKit', url: json.url };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'ImageKit upload failed' };
    }
  },

  /** Search Pexels with the entry's key; return up to 6 photo URLs as JSON. */
  async pexels(id: string, query: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'PEXELS');
    const apiKey = str(config, 'api_key');
    if (!apiKey) return { ok: false, message: 'Pexels API key is not configured' };
    try {
      const q = query.trim() || 'nature';
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=6`, {
        headers: { Authorization: apiKey },
      });
      if (!res.ok) return { ok: false, message: `Pexels rejected the request (HTTP ${res.status})` };
      const json: any = await res.json();
      const urls = (json?.photos ?? []).map((p: any) => p?.src?.medium).filter(Boolean);
      await touch(id);
      return { ok: true, message: `Loaded ${urls.length} photos for "${q}"`, data: JSON.stringify(urls) };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Pexels request failed' };
    }
  },

  /** Place a real Twilio call to `to` using the entry's credentials. */
  async twilioCall(id: string, to: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'TWILIO');
    const sid = str(config, 'account_sid');
    const token = str(config, 'auth_token');
    const from = str(config, 'phone_number');
    if (!sid || !token || !from) return { ok: false, message: 'Account SID, auth token and phone number are required' };
    if (!to.trim()) return { ok: false, message: 'Recipient number is required' };
    try {
      const body = new URLSearchParams({
        To: to.trim(),
        From: from,
        Twiml: '<Response><Say>This is a test call from the Duncit Tech portal.</Say></Response>',
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
      if (!res.ok) return { ok: false, message: json?.message || `Twilio call failed (HTTP ${res.status})` };
      await touch(id);
      return { ok: true, message: `Call placed to ${to.trim()}`, data: String(json?.sid ?? '') };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Twilio call failed' };
    }
  },

  /** Run a tiny prompt against an OpenAI entry's API key. */
  async openai(id: string, prompt: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'OPENAI');
    const apiKey = str(config, 'api_key');
    if (!apiKey) return { ok: false, message: 'API key is not configured' };
    const text = prompt.trim() || 'Say hello in one short sentence.';
    try {
      const base = (str(config, 'base_url') || 'https://api.openai.com/v1').replace(/\/$/, '');
      const model = str(config, 'model') || 'gpt-4o-mini';
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: text }], max_tokens: 64 }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: json?.error?.message || `OpenAI error (HTTP ${res.status})` };
      const reply = json?.choices?.[0]?.message?.content ?? '';
      await touch(id);
      return { ok: true, message: 'OpenAI responded', data: reply };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'OpenAI request failed' };
    }
  },

  /** Run a tiny prompt against a Gemini entry's API key. */
  async gemini(id: string, prompt: string): Promise<EnvTestRichResult> {
    const config = await rawConfig(id, 'GEMINI');
    const apiKey = str(config, 'api_key');
    if (!apiKey) return { ok: false, message: 'API key is not configured' };
    const text = prompt.trim() || 'Say hello in one short sentence.';
    try {
      const model = str(config, 'model') || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: json?.error?.message || `Gemini error (HTTP ${res.status})` };
      const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      await touch(id);
      return { ok: true, message: 'Gemini responded', data: reply };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Gemini request failed' };
    }
  },
};

/**
 * Public interface — every test records its pass/fail outcome on the entry
 * (last_tested_at + last_test_ok) so the table can show a green check.
 * `rawConfig` throwing (not-found / category mismatch) propagates unchanged.
 */
export const envEntryTests = {
  email: (id: string, to: string) => tracked(id, () => impl.email(id, to)),
  imagekitUpload: (id: string, fileBase64: string, fileName: string) =>
    tracked(id, () => impl.imagekitUpload(id, fileBase64, fileName)),
  pexels: (id: string, query: string) => tracked(id, () => impl.pexels(id, query)),
  twilioCall: (id: string, to: string) => tracked(id, () => impl.twilioCall(id, to)),
  openai: (id: string, prompt: string) => tracked(id, () => impl.openai(id, prompt)),
  gemini: (id: string, prompt: string) => tracked(id, () => impl.gemini(id, prompt)),
};
