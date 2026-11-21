import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { UserModel } from '@modules/access/user/user.model';
import { getWebhookBaseUrl } from './webhookBase';
import { toE164, isValidPhone } from './phone';

/** Twilio account credentials plus the base every webhook URL is built from. */
export interface TwilioCreds {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  baseUrl: string;
}

/** The Tech portal's TWILIO entry, or null while any of its three required keys is missing. */
export async function twilioCreds(): Promise<TwilioCreds | null> {
  const [accountSid, authToken, fromNumber] = await Promise.all([
    getRuntimeEnvValue('TWILIO_ACCOUNT_SID'),
    getRuntimeEnvValue('TWILIO_AUTH_TOKEN'),
    getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
  ]);
  if (!accountSid || !authToken || !fromNumber) return null;
  // Webhook base URL is derived internally from the server host, not env.
  const baseUrl = await getWebhookBaseUrl();
  return { accountSid, authToken, fromNumber, baseUrl };
}

/** Which of the three required TWILIO keys are still empty, by their Tech portal field name. */
export async function missingTwilioFields(): Promise<string[]> {
  const [sid, token, from] = await Promise.all([
    getRuntimeEnvValue('TWILIO_ACCOUNT_SID'),
    getRuntimeEnvValue('TWILIO_AUTH_TOKEN'),
    getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
  ]);
  const missing: string[] = [];
  if (!sid.trim()) missing.push('account_sid');
  if (!token.trim()) missing.push('auth_token');
  if (!from.trim()) missing.push('phone_number');
  return missing;
}

/** Twilio REST call with the account's basic auth. Never throws on a non-2xx answer. */
export async function twilioApi(
  creds: Pick<TwilioCreds, 'accountSid' | 'authToken'>,
  path: string,
  body?: URLSearchParams
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64'),
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

/** A switch on the TWILIO entry: only an explicit "false" turns it off, so unset keeps today's behaviour. */
const switchOn = (raw: string) => raw.trim().toLowerCase() !== 'false';

export interface CallMediaSettings {
  record: boolean;
  liveTranscription: boolean;
  language: string;
  /** Spoken to the lead first whenever the call is recorded or transcribed. */
  notice: string;
}

/** Spoken when the Tech portal leaves the recording notice empty. */
export const DEFAULT_RECORDING_NOTICE = 'This call may be recorded and transcribed for quality and training.';

export async function callMediaSettings(): Promise<CallMediaSettings> {
  const [record, live, language, notice] = await Promise.all([
    getRuntimeEnvValue('TWILIO_RECORD_CALLS'),
    getRuntimeEnvValue('TWILIO_LIVE_TRANSCRIPTION'),
    getRuntimeEnvValue('TWILIO_TRANSCRIPTION_LANGUAGE'),
    getRuntimeEnvValue('TWILIO_RECORDING_NOTICE'),
  ]);
  return {
    record: switchOn(record),
    liveTranscription: switchOn(live),
    language: language.trim() || 'en-IN',
    notice: notice.trim() || DEFAULT_RECORDING_NOTICE,
  };
}

export interface AgentNumber {
  number: string;
  source: 'CONFIG' | 'PROFILE';
}

/**
 * Agent leg for portal calls: the predefined number from the Twilio config
 * (`agent_phone_number` on the TWILIO entry) is used first; the logged-in
 * user's own profile phone is the fallback. Twilio rings this number and
 * bridges it to the customer so the agent talks to the lead.
 */
export async function resolveAgentNumber(userId: string): Promise<AgentNumber | null> {
  const candidates: AgentNumber[] = [];
  const configured = (await getRuntimeEnvValue('TWILIO_AGENT_PHONE_NUMBER')).trim();
  if (configured) candidates.push({ number: toE164(configured), source: 'CONFIG' });
  try {
    const u = await UserModel.findById(userId).lean<{ auth?: { phone?: { number?: string; extension?: string } } }>();
    const ph = u?.auth?.phone;
    if (ph?.number) candidates.push({ number: toE164(String(ph.number), String(ph.extension || '+91')), source: 'PROFILE' });
  } catch {
    /* no profile phone */
  }
  // First *valid* number wins, so a placeholder config (+00000000) doesn't block
  // a real profile number.
  return candidates.find((c) => isValidPhone(c.number)) ?? candidates[0] ?? null;
}
