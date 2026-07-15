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
/** Pragmatic email pattern (no spaces, one `@`, a dotted domain). */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** One or more digits, nothing else. */
export const DIGITS = /^\d+$/;

export const isPhoneNumber = (v) => PHONE_NUMBER.test(v);
export const isPincode = (v) => PINCODE.test(v);
export const isEmail = (v) => EMAIL.test(v);
export const isOtp = (v) => OTP_6.test(v);
