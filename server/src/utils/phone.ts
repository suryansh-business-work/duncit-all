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

/** Country code + subscriber, digits only: E.164's 8–15 digits, never a leading zero. */
const E164_DIGITS = /^[1-9]\d{7,14}$/;

/** India's calling code. Calling codes are prefix-free, so every number that
 * opens on it is an Indian number. */
const INDIA_CALLING_CODE = '91';

/** India's mobile plan: the code, then ten digits opening on 6–9. WhatsApp
 * lives on mobile numbers, so anything else under +91 cannot receive one. */
const INDIA_MOBILE = /^91[6-9]\d{9}$/;

/**
 * Whether a destination (country code + number, digits only) can receive a
 * WhatsApp message at all.
 *
 * Asked before AiSensy is called: a short or mistyped number comes back as
 * `Invalid Number (HTTP 400)` only after a round trip, and on a one-time code
 * the person reads that vendor sentence instead of "check your number".
 */
export function isWhatsappDestination(destination: string): boolean {
  if (!E164_DIGITS.test(destination)) return false;
  return !destination.startsWith(INDIA_CALLING_CODE) || INDIA_MOBILE.test(destination);
}

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
