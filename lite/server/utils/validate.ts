import { badInput } from './errors';

/** The same shapes `@duncit/regex` ships to the clients, kept here because the server bundle owns its own copy. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const UPI_ID = /^[\w.-]{2,256}@[a-z][a-z0-9]{1,63}$/i;
export const HANDLE = /^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$/;
export const OTP_6 = /^\d{6}$/;
export const IANA_ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$|^UTC$/;

export function normalizeEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) throw badInput('Enter a valid email address');
  return email;
}

export function cleanText(value: unknown, max: number, label: string, required = false): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw badInput(`${label} is required`);
  if (text.length > max) throw badInput(`${label} must be ${max} characters or fewer`);
  return text;
}

export function optionalUrl(value: unknown, label: string): string {
  const text = cleanText(value, 2048, label);
  if (!text) return '';
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol');
  } catch {
    throw badInput(`${label} must be a full http(s) link`);
  }
  return text;
}

export function optionalUpi(value: unknown): string {
  const text = cleanText(value, 256, 'UPI ID');
  if (text && !UPI_ID.test(text)) throw badInput('Enter a valid UPI ID, like name@bank');
  return text.toLowerCase();
}

export function parseInstant(value: unknown, label: string): Date {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) throw badInput(`${label} is not a valid date and time`);
  return date;
}

export function validTimezone(value: unknown): string {
  const zone = typeof value === 'string' ? value.trim() : '';
  if (!zone || !IANA_ZONE.test(zone)) throw badInput('Pick a valid time zone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    throw badInput('Pick a valid time zone');
  }
  return zone;
}

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}
