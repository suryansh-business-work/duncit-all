import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Normalize a phone number to E.164 so Twilio dials the right country — leads
 * are stored without a country code, which Twilio otherwise defaults to +1
 * (USA). The default dialling code is configurable (`DEFAULT_DIAL_CODE`,
 * default +91/India); an explicit `+`/`00` prefix on the number wins.
 */
export function toE164(raw: string, defaultDial = '+91'): string {
  const s0 = String(raw || '').trim();
  if (!s0) return '';
  if (s0.startsWith('+')) return '+' + s0.slice(1).replace(/\D/g, '');
  const digits = s0.replace(/\D/g, '');
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  const code = String(defaultDial).replace(/\D/g, '') || '91';
  // Already includes the country code (e.g. 919876543210)?
  if (digits.startsWith(code) && digits.length > 10) return '+' + digits;
  return '+' + code + digits;
}

/** Resolve the configured default dialling code (falls back to +91). */
export async function defaultDialCode(): Promise<string> {
  const v = (await getRuntimeEnvValue('DEFAULT_DIAL_CODE')).trim();
  return v || '+91';
}

/**
 * Basic sanity check for a dialable E.164 number — 8–15 digits and not a
 * placeholder like +00000000 / all-identical digits. Stops cryptic Twilio
 * "the number ... is not valid" errors for empty / test numbers.
 */
export function isValidPhone(e164: string): boolean {
  const d = String(e164 || '').replace(/\D/g, '');
  if (d.length < 8 || d.length > 15) return false;
  const significant = d.length > 10 ? d.slice(-10) : d;
  if (/^(\d)\1+$/.test(significant)) return false;
  return true;
}
