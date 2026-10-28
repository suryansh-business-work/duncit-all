import crypto from 'node:crypto';
import { fromZonedTime } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';

/**
 * The two numbers a printed card carries. The card number is printed in the
 * open; the passcode is under the scratch panel. Both are digits only, so they
 * can be read aloud and typed on a phone keypad.
 */
export const CARD_NUMBER_LENGTH = 9;
export const PASSCODE_LENGTH = 16;

const NON_DIGITS = /\D/g;
/** A leading zero would read as an 8-digit number on a printed card. */
const CARD_NUMBER_SHAPE = /^[1-9]\d{8}$/;
const PASSCODE_SHAPE = /^\d{16}$/;
const PASSCODE_GROUPS = /(\d{4})(?=\d)/g;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const digitsOf = (input: unknown): string => String(input ?? '').replaceAll(NON_DIGITS, '');

/** A random 9-digit number with no leading zero. Uniqueness is the database's job. */
export function generateCardNumber(): string {
  return String(crypto.randomInt(100_000_000, 1_000_000_000));
}

/** 16 random digits — 10^16 combinations, so guessing one is not a plan. */
export function generatePasscode(): string {
  let digits = '';
  for (let i = 0; i < PASSCODE_LENGTH; i += 1) digits += String(crypto.randomInt(0, 10));
  return digits;
}

/** Strip spaces and dashes; '' when what is left is not a card number. */
export function normalizeCardNumber(input: unknown): string {
  const digits = digitsOf(input);
  return CARD_NUMBER_SHAPE.test(digits) ? digits : '';
}

/** Strip the XXXX-XXXX-XXXX-XXXX dashes; '' when what is left is not 16 digits. */
export function normalizePasscode(input: unknown): string {
  const digits = digitsOf(input);
  return PASSCODE_SHAPE.test(digits) ? digits : '';
}

/** The printed form: XXXX-XXXX-XXXX-XXXX. */
export const formatPasscode = (digits: string): string => digits.replaceAll(PASSCODE_GROUPS, '$1-');

/**
 * Compare in constant time, so how long a wrong guess takes says nothing about
 * how many of its digits were right. Both sides are normalized 16-digit strings.
 */
export function passcodeMatches(stored: string, given: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The last millisecond of a calendar day in the app time zone — "valid till
 * 31 Dec" holds for all of 31 Dec, wherever the admin sat when they typed it. */
function endOfAppDay(year: number, monthIndex: number, day: number, tz: string): Date {
  return fromZonedTime(new Date(year, monthIndex, day, 23, 59, 59, 999), tz);
}

/**
 * When a newly generated batch stops being redeemable. An explicit
 * 'YYYY-MM-DD' wins; otherwise the virtual cards' validity applies, counted from
 * today. Null when the date is malformed, so the caller can refuse it.
 */
export function cardExpiryFor(
  expiresOn: string | null | undefined,
  validityMonths: number,
  now: Date = new Date(),
  tz: string = getAppTimeZone()
): Date | null {
  const day = (expiresOn ?? '').trim();
  if (!day) {
    const target = new Date(now);
    target.setMonth(target.getMonth() + validityMonths);
    return endOfAppDay(target.getFullYear(), target.getMonth(), target.getDate(), tz);
  }
  const match = ISO_DAY.exec(day);
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const probe = new Date(year, month, date);
  // new Date() rolls 2026-02-31 over into March; a rolled date was not a real one.
  if (probe.getFullYear() !== year || probe.getMonth() !== month || probe.getDate() !== date) {
    return null;
  }
  return endOfAppDay(year, month, date, tz);
}
