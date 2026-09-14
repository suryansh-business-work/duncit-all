import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { DEFAULT_SCHEDULE_ZONE } from '@utils/cron-schedule';

/**
 * The account a run lives its whole life as.
 *
 * A run signs UP first and then does everything else — sign in, recover the
 * password, edit the profile, delete — as that same account, so there is one
 * address per run. It carries a stamp unique to the run because a signup
 * cannot reuse an address, and the purge removes the account after each
 * surface is done with it, which is what frees the fixed phone number for the
 * next signup.
 *
 * The stamp is `ddMMyyyyHHmm` in the platform's own timezone rather than UTC,
 * for the same reason the schedules are: it is read by a person, at the hour
 * they think it is, when they go looking for the account a run left behind.
 */

const STAMP_FORMAT = 'ddMMyyyyHHmm';
const STAMP_RE = /^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})$/;

/** The dynamic half of an identity: `070920260300` for 07 Sep 2026, 03:00. */
export function identityStamp(at: Date, zone: string = DEFAULT_SCHEDULE_ZONE): string {
  return formatInTimeZone(at, zone, STAMP_FORMAT);
}

/** The moment a stamp names, or null when it is not a stamp. */
export function stampTime(stamp: string, zone: string = DEFAULT_SCHEDULE_ZONE): Date | null {
  const parts = STAMP_RE.exec(stamp);
  if (!parts) return null;
  const [, dd, mm, yyyy, hh, min] = parts;
  const at = fromZonedTime(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`, zone);
  return Number.isNaN(at.getTime()) ? null : at;
}

export interface E2eIdentitySeed {
  /**
   * The operator's own input — `suryansh`. A prefix ending in `+` gives Gmail
   * plus-addressing for free (`suryansh+070920260300@gmail.com`), which is how
   * to keep every run's mail landing in one real inbox.
   */
  email_prefix: string;
  email_domain: string;
  password: string;
  identity_phone: string;
}

export interface E2eIdentity {
  stamp: string;
  /**
   * The run account's address. `login_email` and `signup_email` are the same
   * address; both names stay because the run row and the runner read them.
   */
  login_email: string;
  signup_email: string;
  password: string;
  phone: string;
}

const clean = (value: string | null | undefined): string => String(value ?? '').trim();

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * The identity for one run, or null when no seed has been configured.
 *
 * Null rather than a thrown error: a run with no credentials is legal — the
 * packages sweep signs nobody in — so an unconfigured identity must not stop a
 * run. It only means the run reports no account.
 */
export function buildIdentity(seed: E2eIdentitySeed, at: Date): E2eIdentity | null {
  const prefix = clean(seed.email_prefix);
  const domain = clean(seed.email_domain).replace(/^@/, '');
  if (!prefix || !domain) return null;
  const stamp = identityStamp(at);
  const email = `${prefix}${stamp}@${domain}`;
  return {
    stamp,
    login_email: email,
    signup_email: email,
    password: clean(seed.password),
    phone: clean(seed.identity_phone),
  };
}

/** Which addresses and which number belong to e2e runs. */
export interface RunAccountMatcher {
  /** Any run's address: the prefix, a 12-digit stamp, an optional `-suffix`, the domain. */
  email: RegExp;
  /** The configured phone, digits only; empty when none is set. */
  phone: string;
}

/**
 * The run accounts a seed describes, across every run.
 *
 * Deliberately NOT the bare prefix: with `admin+` and `duncit.com` that would
 * also match `admin@duncit.com`, a real account. Only an address carrying a
 * stamp is a run's, and a scenario that changes the address keeps the stamp
 * (`admin+070920260300-new@duncit.com`).
 */
export function runAccountMatcher(seed: E2eIdentitySeed): RunAccountMatcher | null {
  const prefix = clean(seed.email_prefix);
  const domain = clean(seed.email_domain).replace(/^@/, '');
  if (!prefix || !domain) return null;
  return {
    email: new RegExp(String.raw`^${escapeRe(prefix)}\d{12}(?:-[a-z0-9-]{1,40})?@${escapeRe(domain)}$`, 'i'),
    phone: clean(seed.identity_phone).replaceAll(/\D/g, ''),
  };
}
