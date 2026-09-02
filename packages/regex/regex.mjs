// @duncit/regex — shared regex patterns + validators. Framework-agnostic.
// Keep this file in exact sync with regex.cjs and regex.d.ts.
// None of these patterns use the `g` flag, so `.test()` is safe to reuse.

/** Exactly 10 digits — an Indian mobile number WITHOUT the country/dial code. */
export const PHONE_NUMBER = /^\d{10}$/;
/** Stricter Indian mobile: 10 digits starting 6–9. */
export const PHONE_NUMBER_IN = /^[6-9]\d{9}$/;
/** Country/dial code such as `+91` (optional `+`, 1–4 digits). */
export const DIAL_CODE = /^\+?\d{1,4}$/;
/** Indian 6-digit PIN code (first digit 1–9). */
export const PINCODE = /^[1-9]\d{5}$/;
/** 6-digit numeric OTP. */
export const OTP_6 = /^\d{6}$/;
/** Pragmatic email pattern (no spaces, one `@`, a dotted domain). Domain labels
 * exclude `.` so the `\.` separator never overlaps a label — linear, no ReDoS. */
export const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
/** One or more digits, nothing else. */
export const DIGITS = /^\d+$/;

/*
  Everything that is NOT a digit — the complement of DIGITS, and the pattern
  toDigits strips with.

  Deliberately NOT exported. It needs the `g` flag to strip every run rather
  than just the first, and every pattern this package exports is guaranteed
  safe to reuse with .test() — a guarantee the lockstep test enforces and a
  global regex breaks, since it keeps `lastIndex` between calls. Callers want
  the transform anyway, so the transform is what leaves the module.
*/
const NON_DIGITS = /\D+/g;

// ---------------------------------------------------------------------------
// International / address patterns.
//
// These are DELIBERATELY separate from PHONE_NUMBER and PINCODE above, which
// are India-only (exactly 10 digits, exactly 6 digits). Checkout and shipping
// accept foreign numbers and postal codes, so reusing the Indian patterns there
// would reject input that is valid today.
// ---------------------------------------------------------------------------

/** Phone digits only, 6–15 long — the ITU E.164 range without a dial code. */
export const PHONE_INTL = /^\d{6,15}$/;
/** {@link PHONE_INTL} tolerating a leading `+` for a pasted full number. */
export const PHONE_INTL_PLUS = /^\+?\d{6,15}$/;
/** Postal code, 4–10 digits — non-Indian addresses included. */
export const PINCODE_LOOSE = /^\d{4,10}$/;

// ---------------------------------------------------------------------------
// Person names.
// ---------------------------------------------------------------------------

/**
 * A human name: letters, spaces, apostrophes and periods, starting with a
 * letter. Digits, underscores, emoji and every other symbol are rejected.
 *
 * Signup collects ONE "Name" box and splits it on whitespace into first_name
 * and last_name, so the surname is only ever as clean as this pattern makes the
 * whole string — the native form had no character rule at all, which is how
 * surnames like `Doe_123 😀` were reaching the database.
 *
 * Both the straight apostrophe and the typographic one are allowed: an iOS
 * keyboard silently substitutes `’` for `'`, so accepting only the ASCII form
 * rejects O’Brien on the exact surface most likely to type it.
 *
 * Bounded at 80 characters so it stays linear; each form still states its own
 * min/max, and the server caps first_name and last_name at 60 apiece.
 */
