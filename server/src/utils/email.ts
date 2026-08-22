/**
 * The one email-address shape the API accepts.
 *
 * This mirrors `@duncit/regex`'s `EMAIL` deliberately: `server/src` imports no
 * `@duncit/*` package by design (the Docker image ships the server alone), so
 * the pattern is duplicated here rather than shared. Keep the two in step.
 *
 * The pattern is written so no two quantifiers can match the same character:
 * `[^\s@]+` stops at the `@`, and `[^\s@.]+` stops at the `.`, so each part of
 * the address has exactly one possible split. The obvious `\S+@\S+\.\S+`
 * spelling does NOT have that property — `\S+` and `\S+\.\S+` overlap, so an
 * address that never matches (a long run of non-space with no dot) makes the
 * engine retry every split and costs quadratic time. Addresses arrive from
 * unauthenticated callers, so that is a denial-of-service seam, not a style
 * nit.
 */
export const EMAIL_ADDRESS = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** RFC 5321's cap on a forward path — anything longer only bounces. */
export const MAX_EMAIL_LENGTH = 254;

/** True when `value` is a plausible, deliverable-looking address. */
export const isEmailAddress = (value: string): boolean =>
  value.length <= MAX_EMAIL_LENGTH && EMAIL_ADDRESS.test(value);
