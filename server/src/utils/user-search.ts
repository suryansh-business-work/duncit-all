import { escapeRegExp } from './regex';

/** Shortest term a member search answers — the consoles' pickers wait for the same. */
export const USER_SEARCH_MIN_LENGTH = 2;

/**
 * Digits a term needs before it is also read as a phone number. Fewer would
 * match a slice of almost every number on the platform ("12"), and a name or
 * an email rarely carries four digits in a row by accident.
 */
const PHONE_MIN_DIGITS = 4;

/** First and last name as one string, so "Riya Shah" finds the account it names. */
const FULL_NAME = {
  $concat: [{ $ifNull: ['$profile.first_name', ''] }, ' ', { $ifNull: ['$profile.last_name', ''] }],
};

/** The stored number with its country code in front, as members and staff tend to type it. */
const FULL_PHONE = {
  $concat: [{ $ifNull: ['$auth.phone.extension', ''] }, { $ifNull: ['$auth.phone.number', ''] }],
};

const regexMatch = (input: unknown, regex: string) => ({
  $expr: { $regexMatch: { input, regex, options: 'i' } },
});

/**
 * The Mongo filter that finds members by what an admin actually knows about
 * them: a first or last name, the full name, an email, or a phone number in
 * whatever shape it was typed — "+91 98765-43210", "919876543210" and
 * "98765 43210" all find the account holding 9876543210.
 *
 * Null for a term too short to search: a picker that lists the first accounts
 * on the platform before you have said who you mean is a picker that hands
 * value to the wrong person.
 */
export function userSearchFilter(term: string | null | undefined): Record<string, unknown> | null {
  const needle = (term ?? '').trim();
  if (needle.length < USER_SEARCH_MIN_LENGTH) return null;
  const pattern = escapeRegExp(needle);
  const rx = new RegExp(pattern, 'i');
  const or: Record<string, unknown>[] = [
    { 'auth.email': rx },
    { 'profile.first_name': rx },
    { 'profile.last_name': rx },
    regexMatch(FULL_NAME, pattern),
  ];
  const digits = needle.replaceAll(/\D/g, '');
  if (digits.length >= PHONE_MIN_DIGITS) or.push(regexMatch(FULL_PHONE, digits));
  return { $or: or };
}

/** A stored phone as one readable string, or '' when the account has none. */
export function phoneLabel(phone: { extension?: string | null; number?: string | null } | null | undefined): string {
  if (!phone?.number) return '';
  return [phone.extension, phone.number].filter(Boolean).join(' ');
}
