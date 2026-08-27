import crypto from 'node:crypto';

/**
 * The primitives every EMAIL one-time code on a user document shares.
 *
 * Phone codes live in `otpService` (rule 41). The email codes — sign-in,
 * password reset, account deletion, verifying an address and changing one —
 * still keep a hash/expiry pair per purpose on the user document, and that is
 * known debt. What must NOT also be duplicated is the hash itself: a second
 * definition that salted differently would write codes the first one could
 * never match, and the mismatch would only show as "Invalid OTP" against a
 * code the person typed correctly.
 */

/** How long an emailed code stays usable. */
export const EMAIL_OTP_MINUTES = 10;

/** ISO-free helper: the instant a code issued now stops working. */
export const emailOtpExpiry = () => new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000);

/** A six-digit code, drawn from the same source everywhere. */
export const emailOtpCode = () => String(crypto.randomInt(100000, 1000000));

/**
 * Salted with the server's signing secret so a stolen database of hashes is
 * not a table of codes: without the secret the six digits cannot be walked.
 */
export const hashOtp = (otp: string) =>
  crypto.createHash('sha256').update(`${otp}:${process.env.JWT_SECRET || 'dev-secret'}`).digest('hex');

/**
 * The code echoed back to the caller outside production, so a developer with
 * no mail transport can still finish the flow. Null in production, always.
 */
export const devOtpEcho = (otp: string) =>
  (process.env.NODE_ENV || 'development') === 'production' ? null : otp;
