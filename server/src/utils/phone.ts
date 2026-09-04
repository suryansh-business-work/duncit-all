/**
 * What a phone number looks like, in one place.
 *
 * Checkout already enforced these two shapes and the door is about to enforce
 * the same ones on a companion's number — a second copy is how the two drift
 * into accepting different things for the same field (rule 34).
 */

/** Subscriber number: digits only, no separators, no country code. */
export const PHONE_NUMBER_REGEX = /^\d{6,15}$/;

/** Country calling code, with or without the leading `+`. */
export const PHONE_EXTENSION_REGEX = /^\+?\d{1,5}$/;

/** Ten: the subscriber number everywhere this platform sells. Mirrors
 * `OTP_PHONE_MIN_DIGITS` in `@duncit/utils`, which the clients read. */
const KEY_DIGITS = 10;

/**
 * The comparable form of a phone number.
 *
 * Digits only and, past ten of them, only the last ten: the same phone reaches
 * a booking written `+91 98765 43210`, `919876543210` and `9876543210`, and a
 * check that reads those as three different people is not a check. Shorter
 * numbers are compared whole.
 *
 * Deliberately a copy of `@duncit/utils`' `phoneKey` rather than an import:
 * `server/src` imports zero `@duncit/*` packages by design (rule 40), and the
 * two only have to agree on what counts as the same number.
 */
export const phoneKey = (...parts: unknown[]): string => {
  const digits = (parts.map((part) => String(part ?? '')).join('').match(/\d+/g) ?? []).join('');
  return digits.length > KEY_DIGITS ? digits.slice(-KEY_DIGITS) : digits;
};
