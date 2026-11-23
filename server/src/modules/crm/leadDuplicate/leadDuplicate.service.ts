import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { EcommLeadModel, HostLeadModel, VenueLeadModel } from '@modules/crm/crm/crm.model';
import { CommunityLeadModel, CreatorLeadModel } from '@modules/crm/prospectLead/prospectLead.model';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { escapeRegExp } from '@utils/regex';
import {
  probeFilter,
  probesFor,
  probesHeldBy,
  type DuplicateField,
  type DuplicateProbe,
  type LeadContactValues,
} from './leadDuplicate.match';

/**
 * Duplicate detection across every CRM lead kind. A phone, email or website
 * already on a venue lead is a duplicate on a new host, ecomm, creator or
 * community lead too — the same person or business must not be worked twice.
 */

/** Each lead collection, the field that names a lead, and how errors call it. */
const KINDS = {
  VENUE_LEAD: { model: VenueLeadModel, nameField: 'venue_name', label: 'Venue lead' },
  HOST_LEAD: { model: HostLeadModel, nameField: 'host_name', label: 'Host lead' },
  ECOMM_LEAD: { model: EcommLeadModel, nameField: 'seller_name', label: 'Ecomm lead' },
  CREATOR_LEAD: { model: CreatorLeadModel, nameField: 'creator_name', label: 'Creator lead' },
  COMMUNITY_LEAD: { model: CommunityLeadModel, nameField: 'community_name', label: 'Community lead' },
} as const satisfies Record<CrmLeadEntityType, { model: unknown; nameField: string; label: string }>;
const ENTITY_TYPES = Object.keys(KINDS) as CrmLeadEntityType[];

/** One value of the checked lead that another lead already has. */
export interface LeadDuplicateMatch {
  field: DuplicateField;
  value: string;
  entity_type: CrmLeadEntityType;
  lead_id: string;
  lead_name: string;
  city: string;
  lead_status: string;
}

/** The lead being checked, so it never matches itself. */
export interface LeadRef {
  entity_type: CrmLeadEntityType;
  id?: string | null;
}

interface StoredLead extends LeadContactValues {
  _id: unknown;
  city?: string | null;
  lead_status?: string | null;
  [field: string]: unknown;
}

/** The two lookups made here; the five models' generic signatures differ only in their document type. */
interface LeanQuery<T> {
  select(fields: string): { lean(): Promise<T> };
}
interface LookupModel {
  find(filter: Record<string, unknown>): LeanQuery<StoredLead[]>;
  findById(id: string): LeanQuery<LeadContactValues | null>;
}
const modelOf = (entity_type: CrmLeadEntityType) => KINDS[entity_type].model as unknown as LookupModel;

const validId = (id?: string | null): id is string => Boolean(id && Types.ObjectId.isValid(id));

/** Every stored lead (any kind) holding at least one probe, with its kind. */
async function leadsHolding(probes: readonly DuplicateProbe[]): Promise<Array<{ entity_type: CrmLeadEntityType; lead: StoredLead }>> {
  const filter = probeFilter(probes);
  if (!filter) return [];
  const perKind = await Promise.all(
    ENTITY_TYPES.map(async (entity_type) => {
      const fields = `${KINDS[entity_type].nameField} city lead_status website contacts.mobile_number contacts.email`;
      const rows = await modelOf(entity_type).find(filter).select(fields).lean();
      return rows.map((lead) => ({ entity_type, lead }));
    })
  );
  return perKind.flat();
}

const sameLead = (entity_type: CrmLeadEntityType, id: unknown, self?: LeadRef) =>
  Boolean(self?.id) && self?.entity_type === entity_type && String(id) === String(self?.id);

/** The values in `probes` that other leads already hold, one row per (value, lead). */
async function matchesFor(probes: readonly DuplicateProbe[], self?: LeadRef): Promise<LeadDuplicateMatch[]> {
  const holders = await leadsHolding(probes);
  const matches: LeadDuplicateMatch[] = [];
  for (const { entity_type, lead } of holders) {
    if (sameLead(entity_type, lead._id, self)) continue;
    for (const probe of probesHeldBy(lead, probes)) {
      matches.push({
        field: probe.field,
        value: probe.value,
        entity_type,
        lead_id: String(lead._id),
        lead_name: String(lead[KINDS[entity_type].nameField] ?? ''),
        city: lead.city ?? '',
        lead_status: lead.lead_status ?? '',
      });
    }
  }
  return matches;
}

