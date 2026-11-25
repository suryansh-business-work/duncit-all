import { duplicatePhoneKey } from '@modules/crm/leadDuplicate/leadDuplicate.match';
import { LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';

/**
 * Pure rules for answering "whose number is this?" from a phone — the Duncit
 * CRM app's caller ID, its dialer preview and its call log matching.
 *
 * A number is compared by its phone key (last ten digits, at least seven), the
 * same key the duplicate check uses, so "+91 98765 43210", "098765 43210" and
 * "9876543210" are one number. Both the mobile and the WhatsApp number of every
 * contact count: a lead often calls from the number it gave for WhatsApp.
 */

/** A date as Mongo hands it back: a Date, an ISO string, or nothing. */
export type StoredDate = Date | string | null;

export interface StoredContact {
  name?: string | null;
  role?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
}

export interface StoredActivity {
  type?: string | null;
  summary?: string | null;
  created_at?: StoredDate;
  deleted_at?: StoredDate;
}

/** The fields a phone match reads off any lead kind. */
export interface StoredLeadForPhone {
  _id: unknown;
  city?: string | null;
  lead_status?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  next_follow_up_date?: StoredDate;
  contacts?: ReadonlyArray<StoredContact | null> | null;
  activity_log?: ReadonlyArray<StoredActivity | null> | null;
  [field: string]: unknown;
}

export interface PhoneMatch {
  entity_type: CrmLeadEntityType;
  lead_id: string;
  lead_name: string;
  contact_name: string;
  contact_role: string;
  city: string;
  lead_status: string;
  priority: string;
  assigned_to: string;
  next_follow_up_date: string | null;
  last_activity_summary: string;
  last_activity_at: string | null;
}

/** One phone key → lead row of the offline caller-ID directory. */
export interface DirectoryEntry {
  phone_key: string;
  entity_type: CrmLeadEntityType;
  lead_id: string;
  lead_name: string;
  contact_name: string;
  city: string;
  lead_status: string;
  assigned_to: string;
}

/** Every distinct phone key a contact list holds, with the contact behind it. */
export function contactKeys(
  contacts: StoredLeadForPhone['contacts']
): Array<{ key: string; contact: StoredContact }> {
  const seen = new Set<string>();
  const out: Array<{ key: string; contact: StoredContact }> = [];
  for (const contact of contacts ?? []) {
    if (!contact) continue;
    for (const raw of [contact.mobile_number, contact.whatsapp_number]) {
      const key = duplicatePhoneKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ key, contact });
    }
  }
  return out;
}

const iso = (value: StoredDate | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** The newest entry of the lead's timeline that was not deleted. */
export function lastActivity(log: StoredLeadForPhone['activity_log']): StoredActivity | null {
  const live = (log ?? []).filter((entry): entry is StoredActivity => Boolean(entry) && !entry?.deleted_at);
  return live.at(-1) ?? null;
}

const nameOf = (entity_type: CrmLeadEntityType, lead: StoredLeadForPhone): string => {
  const name = lead[LEAD_NAME_FIELDS[entity_type]];
  return typeof name === 'string' ? name : '';
};

/** The match card for a lead that holds `key`, or null when it does not (the query is a superset). */
export function toPhoneMatch(
  entity_type: CrmLeadEntityType,
  lead: StoredLeadForPhone,
  key: string
): PhoneMatch | null {
  const holder = contactKeys(lead.contacts).find((c) => c.key === key);
  if (!holder) return null;
  const activity = lastActivity(lead.activity_log);
  return {
    entity_type,
    lead_id: String(lead._id),
    lead_name: nameOf(entity_type, lead),
    contact_name: holder.contact.name ?? '',
    contact_role: holder.contact.role ?? '',
    city: lead.city ?? '',
    lead_status: lead.lead_status ?? '',
    priority: lead.priority ?? '',
    assigned_to: lead.assigned_to ?? '',
    next_follow_up_date: iso(lead.next_follow_up_date),
    last_activity_summary: activity?.summary || activity?.type || '',
    last_activity_at: iso(activity?.created_at),
  };
}

/** One directory row per distinct phone key on the lead. */
export function toDirectoryEntries(entity_type: CrmLeadEntityType, lead: StoredLeadForPhone): DirectoryEntry[] {
  return contactKeys(lead.contacts).map(({ key, contact }) => ({
    phone_key: key,
    entity_type,
    lead_id: String(lead._id),
    lead_name: nameOf(entity_type, lead),
    contact_name: contact.name ?? '',
    city: lead.city ?? '',
    lead_status: lead.lead_status ?? '',
    assigned_to: lead.assigned_to ?? '',
  }));
}

/**
 * Directory paging walks the five lead collections in a fixed order, each by
 * `_id`. The cursor names where the last page stopped: "<kind index>:<last id>".
 * A malformed cursor starts over rather than failing — the client then simply
 * rebuilds its directory from the top.
 */
export interface DirectoryCursor {
  kind: number;
  afterId: string | null;
}

export function parseCursor(raw: string | null | undefined, kinds: number): DirectoryCursor {
  const match = /^(\d+):([a-f0-9]{24})?$/i.exec(String(raw ?? ''));
  if (!match) return { kind: 0, afterId: null };
  const kind = Number(match[1]);
  if (kind >= kinds) return { kind: 0, afterId: null };
  return { kind, afterId: match[2] ?? null };
}

export const formatCursor = (cursor: DirectoryCursor): string => `${cursor.kind}:${cursor.afterId ?? ''}`;
