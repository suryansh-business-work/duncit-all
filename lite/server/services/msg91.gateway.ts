import { envEntryService, readString, type EnvConfig } from './envEntry.service';

/**
 * MSG91's OTP widget — Lite's SMS carrier for "Use phone number", and the only
 * file in Lite that knows MSG91's URLs and field names.
 *
 * MSG91 makes, sends and checks the code itself: `sendOtp` answers with a
 * request id, and that id plus what the person typed is what `verifyOtp` is
 * asked about. Lite never sees an SMS code.
 *
 * Every call reports MSG91's verdict as a value. MSG91 answers HTTP 200 with
 * `type: "error"` for a refusal, so `res.ok` alone would report a refusal as a
 * send; only a wire failure throws.
 */
const WIDGET_BASE_URL = 'https://api.msg91.com/api/v5/widget';
const REPORT_BASE_URL = 'https://control.msg91.com/api/v5/report';
const TIMEOUT_MS = 12_000;

export interface Msg91Credentials {
  widget_id: string;
  auth_key: string;
  /** Digits only, e.g. "91"; prefixed to a number typed without one. */
  default_country_code: string;
}

export interface Msg91Answer {
  ok: boolean;
  /** The request id (sendOtp) on success; MSG91's reason on failure. */
  message: string;
}

export function msg91CredentialsFrom(config: EnvConfig | null): Msg91Credentials | null {
  const widget_id = readString(config, 'widget_id');
  const auth_key = readString(config, 'auth_key');
  if (!widget_id || !auth_key) return null;
  return { widget_id, auth_key, default_country_code: readString(config, 'default_country_code') || '91' };
}

/** The active MSG91 entry, or null when phone sign-in has no carrier. */
export async function activeMsg91(): Promise<Msg91Credentials | null> {
  return msg91CredentialsFrom(await envEntryService.activeConfig('MSG91'));
}

const reasonOf = (body: Record<string, unknown>, status: number): string => String(body.message ?? body.error ?? `HTTP ${status}`);

async function readBody(res: Response): Promise<Record<string, unknown>> {
  // A gateway error page is HTML, not JSON; the status still has to survive.
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function widgetCall(creds: Msg91Credentials, path: string, payload: Record<string, unknown>): Promise<Msg91Answer> {
  const res = await fetch(`${WIDGET_BASE_URL}/${path}`, {
    method: 'POST',
    headers: { authkey: creds.auth_key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ widgetId: creds.widget_id, ...payload }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readBody(res);
  const ok = body.type === 'success';
  return { ok, message: ok ? String(body.message ?? '') : reasonOf(body, res.status) };
}

/** Send a code to `identifier` (country code + number, digits only). */
export const msg91SendOtp = (creds: Msg91Credentials, identifier: string) => widgetCall(creds, 'sendOtp', { identifier });

/** Ask MSG91 whether `otp` is the code it sent for `reqId`. */
export const msg91VerifyOtp = (creds: Msg91Credentials, reqId: string, otp: string) => widgetCall(creds, 'verifyOtp', { reqId, otp });

/**
 * Prove the auth key without sending an SMS: read today's widget analytics.
 * The widget id itself is only proven by a real send.
 */
export async function msg91Probe(creds: Msg91Credentials): Promise<{ ok: boolean; message: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const query = new URLSearchParams({ startDate: today, endDate: today });
  try {
    const res = await fetch(`${REPORT_BASE_URL}/analytics/p/widget?${query.toString()}`, {
      headers: { Authkey: creds.auth_key, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await readBody(res);
    if (!res.ok || body.error || body.status === 'fail') return { ok: false, message: `MSG91 refused the auth key: ${reasonOf(body, res.status)}` };
    return { ok: true, message: 'MSG91 accepted this auth key. The widget id is proven by the first real sign-in code.' };
  } catch (error) {
    return { ok: false, message: `MSG91 could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
}
