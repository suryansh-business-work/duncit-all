import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_SCHEDULE_ZONE } from '@utils/cron-schedule';

/**
 * The account a run signs in and signs up as.
 *
 * A signup cannot reuse an address — the second run would hit "this email is
 * already registered" and fail for a reason that has nothing to do with the
 * app. So the signup identity carries a stamp that is unique to the run, while
 * the login identity stays put, because you cannot sign IN to an account that
 * was invented a second ago.
 *
 * The stamp is `ddMMyyyyHHmm` in the platform's own timezone rather than UTC,
 * for the same reason the schedules are: it is read by a person, at the hour
 * they think it is, when they go looking for the account a run left behind.
 */

/** The dynamic half of an identity: `070920260300` for 07 Sep 2026, 03:00. */
export function identityStamp(at: Date, zone: string = DEFAULT_SCHEDULE_ZONE): string {
  return formatInTimeZone(at, zone, 'ddMMyyyyHHmm');
}

export interface E2eIdentitySeed {
  /**
   * The operator's own input — `suryansh`. A prefix ending in `+` gives Gmail
   * plus-addressing for free (`suryansh+070920260300@gmail.com`), which is how
   * to keep every signup landing in one real inbox.
   */
  email_prefix: string;
  email_domain: string;
  password: string;
  identity_phone: string;
}

export interface E2eIdentity {
  stamp: string;
  /** The account the suite signs IN as. The same address on every run. */
  login_email: string;
  /** The account the suite signs UP as. Unique to this run. */
  signup_email: string;
  password: string;
  phone: string;
}

const clean = (value: string | null | undefined): string => String(value ?? '').trim();

/**
 * The identity for one run, or null when no seed has been configured.
 *
 * Null rather than a thrown error: a run with no credentials is perfectly
 * legal — every suite in this repo stubs its GraphQL and none of them signs in
 * — so an unconfigured identity must not stop the suite from running. It only
 * means the run reports no account.
 */
export function buildIdentity(seed: E2eIdentitySeed, at: Date): E2eIdentity | null {
  const prefix = clean(seed.email_prefix);
  const domain = clean(seed.email_domain).replace(/^@/, '');
  if (!prefix || !domain) return null;
  const stamp = identityStamp(at);
  // The prefix carries its own separator when it wants one, so there is no
  // second setting for a character.
  const loginLocal = prefix.replace(/\+$/, '');
  return {
    stamp,
    login_email: `${loginLocal}@${domain}`,
    signup_email: `${prefix}${stamp}@${domain}`,
    password: clean(seed.password),
    phone: clean(seed.identity_phone),
  };
}
