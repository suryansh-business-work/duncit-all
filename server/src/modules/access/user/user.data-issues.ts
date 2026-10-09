/**
 * What is wrong with an account's contact data — the red rows in Admin > Users
 * and the "Data issues" chart on the Users dashboard.
 *
 * Six problems, all read from what is stored, never guessed:
 * - MISSING_NAME / MISSING_EMAIL / MISSING_PHONE — the field is empty (a
 *   placeholder number of zeros counts as empty: it reaches nobody).
 * - DUPLICATE_EMAIL — another live account holds this email, as its email or
 *   as its linked Gmail.
 * - DUPLICATE_PHONE — another live account holds this mobile or WhatsApp
 *   number, in either field. That is the `numberHeldElsewhere` rule read
 *   backwards: the three phone doors resolve a number through BOTH fields, so
 *   one number on two accounts is ambiguous whichever field it sits in.
 * - CONTACT_MISMATCH — the account's own contacts disagree: its WhatsApp is a
 *   different number from its mobile, or its linked Gmail is a different
 *   address from its email.
 *
 * Numbers are matched on the number alone, not the extension: WhatsApp's
 * extension defaults to '' on historical rows, so a same-number pair would
 * otherwise read as two different numbers.
 */
import { UserModel } from './user.model';
import { loadMany, type CacheCarrier } from '@utils/request-cache';

export const USER_DATA_ISSUES = [
  'MISSING_NAME',
  'MISSING_EMAIL',
  'MISSING_PHONE',
  'DUPLICATE_EMAIL',
  'DUPLICATE_PHONE',
  'CONTACT_MISMATCH',
] as const;

export type UserDataIssue = (typeof USER_DATA_ISSUES)[number];

/** Live accounts — a deleted account is soft-deleted, so it no longer clashes with anyone. */
export const LIVE_ACCOUNTS = { 'metadata.deleted_at': null } as const;

/** A number that can reach someone: at least one non-zero digit (all zeros is the placeholder). */
export const REAL_NUMBER = /[1-9]/;

/** Text with something in it. */
export const FILLED = /\S/;

/** The contact fields of one account, as the public user shape carries them. */
export interface ContactRow {
  user_id: string;
  first_name?: string | null;
  email?: string | null;
  google_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
}

const text = (value?: string | null) => (value ?? '').trim();
const filled = (value?: string | null) => FILLED.test(value ?? '');
const realNumber = (value?: string | null) => REAL_NUMBER.test(value ?? '');

const emailKey = (email?: string | null) => `email:${text(email).toLowerCase()}`;
const phoneKey = (number?: string | null) => `phone:${text(number)}`;

/** Every key that reaches this account: its email, linked Gmail, mobile and WhatsApp. */
export function contactKeys(row: ContactRow): string[] {
  const keys = new Set<string>();
  if (filled(row.email)) keys.add(emailKey(row.email));
  if (filled(row.google_email)) keys.add(emailKey(row.google_email));
  if (realNumber(row.phone_number)) keys.add(phoneKey(row.phone_number));
  if (realNumber(row.whatsapp_number)) keys.add(phoneKey(row.whatsapp_number));
  return [...keys];
}

function contactMismatch(row: ContactRow): boolean {
  const numbers = realNumber(row.phone_number) && realNumber(row.whatsapp_number);
  if (numbers && text(row.phone_number) !== text(row.whatsapp_number)) return true;
  const emails = filled(row.email) && filled(row.google_email);
  return emails && emailKey(row.email) !== emailKey(row.google_email);
}

/**
 * The issues on one account, given who else holds each of its contact keys.
 * `holders` maps a key to the ids of every live account holding it.
 */
export function dataIssuesOf(row: ContactRow, holders: ReadonlyMap<string, readonly string[]>): UserDataIssue[] {
  const heldElsewhere = (key: string) => (holders.get(key) ?? []).some((id) => id !== row.user_id);
  const keys = contactKeys(row);
  const checks: Array<[UserDataIssue, boolean]> = [
    ['MISSING_NAME', !filled(row.first_name)],
    ['MISSING_EMAIL', !filled(row.email)],
    ['MISSING_PHONE', !realNumber(row.phone_number)],
    ['DUPLICATE_EMAIL', keys.some((key) => key.startsWith('email:') && heldElsewhere(key))],
    ['DUPLICATE_PHONE', keys.some((key) => key.startsWith('phone:') && heldElsewhere(key))],
    ['CONTACT_MISMATCH', contactMismatch(row)],
  ];
  return checks.filter(([, found]) => found).map(([issue]) => issue);
}

interface StoredContacts {
  _id: unknown;
  auth?: { email?: string; google_id?: string; google_email?: string; phone?: { number?: string } };
  communication?: { whatsapp?: { number?: string } };
}

/** A stored account as a ContactRow — the linked Gmail reads as the email when none was kept, like toPublic. */
const storedRow = (u: StoredContacts): ContactRow => ({
  user_id: String(u._id),
  email: u.auth?.email,
  google_email: u.auth?.google_id ? (u.auth.google_email ?? u.auth.email) : null,
  phone_number: u.auth?.phone?.number,
  whatsapp_number: u.communication?.whatsapp?.number,
});

const CONTACT_PROJECTION =
  'auth.email auth.google_id auth.google_email auth.phone.number communication.whatsapp.number';

/** Every live account holding any of `keys`, as key → account ids. One query for the whole page. */
async function fetchHolders(keys: string[]): Promise<Map<string, string[]>> {
  const emails = keys.filter((key) => key.startsWith('email:')).map((key) => key.slice('email:'.length));
  const numbers = keys.filter((key) => key.startsWith('phone:')).map((key) => key.slice('phone:'.length));
  const docs = await UserModel.find({
    ...LIVE_ACCOUNTS,
    $or: [
      { 'auth.email': { $in: emails } },
      { 'auth.google_email': { $in: emails } },
      { 'auth.phone.number': { $in: numbers } },
      { 'communication.whatsapp.number': { $in: numbers } },
    ],
  })
    .select(CONTACT_PROJECTION)
    .lean<StoredContacts[]>();
  const wanted = new Set(keys);
  const holders = new Map<string, string[]>(keys.map((key) => [key, []]));
  for (const doc of docs) {
    const row = storedRow(doc);
    for (const key of contactKeys(row)) {
      if (wanted.has(key)) holders.get(key)?.push(row.user_id);
    }
  }
  return holders;
}

/**
 * The issues on one account row. Sibling rows of a page ask in the same tick,
 * so the whole page's duplicate check is a single query (see request-cache).
 */
export async function loadUserDataIssues(carrier: CacheCarrier, row: ContactRow): Promise<UserDataIssue[]> {
  const holders = await loadMany<string[]>(carrier, 'userContactHolders', contactKeys(row), fetchHolders);
  return dataIssuesOf(row, holders);
}
