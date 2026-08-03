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

/** The message every DOB rejection returns, matching the clients word for word. */
export function dobMinAgeMessage(minAgeYears: number): string {
  return `You must be at least ${minAgeYears} years old to join Duncit`;
}

/** Midnight-normalised UTC day, or null when the input is not a real date. */
function toUtcDay(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number")
    date = new Date(value);
  else return null;
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
 * True when `dob` is a real date and the person is at least `minAgeYears`.
 * An unparseable or future date is NOT eligible; callers that treat an empty
 * value as "unchanged" must check that before calling.
 */
export function isEligibleDob(
  dob: unknown,
  minAgeYears: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  asOf?: Date,
): boolean {
  const age = ageInYears(dob, asOf);
  return age !== null && age >= minAgeYears;
}

/**
 * The API-side gate: throws unless `dob` clears the admin-configured minimum
 * age. Empty/absent is left to the caller's own required-ness rules (profile
 * updates treat it as "unchanged"), so only a SUPPLIED value is checked.
 *
 * The settings import is dynamic to keep this module dependency-free — settings
 * itself imports the constants above.
 */
export async function assertEligibleDob(
  dob: unknown,
  currentDob?: unknown,
): Promise<void> {
  if (dob === null || dob === undefined || dob === "") return;
  // An untouched stored date is grandfathered: raising the minimum age must not
  // lock an existing account out of its own profile form. Only a NEW value is
  // gated — the same rule the clients apply.
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
