import { isEmailAddress } from '@utils/email';

/**
 * The keys two leads are the same lead by. A phone is its last ten digits,
 * an email its lowercase form, a website its host, an Instagram handle its
 * lowercase name — so "+91 98765 43210" and "9876543210", or
 * "https://www.cafe.in/" and "cafe.in", meet the same row.
 *
 * `server/src` imports no `@duncit/*` package by design (the image ships the
 * server alone), so the phone rule mirrors `@duncit/regex`'s PHONE_INTL —
 * six to fifteen digits — rather than importing it. Keep the two in step.
 */
const PHONE_DIGITS = { min: 6, max: 15 } as const;
const KEY_DIGITS = 10;
const HANDLE = /^[a-z0-9._]{1,30}$/;

const unique = (values: readonly string[]): string[] => [...new Set(values.filter(Boolean))];

/** Digits only; '' when the number is not one. */
export function phoneDigits(raw: string): string {
  const digits = raw.replaceAll(/\D/g, '');
  return digits.length >= PHONE_DIGITS.min && digits.length <= PHONE_DIGITS.max ? digits : '';
}

export const isPhone = (raw: string): boolean => phoneDigits(raw) !== '';

/** The last ten digits — the part that survives a dial code or a trunk zero. */
export const phoneKey = (raw: string): string => phoneDigits(raw).slice(-KEY_DIGITS);

export const emailKey = (raw: string): string => {
  const email = raw.trim().toLowerCase();
  return isEmailAddress(email) ? email : '';
};

/** The host of a website, without `www.`; '' when the text is not an address. */
export function websiteHost(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

/** The handle as Instagram spells it: lowercase, no `@`, no URL around it. */
export function handleKey(raw: string): string {
  const text = raw.trim().toLowerCase();
  const fromUrl = /instagram\.com\/([a-z0-9._]{1,30})/.exec(text)?.[1];
  const handle = (fromUrl ?? text).replace(/^@/, '').replace(/\/$/, '');
  return HANDLE.test(handle) ? handle : '';
}

export interface DedupeKeys {
  phone_keys: string[];
  email_keys: string[];
  website_host: string;
  instagram_handle: string;
}

/** Every key a lead's contacts give, deduplicated. */
export function dedupeKeys(input: {
  phones?: readonly string[] | null;
  emails?: readonly string[] | null;
  website?: string | null;
  instagram_handle?: string | null;
}): DedupeKeys {
  return {
    phone_keys: unique((input.phones ?? []).map(phoneKey)),
    email_keys: unique((input.emails ?? []).map(emailKey)),
    website_host: websiteHost(input.website ?? ''),
    instagram_handle: handleKey(input.instagram_handle ?? ''),
  };
}

/** The Mongo `$or` that finds a lead sharing any key, or null when there is no key to match on. */
export function keyMatch(keys: DedupeKeys): Record<string, unknown> | null {
  const or: Record<string, unknown>[] = [];
  if (keys.phone_keys.length > 0) or.push({ phone_keys: { $in: keys.phone_keys } });
  if (keys.email_keys.length > 0) or.push({ email_keys: { $in: keys.email_keys } });
  if (keys.website_host) or.push({ website_host: keys.website_host });
  if (keys.instagram_handle) or.push({ instagram_handle: keys.instagram_handle });
  return or.length === 0 ? null : { $or: or };
}
