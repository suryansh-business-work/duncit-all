import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  VenueLeadModel,
  HostLeadModel,
  EcommLeadModel,
  CrmServiceCatalogModel,
  CrmDynamicFieldModel,
} from './crm.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import {
  runTableQuery,
  type TableEntityConfig,
  type TableFieldConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { commsService } from '@services/comms/comms.service';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import * as C from './crm.constants';
import { toActivity } from '@modules/crm/manualLog/manualLog.view';
import { manualLogService } from '@modules/crm/manualLog/manualLog.service';
import { removeLeadMedia } from '@modules/crm/leadMedia/leadMedia.model';
import { assertNoLeadDuplicates, withDuplicateFlags } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { applyAssignee } from '@modules/crm/crmUser/crmUser.service';
import { LEAD_MODELS } from './leadModels';
import { leadUpdate, type LeadGeoKind } from '@modules/crm/leadGeo/leadGeo.place';
import { nearbyLeadTable, type LeadNearInput } from '@modules/crm/leadGeo/leadGeo.nearby';
import { leadQualityService } from '@modules/crm/leadQuality/leadQuality.service';
import { leadPlatformFilter, splitPlatformFilter } from '@modules/crm/leadUserMatch/leadUserMatch';

// Re-exported: leadMedia.service and older callers import LEAD_MODELS from here.
export { LEAD_MODELS } from './leadModels';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));

const toContact = (c: any) => ({
  name: c?.name ?? '',
  role: c?.role ?? '',
  mobile_number: c?.mobile_number ?? '',
  whatsapp_number: c?.whatsapp_number ?? '',
  email: c?.email ?? '',
});

const toServiceOffered = (s: any) => ({
  service: s?.service ?? '',
  custom_name: s?.custom_name ?? '',
  description: s?.description ?? '',
});

const toSocialLink = (l: { name?: string | null; url?: string | null } | null | undefined) => ({
  name: l?.name ?? '',
  url: l?.url ?? '',
});

/**
 * Extra social links as typed: rows without a URL are dropped, a missing name
 * becomes the link's host, and only http(s) URLs are kept — the detail page
 * renders these as links, so a "javascript:" one must never be stored.
 */
export function cleanSocialLinks(raw: unknown): { name: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { name: string; url: string }[] = [];
  for (const row of raw) {
    const url = String(row?.url ?? '').trim();
    if (!url) continue;
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      throw new GraphQLError(`"${url}" is not a web link — social links must start with https://`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const name = String(row?.name ?? '').trim().slice(0, 60) || parsed.hostname.replace(/^www\./, '');
    out.push({ name, url });
  }
  return out.slice(0, 20);
}

export function pub(doc: any) {
  const o = doc?.toObject ? doc.toObject() : doc;
  if (!o) return null;
  return {
    ...o,
    id: String(o._id),
    super_category_id: o.super_category_id ? String(o.super_category_id) : null,
    category_ids: (o.category_ids ?? []).map(String),
    sub_category_ids: (o.sub_category_ids ?? []).map(String),
    contacts: (o.contacts ?? []).map(toContact),
    services_offered: (o.services_offered ?? []).map(toServiceOffered),
    social_links: (o.social_links ?? []).map(toSocialLink),
    linked_host_ids: (o.linked_host_ids ?? []).map(String),
    tags: o.tags ?? [],
    // GraphQL clients receive the dynamic field map as a JSON string so we
    // don't have to introduce a custom scalar. Empty object when unset.
    dynamic_values_json: JSON.stringify(o.dynamic_values ?? {}),
    activity_log: (o.activity_log ?? []).map(toActivity),
    next_follow_up_date: iso(o.next_follow_up_date),
    preferred_event_date: iso(o.preferred_event_date),
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
    quality: o.quality ? { ...o.quality, scored_at: iso(o.quality.scored_at) } : null,
  };
}

// Normalise a stored/options-input array to `{ value, label }` objects.
// Accepts legacy plain strings (value === label) and partial objects.
function normalizeOptions(raw: any): { value: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        const v = entry.trim();
        return v ? { value: v, label: v } : null;
      }
      if (entry && typeof entry === 'object') {
        const value = String(entry.value ?? entry.label ?? '').trim();
        const label = String(entry.label ?? entry.value ?? '').trim();
        return value ? { value, label: label || value } : null;
      }
      return null;
    })
    .filter((o): o is { value: string; label: string } => o !== null);
}

