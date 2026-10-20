/**
 * One shape for "Truecaller says this person holds this number", whichever of
 * the three Truecaller doors (Android OAuth, iOS signed profile, mobile web)
 * it came through.
 *
 * Truecaller hands the number as country code + subscriber in one run of
 * digits, and the country as ISO alpha-2 ("IN"). Duncit stores the calling
 * code and the subscriber number apart, so the run is split on the calling
 * code the country actually uses — never guessed from the digits alone, since
 * "1…" and "91…" would both be plausible prefixes of many numbers.
 */
import { countries } from 'countries-list';
import { isEmailAddress } from '@utils/email';
import { normalizePhone } from '@modules/platform/otp/otp.service';
import { truecallerRejected } from './truecaller.config';

export interface TruecallerIdentity {
  phone_extension: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  /** '' unless Truecaller gave a well-formed address. Never treated as verified. */
  email: string;
}

export interface RawTruecallerProfile {
  phone: unknown;
  country: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function callingCodesOf(iso: string): string[] {
  const entry = Object.entries(countries).find(([code]) => code === iso)?.[1];
  // Longest first: a country with several codes must not match on a prefix
  // of a longer one.
  return (entry?.phone ?? []).map(String).sort((a, b) => b.length - a.length);
}

function splitNumber(phone: unknown, country: unknown) {
  const digits = String(phone ?? '').replaceAll(/\D/g, '');
  const iso = text(country).toUpperCase();
  const code = callingCodesOf(iso).find((c) => digits.startsWith(c));
  if (!code) throw truecallerRejected(`number does not match country ${iso || '(none)'}`);
  return normalizePhone(`+${code}`, digits.slice(code.length));
}

export function identityFrom(raw: Readonly<RawTruecallerProfile>): TruecallerIdentity {
  const email = text(raw.email).toLowerCase();
  return {
    ...splitNumber(raw.phone, raw.country),
    first_name: text(raw.firstName),
    last_name: text(raw.lastName),
    email: email && isEmailAddress(email) ? email : '',
  };
}
