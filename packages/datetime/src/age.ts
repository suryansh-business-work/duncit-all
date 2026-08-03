import { parseISO } from 'date-fns';

import type { DateInput } from './format';

/**
 * Age eligibility — one rule for every surface (signup, profile, server).
 *
 * The threshold itself is admin-configured (Admin > Settings > Minimum age), so
 * every helper here takes it as an argument; the constant below is only the
 * fallback used before the setting has loaded.
 *
 * The check is a calendar comparison, never a millisecond division: a year is
 * not a fixed number of days, so `(now - dob) / 31536000000` drifts by a day
 * across leap years and would let an under-age user through on the wrong side
 * of their birthday. Comparing (year, month, day) triples is exact.
 *
 * "Today" is the DEVICE'S local day, because that is the date the person
 * actually lives in — someone whose birthday is today is 18 today, wherever
 * they are. The server cannot know that zone, so it allows one day of slack
 * (see server/src/utils/age.ts); without that, an IST user was accepted by this
 * form and rejected by the API until 05:30 every morning.
 */

/** Fallback minimum age, used until the admin setting resolves. */
export const DEFAULT_MIN_ACCOUNT_AGE_YEARS = 18;

/** Midnight-normalised local date, or null when the input is not a real date. */
function toDay(input: DateInput): Date | null {
  // An explicit emptiness check, not a falsy one: 0 is a valid epoch timestamp.
  if (input === null || input === undefined || input === '') return null;
  let date: Date | null = null;
  if (input instanceof Date) date = input;
  else if (typeof input === 'number') date = new Date(input);
  else date = parseISO(input);
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Completed years between `dob` and `asOf` (default: today). Returns null when
 * `dob` is unparseable. A birthday that has not yet come round this year does
 * not count, so this is the age a form should gate on.
 */
export function ageInYears(dob: DateInput, asOf?: DateInput): number | null {
  const born = toDay(dob);
  if (!born) return null;
  const today = toDay(asOf) ?? toDay(new Date())!;
  let age = today.getFullYear() - born.getFullYear();
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * The most recent birth date that is still old enough — i.e. the `maxDate` a
 * date picker should allow, so an ineligible day cannot be picked at all and
 * the validation message becomes the second line of defence rather than the
 * first.
 */
export function latestEligibleDob(
  minAgeYears: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  asOf?: DateInput,
): Date {
  const today = toDay(asOf) ?? toDay(new Date())!;
  const month = today.getMonth();
  const result = new Date(today.getFullYear() - minAgeYears, month, today.getDate());
  // Feb 29 overflows into Mar 1 when the target year is not a leap year, which
  // would offer a day the age check then rejects. Step back to Feb 28.
  if (result.getMonth() !== month) result.setDate(0);
  return result;
}

/**
 * True when `dob` is a real, non-future date and the person is at least
 * `minAgeYears` old on `asOf`. An unparseable or future date is NOT eligible —
 * callers that treat "empty" as "unchanged" must check that before calling.
 */
export function isEligibleDob(
  dob: DateInput,
  minAgeYears: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  asOf?: DateInput,
): boolean {
  const age = ageInYears(dob, asOf);
  return age !== null && age >= minAgeYears;
}

/** The shared validation message, so every surface says the same thing. */
export function dobMinAgeMessage(minAgeYears: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS): string {
  return `You must be at least ${minAgeYears} years old to join Duncit`;
}
