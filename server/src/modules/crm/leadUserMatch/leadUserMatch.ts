/**
 * Which Duncit account a CRM lead belongs to, and where that account uses
 * Duncit from: the "Also a Duncit user" box, the platform icons beside a lead's
 * name, and the Devices column + filter on the venue / host / ecomm lead tables.
 *
 * A lead matches a user when one of its contacts' emails equals the account's
 * email (both lowercase), or one of its contacts' mobile / WhatsApp numbers
 * equals the account's phone number, exactly as typed. That is the rule the
 * CRM has always shown; this module only batches it and adds the platforms.
 *
 * Batched per request (`@utils/request-cache`): a table page asks for every
 * row's contact values in the same tick and they are looked up in ONE query,
 * on the indexed `auth.email` / `auth.phone.number`.
 */
import { GraphQLError } from 'graphql';
import type { Model } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { USER_PLATFORMS, toUserActivity, type UserPlatform } from '@modules/access/user/user.activity';
import { loadMany, type CacheCarrier } from '@utils/request-cache';
import type { TableQueryInput } from '@utils/table-query';

/** The table filter field the lead tables send for the Devices column. */
export const LEAD_PLATFORM_FILTER_FIELD = 'duncit_platforms';

export interface LeadContact {
  email?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
}

export interface MatchedLeadUser {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  profile_photo: string | null;
  matched_on: 'EMAIL' | 'PHONE';
  platforms_used: UserPlatform[];
  last_activity_at: string | null;
}

interface UserRow {
  _id: unknown;
  profile?: { first_name?: string | null; last_name?: string | null; profile_photo?: string | null } | null;
  auth?: { email?: string | null; phone?: { number?: string | null } | null } | null;
  activity?: { last_at?: Date | null; platforms?: string[] | null } | null;
}

const USER_FIELDS = 'profile.first_name profile.last_name profile.profile_photo auth.email auth.phone.number activity';
const emailKey = (email: string) => `e:${email}`;
const phoneKey = (phone: string) => `p:${phone}`;

/** The lead's contact emails (lowercase) and phone numbers (as typed), each once. */
export function leadContactValues(contacts: readonly (LeadContact | null | undefined)[] | null | undefined) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const contact of contacts ?? []) {
    const email = contact?.email?.trim().toLowerCase();
    if (email) emails.add(email);
    for (const phone of [contact?.mobile_number, contact?.whatsapp_number]) {
      const value = phone?.trim();
      if (value) phones.add(value);
    }
  }
  return { emails: [...emails], phones: [...phones] };
}

/** The `$or` that finds accounts holding any of these emails or phone numbers. */
function userContactFilter(emails: readonly string[], phones: readonly string[]): Record<string, unknown>[] {
  const or: Record<string, unknown>[] = [];
  if (emails.length > 0) or.push({ 'auth.email': { $in: emails } });
  if (phones.length > 0) or.push({ 'auth.phone.number': { $in: phones } });
  return or;
}

/** One query for every contact value asked for in this tick; each key → the account holding it. */
async function fetchUsersByContact(keys: string[]): Promise<Map<string, UserRow>> {
  const emails = keys.filter((key) => key.startsWith('e:')).map((key) => key.slice(2));
  const phones = keys.filter((key) => key.startsWith('p:')).map((key) => key.slice(2));
  const or = userContactFilter(emails, phones);
  if (or.length === 0) return new Map();
  const rows = await UserModel.find({ $or: or, 'metadata.deleted_at': null })
    .select(USER_FIELDS)
    .sort({ _id: 1 })
    .lean<UserRow[]>();
  const byKey = new Map<string, UserRow>();
  // Oldest account first, so the same lead always resolves to the same account.
  for (const row of rows) {
    const email = row.auth?.email;
    const phone = row.auth?.phone?.number;
    if (email && !byKey.has(emailKey(email))) byKey.set(emailKey(email), row);
    if (phone && !byKey.has(phoneKey(phone))) byKey.set(phoneKey(phone), row);
  }
  return byKey;
}