export const PERSON_NAME = /^[A-Za-z][A-Za-z .'’]{0,79}$/;

// ---------------------------------------------------------------------------
// Payout / tax identifiers.
// ---------------------------------------------------------------------------

/** Indian bank IFSC: 4 letters, a literal `0`, then 6 alphanumerics. */
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** UPI VPA such as `name@bank`. Bounded on both sides — linear, no ReDoS. */
export const UPI_ID = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{2,64}$/;
/** Bank account number: 6–18 digits (covers every Indian bank's format). */
export const BANK_ACCOUNT_NUMBER = /^\d{6,18}$/;

/**
 * GSTIN — 15 characters: 2 state digits, the 10-character PAN (5 letters,
 * 4 digits, 1 letter), the entity code, a literal `Z`, then the checksum.
 *
 * This is the ONLY correct pattern, and it is what onboarding, venue
 * registration and `@duncit/forms` already use. mWeb checkout carries a
 * different one — `/^\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]{2}$/` — which is not a
 * looser variant but a 14-character pattern, one short of a GSTIN. It rejects
 * every valid GSTIN, so that field cannot be filled in today. Migrating
 * checkout to this export is a bug fix, not a refactor; it is deliberately not
 * done here so the change lands with its own test and release note.
 */
export const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

/**
 * A Duncit referral code — the `DUN-` prefix and six uppercase hex characters,
 * exactly what the server generates (referral.service `generateCode`).
 *
 * Shared because the signup box on mWeb and the one in the native app must
 * agree on it, and because a typed code is now the ONLY way one is redeemed:
 * catching the shape here turns a mistyped code into an inline hint instead of
 * a failed signup.
 */
export const REFERRAL_CODE = /^DUN-[0-9A-F]{6}$/;

/**
 * Keep only the digits in a string.
 *
 * The rule behind every number-only box: a phone field is typed into, pasted
 * into and autofilled, and the last two are how letters get in. Applied on
 * change, it makes "digits only" a property of the input rather than a message
 * shown after the fact.
 */
export const toDigits = (v) => String(v ?? '').replaceAll(NON_DIGITS, '');

export const isPhoneNumber = (v) => PHONE_NUMBER.test(v);
export const isPincode = (v) => PINCODE.test(v);
export const isEmail = (v) => EMAIL.test(v);
export const isOtp = (v) => OTP_6.test(v);
export const isPhoneIntl = (v) => PHONE_INTL.test(v);
export const isPincodeLoose = (v) => PINCODE_LOOSE.test(v);
export const isIfsc = (v) => IFSC.test(v);
export const isUpiId = (v) => UPI_ID.test(v);
export const isBankAccountNumber = (v) => BANK_ACCOUNT_NUMBER.test(v);
/** Strict GSTIN check — see the {@link GSTIN} note before using it at checkout. */
export const isGstin = (v) => GSTIN.test(v);
/** Person-name shape check — letters, spaces, apostrophes and periods only. */
export const isPersonName = (v) => PERSON_NAME.test(v);
/** Referral-code shape check. Case-sensitive: upper-case before calling it. */
export const isReferralCode = (v) => REFERRAL_CODE.test(v);

/**
 * A Duncit @handle — the thing that stands in for a Mongo id in a profile URL.
 *
 * Lowercase letters, digits and single hyphens, 3–30 characters, starting and
 * ending on an alphanumeric. Deliberately narrower than a display name: this
 * string goes into `duncit.com/u/<username>`, so anything that would need
 * percent-encoding (spaces, dots, unicode) is rejected rather than escaped —
 * an escaped handle is neither readable nor shareable, which is the whole
 * point of having one.
 *
 * The length bound lives in the lookahead so ONE pattern answers the whole
 * question, and each `-` must be followed by an alphanumeric, so `a--b` and a
 * trailing `-` are rejected without the pattern ever becoming ambiguous.
 */
export const USERNAME = /^(?=.{3,30}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Handle shape check. Lower-case before calling it — the pattern is strict. */
export const isUsername = (v) => USERNAME.test(v);

/**
 * A four-digit birth YEAR — what a year-only date of birth is typed as.
 *
 * Deliberately just the shape: whether the year makes somebody old enough is a
 * calendar question, and it belongs to @duncit/datetime's
 * `isEligibleBirthYear` alongside every other age rule. This pattern only says
 * "four digits", so `20`, `1 999` and `two thousand` never reach that check.
 */
export const BIRTH_YEAR = /^\d{4}$/;

/** Birth-year shape check — four digits, nothing else. */
export const isBirthYear = (v) => BIRTH_YEAR.test(v);
