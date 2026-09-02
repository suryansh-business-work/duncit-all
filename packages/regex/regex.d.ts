// @duncit/regex — shared regex patterns + validators. Keep in sync with regex.mjs/regex.cjs.

/** Exactly 10 digits — an Indian mobile number WITHOUT the country/dial code. */
export const PHONE_NUMBER: RegExp;
/** Stricter Indian mobile: 10 digits starting 6–9. */
export const PHONE_NUMBER_IN: RegExp;
/** Country/dial code such as `+91` (optional `+`, 1–4 digits). */
export const DIAL_CODE: RegExp;
/** Indian 6-digit PIN code (first digit 1–9). */
export const PINCODE: RegExp;
/** 6-digit numeric OTP. */
export const OTP_6: RegExp;
/** Pragmatic email pattern (no spaces, one `@`, a dotted domain). */
export const EMAIL: RegExp;
/** One or more digits, nothing else. */
export const DIGITS: RegExp;

/**
 * Keep only the digits in a string.
 *
 * The rule behind every number-only box: a phone field is typed into, pasted
 * into and autofilled, and the last two are how letters get in. Applied on
 * change, it makes "digits only" a property of the input rather than a message
 * shown after the fact.
 */
export function toDigits(value: unknown): string;

/** Phone digits only, 6–15 long — the ITU E.164 range without a dial code. */
export const PHONE_INTL: RegExp;
/** {@link PHONE_INTL} tolerating a leading `+` for a pasted full number. */
export const PHONE_INTL_PLUS: RegExp;
/** Postal code, 4–10 digits — non-Indian addresses included. */
export const PINCODE_LOOSE: RegExp;

/** Indian bank IFSC: 4 letters, a literal `0`, then 6 alphanumerics. */
export const IFSC: RegExp;
/** UPI VPA such as `name@bank`. */
export const UPI_ID: RegExp;
/** Bank account number: 6–18 digits. */
export const BANK_ACCOUNT_NUMBER: RegExp;
/**
 * GSTIN — 15 characters, with the literal `Z` in position 14. The only correct
 * pattern; mWeb checkout's 14-character variant rejects every valid GSTIN.
 */
export const GSTIN: RegExp;
/**
 * A human name: letters, spaces, apostrophes (straight or typographic) and
 * periods, starting with a letter. Rejects digits, underscores and emoji.
 */
export const PERSON_NAME: RegExp;
/** A Duncit referral code — `DUN-` and six uppercase hex characters. */
export const REFERRAL_CODE: RegExp;

export function isPhoneNumber(value: string): boolean;
export function isPincode(value: string): boolean;
export function isEmail(value: string): boolean;
export function isOtp(value: string): boolean;
export function isPhoneIntl(value: string): boolean;
export function isPincodeLoose(value: string): boolean;
export function isIfsc(value: string): boolean;
export function isUpiId(value: string): boolean;
export function isBankAccountNumber(value: string): boolean;
/** Strict GSTIN check — see the {@link GSTIN} note before using it at checkout. */
export function isGstin(value: string): boolean;
/** Person-name shape check — letters, spaces, apostrophes and periods only. */
export function isPersonName(value: string): boolean;
/** Referral-code shape check. Case-sensitive: upper-case before calling it. */
export function isReferralCode(value: string): boolean;
/**
 * A Duncit @handle: lowercase letters, digits and single hyphens, 3–30
 * characters, starting and ending on an alphanumeric. It goes into
 * `duncit.com/u/<username>`, so anything needing percent-encoding is rejected.
 */
export const USERNAME: RegExp;
/** Handle shape check. Lower-case before calling it — the pattern is strict. */
export function isUsername(value: string): boolean;

/**
 * A four-digit birth YEAR — what a year-only date of birth is typed as.
 *
 * Deliberately just the shape: whether the year makes somebody old enough is a
 * calendar question, and it belongs to @duncit/datetime's
 * `isEligibleBirthYear` alongside every other age rule. This pattern only says
 * "four digits", so `20`, `1 999` and `two thousand` never reach that check.
 */
export const BIRTH_YEAR: RegExp;

/** Birth-year shape check — four digits, nothing else. */
export function isBirthYear(value: string): boolean;
