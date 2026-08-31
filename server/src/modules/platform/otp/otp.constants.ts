/**
 * The numbers that describe a one-time code's life.
 *
 * Held apart from `otp.service` so the delivery seam can tell a recipient how
 * long their code lasts without importing the service that calls it — the
 * mailer's copy says "expires in 10 minutes", and a second literal there is how
 * the message and the rule drift apart.
 */

/** How long a code stays usable, in minutes. */
export const OTP_TTL_MINUTES = 10;

/** The same, in milliseconds — what the challenge's expiry is stamped from. */
export const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;

/** Wrong guesses allowed before the challenge is burnt. */
export const OTP_MAX_ATTEMPTS = 5;

/** Seconds between two sends on the same challenge. */
export const OTP_RESEND_COOLDOWN_SEC = 30;
