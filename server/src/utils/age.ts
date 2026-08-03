/**
 * Age eligibility — the server-side half of the platform's minimum-age rule.
 *
 * This mirrors `@duncit/datetime`'s age helpers deliberately: `server/src`
 * imports no `@duncit/*` package by design (the Docker image ships the server
 * alone), so the rule is duplicated here rather than shared. Keep the two in
 * step — the clients gate the input, this gates the API, and a client can
 * always be bypassed.
 *
 * The threshold is admin-configured (`AppSettings.min_signup_age`); the
 * constant below is only the fallback used before/without that setting.
 *
 * The comparison is calendar-based, never a millisecond division: a year is not
 * a fixed number of days, so `(now - dob) / 31536000000` drifts across leap
 * years and would admit an under-age user on the wrong side of their birthday.
 */

/** Minimum joining age used when the setting is unavailable. */
export const DEFAULT_MIN_ACCOUNT_AGE_YEARS = 18;

/** Upper bound for the configurable age, so a typo cannot lock everyone out. */
export const MAX_ACCOUNT_AGE_YEARS = 120;

/**
 * The clients evaluate "today" in the DEVICE's timezone — that is the date the
 * person actually lives in. The server has no way to know that zone, so it
 * measures against the furthest-ahead one (UTC+14). Without this an IST user
 * whose 18th birthday is today passed the form and was rejected by the API
 * until 05:30, with no way to fix it.
 *
 * The cost is bounded and one-directional: someone can be at most one day short
 * of the minimum, and only if they are already 18 somewhere on Earth.
 */
const MAX_TZ_AHEAD_MS = 14 * 60 * 60 * 1000;

/** The message every DOB rejection returns, matching the clients word for word. */
export function dobMinAgeMessage(minAgeYears: number): string {
  return `You must be at least ${minAgeYears} years old to join Duncit`;
}

/** Strict ISO date (YYYY-MM-DD) or ISO instant — nothing else. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

/** Midnight-normalised UTC day, or null when the input is not a real date. */
function toUtcDay(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "number") date = new Date(value);
  else if (typeof value === "string") {
    // The bare Date constructor rolls impossible days forward (2008-02-30 ->
    // Mar 1) and parses non-ISO strings in the PROCESS timezone, so a container
    // not running as UTC would shift the day. Accept ISO only, then verify the
    // parse round-trips to the same calendar day.
    if (!ISO_DATE.test(value)) return null;
    date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const [y, m, d] = value.slice(0, 10).split("-").map(Number);
      if (
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() + 1 !== m ||
        date.getUTCDate() !== d
      ) {
        return null;
      }
    }
  } else return null;
  if (Number.isNaN(date.getTime())) return null;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Completed years between `dob` and `asOf` (default: now), or null when `dob`
 * cannot be parsed. A birthday that has not come round yet does not count.
 */
export function ageInYears(dob: unknown, asOf?: Date): number | null {
  const born = toUtcDay(dob);
  if (!born) return null;
  const today = toUtcDay(asOf ?? new Date())!;
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() &&
      today.getUTCDate() >= born.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * True when `dob` is a real date and the person is at least `minAgeYears`
 * somewhere on Earth. An unparseable or future date is NOT eligible; callers
 * that treat an empty value as "unchanged" must check that before calling.
 */
export function isEligibleDob(
  dob: unknown,
  minAgeYears: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  asOf?: Date,
): boolean {
  const reference = new Date((asOf ?? new Date()).getTime() + MAX_TZ_AHEAD_MS);
  const age = ageInYears(dob, reference);
  return age !== null && age >= minAgeYears;
}

/**
 * The API-side gate: throws unless `dob` clears the admin-configured minimum
 * age. Empty/absent is left to the caller's own required-ness rules (profile
 * updates treat it as "unchanged"), so only a SUPPLIED value is checked.
 *
 * Passing `currentDob` grandfathers a date already on file: raising the minimum
 * age must not lock an existing account out of its own profile form. Only a NEW
 * value is gated — the same rule the clients apply.
 *
 * The settings import is dynamic to keep this module dependency-free — settings
 * itself imports the constants above.
 */
export async function assertEligibleDob(
  dob: unknown,
  currentDob?: unknown,
): Promise<void> {
  if (dob === null || dob === undefined || dob === "") return;
  const currentTime = toUtcDay(currentDob)?.getTime();
  if (currentTime !== undefined && toUtcDay(dob)?.getTime() === currentTime) {
    return;
  }
  const { GraphQLError } = await import("graphql");
  const { settingsService } = await import(
    "@modules/platform/settings/settings.service"
  );
  const minAge = await settingsService.getMinSignupAge();
  if (!isEligibleDob(dob, minAge)) {
    throw new GraphQLError(dobMinAgeMessage(minAge), {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}