/** Live check for the lead forms: which of these values already exist on another lead. */
export function findLeadDuplicates(values: LeadContactValues, self?: LeadRef): Promise<LeadDuplicateMatch[]> {
  return matchesFor(probesFor(values), self);
}

const FIELD_NOUN: Record<DuplicateField, string> = { PHONE: 'Phone number', EMAIL: 'Email', WEBSITE: 'Website' };

/** "Phone number 98765 43210 already belongs to Venue lead "The Barn"." */
export function duplicateMessage(match: LeadDuplicateMatch): string {
  const name = match.lead_name ? ` "${match.lead_name}"` : '';
  return `${FIELD_NOUN[match.field]} ${match.value} already belongs to ${KINDS[match.entity_type].label}${name}. Each phone number, email and website can be on one lead only.`;
}

/** Values the lead already stores — keeping them on an edit is not a new duplicate. */
async function storedProbeKeys(self: LeadRef): Promise<Set<string>> {
  if (!validId(self.id)) return new Set();
  const current = await modelOf(self.entity_type).findById(self.id).select('website contacts.mobile_number contacts.email').lean();
  return new Set(probesFor(current ?? {}).map((p) => `${p.field}:${p.key}`));
}

/**
 * Refuse a create or update that would give this lead a phone, email or website
 * another lead (of any kind) already has. On an update only the values the edit
 * ADDS are checked: a lead saved before this check existed can still be edited
 * without first untangling its old duplicate. A partial update that leaves
 * contacts / website out checks nothing for them.
 */
export async function assertNoLeadDuplicates(input: Readonly<Record<string, unknown>>, self: LeadRef): Promise<void> {
  const probes = probesFor({
    contacts: Array.isArray(input?.contacts) ? input.contacts : [],
    website: typeof input?.website === 'string' ? input.website : '',
  });
  if (probes.length === 0) return;
  const kept = self.id ? await storedProbeKeys(self) : new Set<string>();
  const added = probes.filter((p) => !kept.has(`${p.field}:${p.key}`));
  const [first, ...rest] = await matchesFor(added, self);
  if (!first) return;
  throw new GraphQLError(duplicateMessage(first), {
    extensions: { code: 'DUPLICATE_LEAD', duplicates: [first, ...rest] },
  });
}

/** Another lead already pointing at the same Instagram profile. */
export interface InstagramDuplicate {
  entity_type: CrmLeadEntityType;
  lead_id: string;
  lead_name: string;
  city: string;
}

/**
 * Leads (any kind) whose Instagram link or creator handle is this profile.
 * Not part of the save guard above — several leads may legitimately share a
 * brand's profile — but a researched candidate or a quality score counts it.
 */
export async function findInstagramDuplicates(handle: string, self?: LeadRef): Promise<InstagramDuplicate[]> {
  const clean = handle.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(clean)) return [];
  const link = new RegExp(String.raw`instagram\.com/${escapeRegExp(clean)}/?(?:[?#].*)?$`, 'i');
  const bare = new RegExp(String.raw`^@?${escapeRegExp(clean)}$`, 'i');
  const perKind = await Promise.all(
    ENTITY_TYPES.map(async (entity_type) => {
      const nameField = KINDS[entity_type].nameField;
      const rows = await modelOf(entity_type)
        .find({ $or: [{ instagram_link: link }, { handle: bare }] })
        .select(`${nameField} city`)
        .lean();
      return rows
        .filter((lead) => !sameLead(entity_type, lead._id, self))
        .map((lead) => ({ entity_type, lead_id: String(lead._id), lead_name: String(lead[nameField] ?? ''), city: lead.city ?? '' }));
    })
  );
  return perKind.flat();
}

/** A lead as a table page returns it (after `pub`): its id and contact values. */
type LeadRow = LeadContactValues & { id: string };

/**
 * Table rows with `is_duplicate` set: true when another lead of any kind
 * shares one of the row's phone numbers, emails or its website. One query per
 * lead collection for the whole page, never one per row.
 */
export async function withDuplicateFlags<T extends LeadRow>(
  entity_type: CrmLeadEntityType,
  rows: readonly T[]
): Promise<Array<T & { is_duplicate: boolean }>> {
  const holders = await leadsHolding(rows.flatMap((row) => probesFor(row)));
  return rows.map((row) => {
    const own = probesFor(row);
    const is_duplicate = holders.some(
      ({ entity_type: kind, lead }) => !sameLead(kind, lead._id, { entity_type, id: row.id }) && probesHeldBy(lead, own).length > 0
    );
    return { ...row, is_duplicate };
  });
}
