import { Types } from 'mongoose';
import { LEAD_MODELS, LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { duplicatePhoneKey, phonePattern } from '@modules/crm/leadDuplicate/leadDuplicate.match';
import {
  formatCursor,
  parseCursor,
  toDirectoryEntries,
  toPhoneMatch,
  type DirectoryEntry,
  type PhoneMatch,
  type StoredLeadForPhone,
} from './deviceCall.match';

/** Lead kinds in the fixed order the directory walks them. */
export const PHONE_KINDS = Object.keys(LEAD_MODELS) as CrmLeadEntityType[];

/** No caller ID card needs more than this many leads behind one number. */
const MAX_MATCHES_PER_KIND = 5;
const DIRECTORY_DEFAULT_LIMIT = 500;
const DIRECTORY_MAX_LIMIT = 1000;

const CARD_FIELDS = 'city lead_status priority assigned_to next_follow_up_date contacts.name contacts.role contacts.mobile_number contacts.whatsapp_number';

interface PhoneQuery {
  select(fields: string | Record<string, unknown>): PhoneQuery;
  sort(order: Record<string, 1 | -1>): PhoneQuery;
  limit(n: number): PhoneQuery;
  lean(): Promise<StoredLeadForPhone[]>;
}
interface PhoneModel {
  find(filter: Record<string, unknown>): PhoneQuery;
}
const modelOf = (kind: CrmLeadEntityType) => LEAD_MODELS[kind] as unknown as PhoneModel;

/** Name + card fields + only the newest timeline entry, so a busy lead's log is not shipped whole. */
const cardProjection = (kind: CrmLeadEntityType): Record<string, unknown> => {
  const projection: Record<string, unknown> = { [LEAD_NAME_FIELDS[kind]]: 1, activity_log: { $slice: -1 } };
  for (const field of CARD_FIELDS.split(' ')) projection[field] = 1;
  return projection;
};

/** Every lead (any kind) whose contact holds this number, newest-touched first. Empty for a number too short to identify anyone. */
export async function lookupPhone(raw: string): Promise<{ phone_key: string; matches: PhoneMatch[] }> {
  const key = duplicatePhoneKey(raw);
  if (!key) return { phone_key: '', matches: [] };
  const pattern = phonePattern(key);
  const filter = { $or: [{ 'contacts.mobile_number': pattern }, { 'contacts.whatsapp_number': pattern }] };
  const perKind = await Promise.all(
    PHONE_KINDS.map(async (kind) => {
      const rows = await modelOf(kind).find(filter).select(cardProjection(kind)).sort({ updated_at: -1 }).limit(MAX_MATCHES_PER_KIND).lean();
      return rows.map((lead) => toPhoneMatch(kind, lead, key)).filter((m): m is PhoneMatch => m !== null);
    })
  );
  const matches = perKind.flat();
  matches.sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''));
  return { phone_key: key, matches };
}

const clampLimit = (limit?: number | null) =>
  Math.min(Math.max(Math.trunc(limit ?? DIRECTORY_DEFAULT_LIMIT), 1), DIRECTORY_MAX_LIMIT);

/**
 * One page of the offline caller-ID directory: every phone key on every lead,
 * walked kind by kind in `_id` order. The app stores it on the device so the
 * caller ID card shows the instant a call rings, even with no signal.
 *
 * A page never spans two kinds — when a kind runs out the cursor moves to the
 * next kind and the page ends early — which keeps each query a plain indexed
 * range scan. `next_cursor` is null once the last kind is done.
 */
export async function phoneDirectoryPage(
  rawCursor: string | null | undefined,
  rawLimit?: number | null
): Promise<{ items: DirectoryEntry[]; next_cursor: string | null; generated_at: string }> {
  const generated_at = new Date().toISOString();
  const limit = clampLimit(rawLimit);
  const cursor = parseCursor(rawCursor, PHONE_KINDS.length);
  const kind = PHONE_KINDS[cursor.kind] as CrmLeadEntityType;
  const filter: Record<string, unknown> = { 'contacts.0': { $exists: true } };
  if (cursor.afterId) filter._id = { $gt: new Types.ObjectId(cursor.afterId) };
  const fields = `${LEAD_NAME_FIELDS[kind]} city lead_status assigned_to contacts.name contacts.mobile_number contacts.whatsapp_number`;
  const rows = await modelOf(kind).find(filter).select(fields).sort({ _id: 1 }).limit(limit).lean();
  const items = rows.flatMap((lead) => toDirectoryEntries(kind, lead));
  const last = rows.at(-1);
  let next: string | null;
  if (rows.length === limit && last) next = formatCursor({ kind: cursor.kind, afterId: String(last._id) });
  else if (cursor.kind + 1 < PHONE_KINDS.length) next = formatCursor({ kind: cursor.kind + 1, afterId: null });
  else next = null;
  return { items, next_cursor: next, generated_at };
}
