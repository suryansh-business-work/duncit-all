import { EMAIL, OTP_6, PHONE_INTL, PHONE_NUMBER_IN, SOCIAL_HANDLE, UNDERSCORE_HANDLE, UPI_ID, URL_SLUG, toDigits } from '@duncit/regex';
import { badInput } from './errors';

/** A Lite handle: 3-30 lowercase letters, digits and inner underscores. */
export { OTP_6, SOCIAL_HANDLE, UPI_ID, URL_SLUG, UNDERSCORE_HANDLE as HANDLE };

/** India's calling code, the one country whose national numbers Lite checks in full. */
const INDIA = '91';

/**
 * A phone number as E.164 (`+919876543210`). A number typed with `+` carries
 * its own country code; one without gets `defaultCountryCode`. Indian numbers
 * must also be a real 10-digit mobile number, since every SMS code goes there.
 */
export function normalizePhone(value: unknown, defaultCountryCode: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const international = raw.startsWith('+');
  const digits = toDigits(raw);
  const full = international ? digits : `${toDigits(defaultCountryCode)}${digits.replace(/^0+/, '')}`;
  if (!PHONE_INTL.test(full) || full.length < 8) throw badInput('Enter a valid phone number');
  // Calling codes are prefix-free, so a number starting 91 is always Indian.
  if (full.startsWith(INDIA) && !PHONE_NUMBER_IN.test(full.slice(INDIA.length))) throw badInput('Enter a valid Indian mobile number');
  return `+${full}`;
}

/** A map coordinate inside its range, or a BAD_USER_INPUT. */
export function coordinate(value: unknown, label: 'Latitude' | 'Longitude'): number {
  const limit = label === 'Latitude' ? 90 : 180;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) throw badInput(`${label} must be between -${limit} and ${limit}`);
  return value;
}

/**
 * Email is `@duncit/regex`'s own pattern — the copy that lived here let two
 * quantifiers claim the same dots and backtracked quadratically (Sonar S5852).
 * The zone shape below has no counterpart there; the rest come from it.
 */
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

export interface WholeNumberRange {
  min: number;
  max: number;
}

/**
 * A whole number inside [min, max], or a BAD_USER_INPUT that names the field.
 * Never a silent clamp: a negative price or a capacity of 0 is the host's
 * mistake to hear about, not something to quietly turn into another number.
 */
export function wholeNumber(value: unknown, label: string, { min, max }: WholeNumberRange): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw badInput(`${label} must be a whole number`);
  if (value < min) throw badInput(min === 0 ? `${label} cannot be negative` : `${label} must be at least ${min}`);
  if (value > max) throw badInput(`${label} cannot be more than ${max}`);
  return value;
}

/** `wholeNumber`, with null / undefined meaning "no limit". */
export function optionalWholeNumber(value: unknown, label: string, range: WholeNumberRange): number | null {
  return value == null ? null : wholeNumber(value, label, range);
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