function pubDynamicField(doc: any) {
  const o = doc?.toObject ? doc.toObject() : doc;
  if (!o) return null;
  return {
    id: String(o._id),
    name: o.name,
    label: o.label,
    kind: o.kind,
    options: normalizeOptions(o.options),
    multi: !!o.multi,
    placeholder: o.placeholder ?? '',
    default_value: o.default_value ?? '',
    hint: o.hint ?? '',
    applies_to_venue: o.applies_to_venue !== false,
    applies_to_host: o.applies_to_host !== false,
    applies_to_ecomm: o.applies_to_ecomm === true,
    applies_to_creator: o.applies_to_creator === true,
    applies_to_community: o.applies_to_community === true,
    required: !!o.required,
    sort_order: o.sort_order ?? 0,
    is_active: o.is_active !== false,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
}

function pubService(doc: any) {
  const o = doc?.toObject ? doc.toObject() : doc;
  if (!o) return null;
  return {
    id: String(o._id),
    name: o.name,
    kind: (o.kind ?? 'VENUE') as ServiceKind,
    sort_order: o.sort_order ?? 0,
    is_active: o.is_active !== false,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
}

function toObjectIdOrNull(value: any): Types.ObjectId | null {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
}

function buildQuery(filter: any, nameField: string) {
  const q: Record<string, any> = {};
  if (filter?.city) q.city = filter.city;
  if (filter?.lead_status) q.lead_status = filter.lead_status;
  if (filter?.priority) q.priority = filter.priority;
  if (filter?.super_category_id) {
    const oid = toObjectIdOrNull(filter.super_category_id);
    if (oid) q.super_category_id = oid;
  }
  if (filter?.search) {
    const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
    q.$or = [{ [nameField]: rx }, { city: rx }, { 'contacts.mobile_number': rx }, { 'contacts.email': rx }];
  }
  return q;
}

export const parseDate = (v?: string | null) => (v ? new Date(v) : null);

/**
 * Allowlists for the shared table engine (*LeadsTable — DUNCIT TABLE CONTRACT
 * v1). Search mirrors the legacy CrmLeadFilter regex (name / city / contact
 * phone / contact email) and filterFields cover every CrmLeadFilter field, so
 * the *Table siblings accept the same filter semantics via TableQueryInput.
 * Default sort matches the lead DataGrids' default (next follow-up asc).
 */
export function leadTableConfig(
  nameField: string,
  extras: {
    searchFields?: string[];
    sortFields?: Record<string, string>;
    filterFields?: Record<string, TableFieldConfig>;
  } = {}
): TableEntityConfig {
  return {
    searchFields: [
      nameField,
      'city',
      'contacts.mobile_number',
      'contacts.email',
      ...(extras.searchFields ?? []),
    ],
    sortFields: {
      [nameField]: nameField,
      city: 'city',
      email: 'contacts.email',
      lead_status: 'lead_status',
      priority: 'priority',
      next_follow_up_date: 'next_follow_up_date',
      created_at: 'created_at',
      updated_at: 'updated_at',
      super_category_id: 'super_category_id',
      // The Assigned To column sorts by the assignee's name and filters by their user id.
      assigned_to: 'assigned_to',
      // Lead Quality Score column: sorts by the stored score across the whole collection.
      quality_score: 'quality.score',
      ...extras.sortFields,
    },
    filterFields: {
      [nameField]: { type: 'string' },
      city: { type: 'string' },
      email: { path: 'contacts.email', type: 'string' },
      lead_status: { type: 'enum' },
      priority: { type: 'enum' },
      super_category_id: { type: 'enum' },
      next_follow_up_date: { type: 'date' },
      created_at: { type: 'date' },
      assigned_to: { path: 'assigned_user_id', type: 'enum' },
      quality_score: { path: 'quality.score', type: 'number' },
      quality_classification: { path: 'quality.classification', type: 'enum' },
      quality_qualification: { path: 'quality.qualification', type: 'enum' },
      quality_verification: { path: 'quality.verification', type: 'enum' },
      quality_failed_gates: { path: 'quality.failed_gates', type: 'number' },
      ...extras.filterFields,
    },
    defaultSort: { next_follow_up_date: 1 },
  };
}

const VENUE_LEAD_TABLE_CONFIG = leadTableConfig('venue_name');
const HOST_LEAD_TABLE_CONFIG = leadTableConfig('host_name', {
  sortFields: { host_type: 'host_type' },
  filterFields: { host_type: { type: 'string' } },
});
const ECOMM_LEAD_TABLE_CONFIG = leadTableConfig('seller_name', {
  searchFields: ['brand_name'],
  sortFields: { brand_name: 'brand_name' },
  filterFields: { brand_name: { type: 'string' } },
});

/**
 * Server-side table page (search/filter/sort/paginate) for any lead kind.
 * With `near`, only the leads within the radius, each with its distance
 * (nearest first by default), and the count of leads that cannot be put on
 * the map.
 */
export async function leadTablePage(
  entity_type: LeadGeoKind,
  config: TableEntityConfig,
  input?: TableQueryInput | null,
  near?: LeadNearInput | null
) {
  // The Devices filter is resolved against the matched accounts here, not by the table engine.
  const { input: tableInput, platforms } = splitPlatformFilter(input);
  const base = platforms ? await leadPlatformFilter(LEAD_MODELS[entity_type], platforms) : {};
  const { docs, total, page, page_size, unplaced } = near
    ? await nearbyLeadTable<unknown>(entity_type, near, tableInput, config, base)
    : { ...(await runTableQuery<unknown>(LEAD_MODELS[entity_type], base, tableInput, config)), unplaced: null };
  const rows = await withDuplicateFlags(entity_type, docs.map(pub).filter((row) => row !== null));
  return { rows, total, page, page_size, unplaced };
}

/**
 * Normalise the inbound input so it round-trips cleanly with Mongoose. Right
 * now this just coerces super_category_id (a string from the client) into an
 * ObjectId — passing the raw string causes Mongoose's CastError on the index.
 * Same treatment for `linked_host_ids` so the venue ↔ host association can
 * be queried + populated cleanly.
 */
export function normaliseLeadInput<T extends Record<string, any>>(input: T): T {
  const out: any = { ...input };
  if ('super_category_id' in out) {
    out.super_category_id = toObjectIdOrNull(out.super_category_id);
  }
  for (const key of ['category_ids', 'sub_category_ids']) {
    if (Array.isArray(out[key])) {
      out[key] = out[key].map(toObjectIdOrNull).filter((v): v is Types.ObjectId => Boolean(v));
    }
  }
  if (Array.isArray(out.linked_host_ids)) {
    out.linked_host_ids = (out.linked_host_ids as any[])
      .map(toObjectIdOrNull)
      .filter((v): v is Types.ObjectId => Boolean(v));
  }
  if (Array.isArray(out.tags)) {
    // Tags are free-text — strip whitespace and drop blanks so we never
    // persist `[""]` from an accidental empty chip.
    out.tags = out.tags.map((t: any) => String(t ?? '').trim()).filter(Boolean);
  }
  if ('social_links' in out) out.social_links = cleanSocialLinks(out.social_links);
  if (typeof out.dynamic_values_json === 'string') {
    const raw = out.dynamic_values_json.trim();
    try {
      out.dynamic_values = raw ? JSON.parse(raw) : {};
    } catch {
      out.dynamic_values = {};
    }
    delete out.dynamic_values_json;
  }
  return out;
}

export function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

export async function logAndAttachActivity(opts: {
  lead: any;
  type: 'EMAIL' | 'CALL';
  entity_type: C.CrmLeadEntityType;
  provider_id?: string | null;
  to: string;
  subject?: string;
  body?: string;
  result: any;
  by?: string | null;
  contact_name?: string;
}) {
  const okStatus = opts.type === 'EMAIL' ? 'SENT' : 'INITIATED';
  const status = opts.result.ok ? okStatus : 'FAILED';
  await communicationLogService.create({
    type: opts.type,
    entity_type: opts.entity_type,
    entity_id: String(opts.lead._id),
    provider_id: opts.result?.provider_id ?? opts.provider_id ?? null,
    provider_name: opts.result?.provider ?? '',
    contact_name: opts.contact_name ?? '',
    contact_value: opts.to,
    subject: opts.subject ?? '',
    body: opts.body ?? '',
    status,
    error_message: opts.result.ok ? '' : opts.result.message,
    external_id: opts.result.external_id ?? null,
    recording_url: opts.result.recording_url ?? null,
    created_by: opts.by ?? null,
  });
  opts.lead.activity_log.push({
    type: opts.type,
    summary: opts.type === 'EMAIL' ? opts.subject ?? '' : 'Outbound call',
    status,
    target: opts.to,
    created_by: opts.by ?? null,
  } as any);
  await opts.lead.save();
}

type ServiceKind = 'VENUE' | 'HOST' | 'ECOMM';
const SERVICE_KINDS = new Set<ServiceKind>(['VENUE', 'HOST', 'ECOMM']);
const asServiceKind = (v: any, fallback: ServiceKind = 'VENUE'): ServiceKind =>
  SERVICE_KINDS.has(v) ? v : fallback;

async function loadServiceNames(kind: ServiceKind): Promise<string[]> {
  // Active catalogue names, sort-ordered, with the "Other" sentinel always
  // appended so the dropdown's free-text escape hatch survives independent
  // of what admins do in Manage Services.
  const rows = await CrmServiceCatalogModel
    .find({ kind, is_active: { $ne: false } })
    .sort({ sort_order: 1, name: 1 });
  const names = rows.map((r: any) => r.name as string);
  return names.includes('Other') ? names : [...names, 'Other'];
}

export const crmService = {
  async config() {
    const { managedOptionService } = await import('@modules/crm/managedOption/managedOption.service');
    const [venueServices, hostServices, amenities, eventSuitability] = await Promise.all([
      loadServiceNames('VENUE'),
      loadServiceNames('HOST'),
      managedOptionService.activeNames('AMENITY'),
      managedOptionService.activeNames('EVENT_SUITABILITY'),
    ]);
    // services_offered_options stays around as the union of both — kept for
    // older callers / dashboard widgets that aggregate venue + host together.
    const unionSet = new Set<string>([...venueServices, ...hostServices]);
    const services = Array.from(unionSet);
    return {
      venue_types: C.VENUE_TYPES,
      space_types: C.SPACE_TYPES,
      venue_event_suitability: eventSuitability,
      week_days: C.WEEK_DAYS,
      booking_notices: C.BOOKING_NOTICES,
      pricing_models: C.PRICING_MODELS,
      amenities,
      lead_sources: C.LEAD_SOURCES,
      venue_lead_statuses: C.VENUE_LEAD_STATUSES,
      host_lead_statuses: C.HOST_LEAD_STATUSES,
      priorities: C.PRIORITIES,
      host_types: C.HOST_TYPES,
      host_interests: C.HOST_INTERESTS,
      audience_sizes: C.AUDIENCE_SIZES,
      frequencies: C.FREQUENCIES,
      revenue_models: C.REVENUE_MODELS,
      host_intent_scores: C.HOST_INTENT_SCORES,
      services_offered_options: services,
      venue_services_offered_options: venueServices,
      host_services_offered_options: hostServices,
      creator_platforms: C.CREATOR_PLATFORMS,
      collaboration_types: C.COLLABORATION_TYPES,
      community_types: C.COMMUNITY_TYPES,
      community_platforms: C.COMMUNITY_PLATFORMS,
    };
  },

  // ---- Services catalogue ----
  async listServices(kind?: ServiceKind | null, includeInactive = false) {
    const q: Record<string, any> = {};
    if (kind) q.kind = kind;
    if (!includeInactive) q.is_active = { $ne: false };
    const docs = await CrmServiceCatalogModel.find(q).sort({ kind: 1, sort_order: 1, name: 1 });
    return docs.map(pubService);
  },
  async createService(input: {
    name: string;
    kind: ServiceKind;
    sort_order?: number | null;
    is_active?: boolean | null;
  }) {
    const name = (input.name ?? '').trim();
    const kind = asServiceKind(input.kind);
    if (!name) throw new GraphQLError('Service name is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const existing = await CrmServiceCatalogModel.findOne({ kind, name });
    if (existing) {
      throw new GraphQLError('A service with that name already exists for this catalogue', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const doc = await CrmServiceCatalogModel.create({
      name,
      kind,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active !== false,
    });
    return pubService(doc);
  },
  async updateService(
    id: string,
    input: { name: string; kind?: ServiceKind; sort_order?: number | null; is_active?: boolean | null }
  ) {
    const doc = await CrmServiceCatalogModel.findById(id);
    if (!doc) notFound('Service');
    const nextKind = asServiceKind(input.kind, doc.kind as ServiceKind);
    const name = (input.name ?? '').trim();
    if (name && (name !== doc.name || nextKind !== doc.kind)) {
      const dupe = await CrmServiceCatalogModel.findOne({
        kind: nextKind,
        name,
        _id: { $ne: doc._id },
      });
      if (dupe) {
        throw new GraphQLError('A service with that name already exists for this catalogue', {
          extensions: { code: 'CONFLICT' },
        });
      }
      doc.name = name;
    }
    doc.kind = nextKind;
    if (input.sort_order !== undefined && input.sort_order !== null) doc.sort_order = input.sort_order;
    if (input.is_active !== undefined && input.is_active !== null) doc.is_active = input.is_active;
    await doc.save();
    return pubService(doc);
  },
  async deleteService(id: string) {
    const doc = await CrmServiceCatalogModel.findByIdAndDelete(id);
    if (!doc) notFound('Service');
    return true;
  },
  async seedServiceDefaults() {
    // Backfill `kind` on any pre-split rows (originally created without one).
    await CrmServiceCatalogModel.updateMany(
      { $or: [{ kind: { $exists: false } }, { kind: null }] },
      { $set: { kind: 'VENUE' } }
    );
    // Seed per-kind: only insert defaults when that kind's bucket is empty,
    // so admins can drain it without us re-seeding behind their back.
    const names = C.SERVICES_OFFERED.filter((n) => n !== 'Other');
    for (const kind of ['VENUE', 'HOST'] as const) {
      const count = await CrmServiceCatalogModel.countDocuments({ kind });
      if (count > 0) continue;
      await CrmServiceCatalogModel.insertMany(
        names.map((name, idx) => ({ name, kind, sort_order: idx, is_active: true })),
        { ordered: false }
      ).catch(() => undefined);
    }
  },

  // ---- Super category lookup (for VenueLead.super_category / HostLead.super_category) ----
  async superCategoryById(id: string) {
    if (!id) return null;
    const doc: any = await CategoryModel.findById(id).select('_id name slug icon level');
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      icon: doc.icon ?? '',
    };
  },

  /**
   * Lightweight host references for VenueLead.linked_hosts. Returns rows in
   * the same order as `ids` — missing/stale ids are simply skipped (we never
   * cascade-delete a venue when a host is removed; the venue just stops
   * pointing at it).
   */
  async linkedHostsFor(ids: any[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const oids = ids.map(toObjectIdOrNull).filter((v): v is Types.ObjectId => Boolean(v));
    if (oids.length === 0) return [];
    const docs = await HostLeadModel.find({ _id: { $in: oids } })
      .select('_id host_name host_type city lead_status priority')
      .lean();
    const byId = new Map(docs.map((d: any) => [String(d._id), d]));
    return oids
      .map((oid) => byId.get(String(oid)))
      .filter(Boolean)
      .map((d: any) => ({
        id: String(d._id),
        host_name: d.host_name,
        host_type: d.host_type ?? '',
        city: d.city ?? '',
        lead_status: d.lead_status ?? 'New',
        priority: d.priority ?? 'Medium',
      }));
  },

  // ---- Dynamic fields ----
  async listDynamicFields(entity?: C.CrmLeadEntityType | null, includeInactive = false) {
    const q: Record<string, any> = {};
    if (entity) q[C.DYNAMIC_FIELD_FLAG[entity]] = true;
    if (!includeInactive) q.is_active = { $ne: false };
    const docs = await CrmDynamicFieldModel.find(q).sort({ sort_order: 1, label: 1 });
    return docs.map(pubDynamicField);
  },
  async createDynamicField(input: any) {
    const name = (input.name ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!name) {
      throw new GraphQLError('Field key is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const existing = await CrmDynamicFieldModel.findOne({ name });
    if (existing) {
      throw new GraphQLError('A dynamic field with that key already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const doc = await CrmDynamicFieldModel.create({
      name,
      label: (input.label ?? name).trim(),
      kind: input.kind ?? 'text',
      options: normalizeOptions(input.options),
      multi: !!input.multi,
      placeholder: (input.placeholder ?? '').trim(),
      default_value: (input.default_value ?? '').trim(),
      hint: (input.hint ?? '').trim(),
      applies_to_venue: input.applies_to_venue !== false,
      applies_to_host: input.applies_to_host !== false,
      applies_to_ecomm: input.applies_to_ecomm === true,
      applies_to_creator: input.applies_to_creator === true,
      applies_to_community: input.applies_to_community === true,
      required: !!input.required,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active !== false,
    });
    return pubDynamicField(doc);
  },
  async updateDynamicField(id: string, input: any) {
    const doc = await CrmDynamicFieldModel.findById(id);
    if (!doc) notFound('Dynamic field');
    // `name` is the storage key; renaming it would orphan every existing
    // value in dynamic_values, so we accept the new label/kind/options but
    // never the new `name`.
    if (input.label !== undefined) doc.label = (input.label ?? '').trim();
    if (input.kind !== undefined) doc.kind = input.kind;
    if (input.options !== undefined) doc.options = normalizeOptions(input.options);
    if (input.multi !== undefined) doc.multi = !!input.multi;
    if (input.placeholder !== undefined) doc.placeholder = (input.placeholder ?? '').trim();
    if (input.default_value !== undefined) doc.default_value = (input.default_value ?? '').trim();
    if (input.hint !== undefined) doc.hint = (input.hint ?? '').trim();
    if (input.applies_to_venue !== undefined) doc.applies_to_venue = input.applies_to_venue;
    if (input.applies_to_host !== undefined) doc.applies_to_host = input.applies_to_host;
    if (input.applies_to_ecomm !== undefined) doc.applies_to_ecomm = input.applies_to_ecomm;
    if (input.applies_to_creator !== undefined) doc.applies_to_creator = input.applies_to_creator;
    if (input.applies_to_community !== undefined) doc.applies_to_community = input.applies_to_community;
    if (input.required !== undefined) doc.required = !!input.required;
    if (input.sort_order !== undefined) doc.sort_order = input.sort_order;
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    await doc.save();
    return pubDynamicField(doc);
  },
  async deleteDynamicField(id: string) {
    const doc = await CrmDynamicFieldModel.findByIdAndDelete(id);
    if (!doc) notFound('Dynamic field');
    return true;
  },
  // Persist a new vertical order. `ids` is the full ordered list of field
  // ids; each field's sort_order is set to its index so the table's
  // drag-and-drop order survives a refetch.
  async reorderDynamicFields(ids: string[]) {
    if (Array.isArray(ids) && ids.length) {
      await Promise.all(
        ids.map((id, index) =>
          CrmDynamicFieldModel.updateOne({ _id: id }, { $set: { sort_order: index } })
        )
      );
    }
    const docs = await CrmDynamicFieldModel.find({}).sort({ sort_order: 1, label: 1 });
    return docs.map(pubDynamicField);
  },

  /**
   * Append a manual NOTE entry to a lead's activity_log ("Manual Logs" tab).
   * Kept for existing callers; edit / delete / mentions live in manualLogService.
   */
  addManualLog(opts: {
    entity_type: C.CrmLeadEntityType;
    entity_id: string;
    summary?: string | null;
    body_html: string;
    body_text?: string | null;
    by?: string | null;
  }) {
    const { by, ...input } = opts;
    return manualLogService.create(input, { id: by ?? '', roles: [] });
  },

  // ---- Venue leads ----
  async listVenueLeads(filter: any) {
    const docs = await VenueLeadModel.find(buildQuery(filter, 'venue_name')).sort({ created_at: -1 });
    return docs.map(pub);
  },
  /** Server-side table page (search/filter/sort/paginate) for the venueLeadsTable query. */
  venueLeadsTable(input?: TableQueryInput | null, near?: LeadNearInput | null) {
    return leadTablePage('VENUE_LEAD', VENUE_LEAD_TABLE_CONFIG, input, near);
  },
  async getVenueLead(id: string) {
    const doc = await VenueLeadModel.findById(id);
    return doc ? pub(doc) : null;
  },
  async createVenueLead(input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input));
    await assertNoLeadDuplicates(safe, { entity_type: 'VENUE_LEAD' });
    const created = await VenueLeadModel.create({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) });
    await leadQualityService.refreshAfterSave('VENUE_LEAD', String(created._id), 'CREATE');
    return pub(created);
  },
  async updateVenueLead(id: string, input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input), { entity_type: 'VENUE_LEAD', id });
    await assertNoLeadDuplicates(safe, { entity_type: 'VENUE_LEAD', id });
    const updated = await VenueLeadModel.findByIdAndUpdate(
      id,
      leadUpdate({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) }, input),
      { new: true }
    );
    if (!updated) notFound('Venue lead');
    await leadQualityService.refreshAfterSave('VENUE_LEAD', id, 'UPDATE');
    return pub(updated);
  },
  async deleteVenueLead(id: string) {
    const doc = await VenueLeadModel.findByIdAndDelete(id);
    if (!doc) notFound('Venue lead');
    await removeLeadMedia('VENUE_LEAD', id);
    await leadQualityService.removeForLead('VENUE_LEAD', id);
    return true;
  },

  // ---- Host leads ----
  async listHostLeads(filter: any) {
    const docs = await HostLeadModel.find(buildQuery(filter, 'host_name')).sort({ created_at: -1 });
    return docs.map(pub);
  },
  /** Server-side table page (search/filter/sort/paginate) for the hostLeadsTable query. */
  hostLeadsTable(input?: TableQueryInput | null, near?: LeadNearInput | null) {
    return leadTablePage('HOST_LEAD', HOST_LEAD_TABLE_CONFIG, input, near);
  },
  async getHostLead(id: string) {
    const doc = await HostLeadModel.findById(id);
    return doc ? pub(doc) : null;
  },
  async createHostLead(input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input));
    await assertNoLeadDuplicates(safe, { entity_type: 'HOST_LEAD' });
    const created = await HostLeadModel.create({
      ...safe,
      preferred_event_date: parseDate(safe.preferred_event_date),
      next_follow_up_date: parseDate(safe.next_follow_up_date),
    });
    await leadQualityService.refreshAfterSave('HOST_LEAD', String(created._id), 'CREATE');
    return pub(created);
  },
  async updateHostLead(id: string, input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input), { entity_type: 'HOST_LEAD', id });
    await assertNoLeadDuplicates(safe, { entity_type: 'HOST_LEAD', id });
    const updated = await HostLeadModel.findByIdAndUpdate(
      id,
      leadUpdate(
        {
          ...safe,
          preferred_event_date: parseDate(safe.preferred_event_date),
          next_follow_up_date: parseDate(safe.next_follow_up_date),
        },
        input
      ),
      { new: true }
    );
    if (!updated) notFound('Host lead');
    await leadQualityService.refreshAfterSave('HOST_LEAD', id, 'UPDATE');
    return pub(updated);
  },
  async deleteHostLead(id: string) {
    const doc = await HostLeadModel.findByIdAndDelete(id);
    if (!doc) notFound('Host lead');
    await removeLeadMedia('HOST_LEAD', id);
    await leadQualityService.removeForLead('HOST_LEAD', id);
    return true;
  },

  // ---- Ecomm (seller) leads ----
  async listEcommLeads(filter: any) {
    const docs = await EcommLeadModel.find(buildQuery(filter, 'seller_name')).sort({ created_at: -1 });
    return docs.map(pub);
  },
  /** Server-side table page (search/filter/sort/paginate) for the ecommLeadsTable query. */
  ecommLeadsTable(input?: TableQueryInput | null, near?: LeadNearInput | null) {
    return leadTablePage('ECOMM_LEAD', ECOMM_LEAD_TABLE_CONFIG, input, near);
  },
  async getEcommLead(id: string) {
    const doc = await EcommLeadModel.findById(id);
    return doc ? pub(doc) : null;
  },
  async createEcommLead(input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input));
    await assertNoLeadDuplicates(safe, { entity_type: 'ECOMM_LEAD' });
    const created = await EcommLeadModel.create({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) });
    await leadQualityService.refreshAfterSave('ECOMM_LEAD', String(created._id), 'CREATE');
    return pub(created);
  },
  async updateEcommLead(id: string, input: any) {
    const safe = await applyAssignee(normaliseLeadInput(input), { entity_type: 'ECOMM_LEAD', id });
    await assertNoLeadDuplicates(safe, { entity_type: 'ECOMM_LEAD', id });
    const updated = await EcommLeadModel.findByIdAndUpdate(
      id,
      leadUpdate({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) }, input),
      { new: true }
    );
    if (!updated) notFound('Ecomm lead');
    await leadQualityService.refreshAfterSave('ECOMM_LEAD', id, 'UPDATE');
    return pub(updated);
  },
  async deleteEcommLead(id: string) {
    const doc = await EcommLeadModel.findByIdAndDelete(id);
    if (!doc) notFound('Ecomm lead');
    await removeLeadMedia('ECOMM_LEAD', id);
    await leadQualityService.removeForLead('ECOMM_LEAD', id);
    return true;
  },

  // ---- Comms actions (email via SMTP, call via Twilio) ----
  async emailVenueLeadContact(
    id: string,
    to: string,
    subject: string,
    body: string,
    providerId?: string | null,
    by?: string | null,
    attachments?: { url: string; name?: string | null }[] | null
  ) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await commsService.sendEmail({ to, subject, body, provider_id: providerId, attachments });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: 'VENUE_LEAD', provider_id: providerId, to, subject, body, result, by });
    return result;
  },
  async callVenueLeadContact(id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await commsService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: 'VENUE_LEAD', provider_id: providerId, to, result, by });
    return result;
  },
  async emailHostLeadContact(
    id: string,
    to: string,
    subject: string,
    body: string,
    providerId?: string | null,
    by?: string | null,
    attachments?: { url: string; name?: string | null }[] | null
  ) {
    const lead = await HostLeadModel.findById(id);
    if (!lead) notFound('Host lead');
    const result = await commsService.sendEmail({ to, subject, body, provider_id: providerId, attachments });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: 'HOST_LEAD', provider_id: providerId, to, subject, body, result, by });
    return result;
  },
  async callHostLeadContact(id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await HostLeadModel.findById(id);
    if (!lead) notFound('Host lead');
    const result = await commsService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: 'HOST_LEAD', provider_id: providerId, to, result, by });
    return result;
  },
  async emailEcommLeadContact(
    id: string,
    to: string,
    subject: string,
    body: string,
    providerId?: string | null,
    by?: string | null,
    attachments?: { url: string; name?: string | null }[] | null
  ) {
    const lead = await EcommLeadModel.findById(id);
    if (!lead) notFound('Ecomm lead');
    const result = await commsService.sendEmail({ to, subject, body, provider_id: providerId, attachments });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: 'ECOMM_LEAD', provider_id: providerId, to, subject, body, result, by });
    return result;
  },
  async callEcommLeadContact(id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await EcommLeadModel.findById(id);
    if (!lead) notFound('Ecomm lead');
    const result = await commsService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: 'ECOMM_LEAD', provider_id: providerId, to, result, by });
    return result;
  },
};
