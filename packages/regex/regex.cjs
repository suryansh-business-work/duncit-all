// @duncit/regex — shared regex patterns + validators. Framework-agnostic.
// Keep this file in exact sync with regex.mjs and regex.d.ts.
// None of these patterns use the `g` flag, so `.test()` is safe to reuse.
'use strict';

/** Exactly 10 digits — an Indian mobile number WITHOUT the country/dial code. */
const PHONE_NUMBER = /^\d{10}$/;
/** Stricter Indian mobile: 10 digits starting 6–9. */
const PHONE_NUMBER_IN = /^[6-9]\d{9}$/;
/** Country/dial code such as `+91` (optional `+`, 1–4 digits). */
const DIAL_CODE = /^\+?\d{1,4}$/;
/** Indian 6-digit PIN code (first digit 1–9). */
const PINCODE = /^[1-9]\d{5}$/;
/** 6-digit numeric OTP. */
const OTP_6 = /^\d{6}$/;
/** Pragmatic email pattern (no spaces, one `@`, a dotted domain). Domain labels
 * exclude `.` so the `\.` separator never overlaps a label — linear, no ReDoS. */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
/** One or more digits, nothing else. */
const DIGITS = /^\d+$/;

// ---------------------------------------------------------------------------
// International / address patterns.
//
// These are DELIBERATELY separate from PHONE_NUMBER and PINCODE above, which
// are India-only (exactly 10 digits, exactly 6 digits). Checkout and shipping
// accept foreign numbers and postal codes, so reusing the Indian patterns there
// would reject input that is valid today.
// ---------------------------------------------------------------------------

/** Phone digits only, 6–15 long — the ITU E.164 range without a dial code. */
const PHONE_INTL = /^\d{6,15}$/;
/** PHONE_INTL tolerating a leading `+` for a pasted full number. */
const PHONE_INTL_PLUS = /^\+?\d{6,15}$/;
/** Postal code, 4–10 digits — non-Indian addresses included. */
const PINCODE_LOOSE = /^\d{4,10}$/;

// ---------------------------------------------------------------------------
// Payout / tax identifiers.
// ---------------------------------------------------------------------------

/** Indian bank IFSC: 4 letters, a literal `0`, then 6 alphanumerics. */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** UPI VPA such as `name@bank`. Bounded on both sides — linear, no ReDoS. */
const UPI_ID = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{2,64}$/;
/** Bank account number: 6–18 digits (covers every Indian bank's format). */
const BANK_ACCOUNT_NUMBER = /^\d{6,18}$/;

/**
 * GSTIN — 15 characters: 2 state digits, the 10-character PAN (5 letters,
 * 4 digits, 1 letter), the entity code, a literal `Z`, then the checksum.
 *
 * This is the ONLY correct pattern, and it is what onboarding, venue
 * registration and `@duncit/forms` already use. mWeb checkout carries a
 * different one which is not a looser variant but a 14-character pattern, one
 * short of a GSTIN — it rejects every valid GSTIN, so that field cannot be
 * filled in today. Migrating checkout to this export is a bug fix, not a
 * refactor; it is deliberately not done here so the change lands with its own
 * test and release note.
 */
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

module.exports = {
  PHONE_NUMBER,
  PHONE_NUMBER_IN,
  DIAL_CODE,
  PINCODE,
  OTP_6,
  EMAIL,
  DIGITS,
  PHONE_INTL,
  PHONE_INTL_PLUS,
  PINCODE_LOOSE,
  IFSC,
  UPI_ID,
  BANK_ACCOUNT_NUMBER,
  GSTIN,
  isPhoneNumber: (v) => PHONE_NUMBER.test(v),
  isPincode: (v) => PINCODE.test(v),
  isEmail: (v) => EMAIL.test(v),
  isOtp: (v) => OTP_6.test(v),
  isPhoneIntl: (v) => PHONE_INTL.test(v),
  isPincodeLoose: (v) => PINCODE_LOOSE.test(v),
  isIfsc: (v) => IFSC.test(v),
  isUpiId: (v) => UPI_ID.test(v),
  isBankAccountNumber: (v) => BANK_ACCOUNT_NUMBER.test(v),
  isGstin: (v) => GSTIN.test(v),
};
