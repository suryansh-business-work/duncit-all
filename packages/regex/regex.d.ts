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

export function isPhoneNumber(value: string): boolean;
export function isPincode(value: string): boolean;
export function isEmail(value: string): boolean;
export function isOtp(value: string): boolean;