export function toMatchedLeadUser(row: UserRow, matchedOn: MatchedLeadUser['matched_on']): MatchedLeadUser {
  const activity = toUserActivity(row.activity);
  return {
    user_id: String(row._id),
    full_name: [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ').trim(),
    email: row.auth?.email ?? null,
    phone: row.auth?.phone?.number ?? null,
    profile_photo: row.profile?.profile_photo ?? null,
    matched_on: matchedOn,
    platforms_used: activity.platforms_used,
    last_activity_at: activity.last_activity_at,
  };
}

/**
 * The Duncit account behind a lead, or null. An email match wins over a phone
 * match, and among several, the lead's first contact value that matches.
 */
export async function matchedUserForLead(
  carrier: CacheCarrier,
  lead: { contacts?: readonly (LeadContact | null | undefined)[] | null } | null | undefined,
): Promise<MatchedLeadUser | null> {
  const { emails, phones } = leadContactValues(lead?.contacts);
  const emailKeys = emails.map(emailKey);
  const phoneKeys = phones.map(phoneKey);
  if (emailKeys.length + phoneKeys.length === 0) return null;
  const found = await loadMany<UserRow>(carrier, 'crmLeadMatchedUser', [...emailKeys, ...phoneKeys], fetchUsersByContact);
  const byEmail = emailKeys.map((key) => found.get(key)).find(Boolean);
  if (byEmail) return toMatchedLeadUser(byEmail, 'EMAIL');
  const byPhone = phoneKeys.map((key) => found.get(key)).find(Boolean);
  return byPhone ? toMatchedLeadUser(byPhone, 'PHONE') : null;
}

/** The platforms a Devices filter asks for; a bad op or value is the caller's mistake, said plainly. */
function platformsOf(filter: NonNullable<TableQueryInput['filters']>[number]): UserPlatform[] {
  if (filter.op !== 'in' && filter.op !== 'eq') {
    throw new GraphQLError('The Devices filter only matches one or more platforms.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const asked = filter.op === 'in' ? (filter.values ?? []) : [filter.value ?? ''];
  const known = new Set<string>(USER_PLATFORMS);
  if (asked.length === 0 || asked.some((value) => !known.has(value))) {
    throw new GraphQLError(`Devices must be one or more of ${USER_PLATFORMS.join(', ')}.`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return USER_PLATFORMS.filter((platform) => asked.includes(platform));
}

/**
 * Lift the Devices filter out of a lead table query (the table engine knows
 * nothing of it) and say which platforms it asks for, or null when it is absent.
 */
export function splitPlatformFilter(input: TableQueryInput | null | undefined): {
  input: TableQueryInput | null | undefined;
  platforms: UserPlatform[] | null;
} {
  const filters = input?.filters ?? [];
  const mine = filters.filter((filter) => filter.field === LEAD_PLATFORM_FILTER_FIELD);
  if (mine.length === 0) return { input, platforms: null };
  const platforms = [...new Set(mine.flatMap(platformsOf))];
  return { input: { ...input, filters: filters.filter((filter) => filter.field !== LEAD_PLATFORM_FILTER_FIELD) }, platforms };
}

/**
 * The lead filter for "matched to an account that uses any of these
 * platforms". Read lead-first: the collection's own contact values, then one
 * indexed user query over just those values — it grows with the leads, never
 * with every account on Duncit.
 */
export async function leadPlatformFilter(
  LeadModel: Pick<Model<unknown>, 'distinct'>,
  platforms: readonly UserPlatform[],
): Promise<Record<string, unknown>> {
  const [emails, mobiles, whatsapps] = await Promise.all([
    LeadModel.distinct('contacts.email'),
    LeadModel.distinct('contacts.mobile_number'),
    LeadModel.distinct('contacts.whatsapp_number'),
  ]);
  const text = (values: unknown[]) => values.filter((value): value is string => typeof value === 'string' && value !== '');
  const or = userContactFilter(text(emails), [...new Set([...text(mobiles), ...text(whatsapps)])]);
  const users =
    or.length === 0
      ? []
      : await UserModel.find({ $or: or, 'metadata.deleted_at': null, 'activity.platforms': { $in: platforms } })
          .select('auth.email auth.phone.number')
          .lean<UserRow[]>();
  const userEmails = users.map((user) => user.auth?.email).filter((value): value is string => Boolean(value));
  const userPhones = users.map((user) => user.auth?.phone?.number).filter((value): value is string => Boolean(value));
  const match: Record<string, unknown>[] = [];
  if (userEmails.length > 0) match.push({ 'contacts.email': { $in: userEmails } });
  if (userPhones.length > 0) {
    match.push({ 'contacts.mobile_number': { $in: userPhones } }, { 'contacts.whatsapp_number': { $in: userPhones } });
  }
  // No account on those platforms: a filter that matches no lead, not "no filter".
  return match.length > 0 ? { $or: match } : { _id: { $in: [] } };
}
