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

module.exports = {
  PHONE_NUMBER,
  PHONE_NUMBER_IN,
  DIAL_CODE,
  PINCODE,
  OTP_6,
  EMAIL,
  DIGITS,
  isPhoneNumber: (v) => PHONE_NUMBER.test(v),
  isPincode: (v) => PINCODE.test(v),
  isEmail: (v) => EMAIL.test(v),
  isOtp: (v) => OTP_6.test(v),
};
