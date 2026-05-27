import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueLeadModel, HostLeadModel, CrmServiceCatalogModel } from './crm.model';
import { CategoryModel } from '../category/category.model';
import { vobizService } from '../../services/vobiz/vobiz.service';
import { communicationLogService } from '../communicationLog/communicationLog.service';
import * as C from './crm.constants';

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

const toActivity = (a: any) => ({
  type: a.type,
  summary: a.summary ?? '',
  status: a.status ?? '',
  target: a.target ?? '',
  created_by: a.created_by ?? null,
  created_at: iso(a.created_at),
});

function pub(doc: any) {
  const o = doc?.toObject ? doc.toObject() : doc;
  if (!o) return null;
  return {
    ...o,
    id: String(o._id),
    super_category_id: o.super_category_id ? String(o.super_category_id) : null,
    contacts: (o.contacts ?? []).map(toContact),
    services_offered: (o.services_offered ?? []).map(toServiceOffered),
    activity_log: (o.activity_log ?? []).map(toActivity),
    next_follow_up_date: iso(o.next_follow_up_date),
    preferred_event_date: iso(o.preferred_event_date),
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
    kind: (o.kind ?? 'VENUE') as 'VENUE' | 'HOST',
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
    const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ [nameField]: rx }, { city: rx }, { 'contacts.mobile_number': rx }, { 'contacts.email': rx }];
  }
  return q;
}

const parseDate = (v?: string | null) => (v ? new Date(v) : null);

/**
 * Normalise the inbound input so it round-trips cleanly with Mongoose. Right
 * now this just coerces super_category_id (a string from the client) into an
 * ObjectId — passing the raw string causes Mongoose's CastError on the index.
 */
function normaliseLeadInput<T extends Record<string, any>>(input: T): T {
  const out: any = { ...input };
  if ('super_category_id' in out) {
    out.super_category_id = toObjectIdOrNull(out.super_category_id);
  }
  return out;
}

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

async function logAndAttachActivity(opts: {
  lead: any;
  type: 'EMAIL' | 'CALL';
  entity_type: 'VENUE_LEAD' | 'HOST_LEAD';
  provider_id?: string | null;
  to: string;
  subject?: string;
  body?: string;
  result: any;
  by?: string | null;
  contact_name?: string;
}) {
  const status = opts.result.ok
    ? opts.type === 'EMAIL'
      ? 'SENT'
      : 'INITIATED'
    : 'FAILED';
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

type ServiceKind = 'VENUE' | 'HOST';

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
    const [venueServices, hostServices] = await Promise.all([
      loadServiceNames('VENUE'),
      loadServiceNames('HOST'),
    ]);
    // services_offered_options stays around as the union of both — kept for
    // older callers / dashboard widgets that aggregate venue + host together.
    const unionSet = new Set<string>([...venueServices, ...hostServices]);
    const services = Array.from(unionSet);
    return {
      venue_types: C.VENUE_TYPES,
      space_types: C.SPACE_TYPES,
      venue_event_suitability: C.VENUE_EVENT_SUITABILITY,
      week_days: C.WEEK_DAYS,
      booking_notices: C.BOOKING_NOTICES,
      pricing_models: C.PRICING_MODELS,
      amenities: C.AMENITIES,
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
    const kind: ServiceKind = input.kind === 'HOST' ? 'HOST' : 'VENUE';
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
      is_active: input.is_active === false ? false : true,
    });
    return pubService(doc);
  },
  async updateService(
    id: string,
    input: { name: string; kind?: ServiceKind; sort_order?: number | null; is_active?: boolean | null }
  ) {
    const doc = await CrmServiceCatalogModel.findById(id);
    if (!doc) notFound('Service');
    const nextKind: ServiceKind = input.kind === 'HOST' ? 'HOST' : input.kind === 'VENUE' ? 'VENUE' : (doc.kind as ServiceKind);
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

  // ---- Venue leads ----
  async listVenueLeads(filter: any) {
    const docs = await VenueLeadModel.find(buildQuery(filter, 'venue_name')).sort({ created_at: -1 });
    return docs.map(pub);
  },
  async getVenueLead(id: string) {
    const doc = await VenueLeadModel.findById(id);
    return doc ? pub(doc) : null;
  },
  async createVenueLead(input: any) {
    const safe = normaliseLeadInput(input);
    const created = await VenueLeadModel.create({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) });
    return pub(created);
  },
  async updateVenueLead(id: string, input: any) {
    const safe = normaliseLeadInput(input);
    const updated = await VenueLeadModel.findByIdAndUpdate(
      id,
      { $set: { ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) } },
      { new: true }
    );
    if (!updated) notFound('Venue lead');
    return pub(updated);
  },
  async deleteVenueLead(id: string) {
    const doc = await VenueLeadModel.findByIdAndDelete(id);
    if (!doc) notFound('Venue lead');
    return true;
  },

  // ---- Host leads ----
  async listHostLeads(filter: any) {
    const docs = await HostLeadModel.find(buildQuery(filter, 'host_name')).sort({ created_at: -1 });
    return docs.map(pub);
  },
  async getHostLead(id: string) {
    const doc = await HostLeadModel.findById(id);
    return doc ? pub(doc) : null;
  },
  async createHostLead(input: any) {
    const safe = normaliseLeadInput(input);
    const created = await HostLeadModel.create({
      ...safe,
      preferred_event_date: parseDate(safe.preferred_event_date),
      next_follow_up_date: parseDate(safe.next_follow_up_date),
    });
    return pub(created);
  },
  async updateHostLead(id: string, input: any) {
    const safe = normaliseLeadInput(input);
    const updated = await HostLeadModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...safe,
          preferred_event_date: parseDate(safe.preferred_event_date),
          next_follow_up_date: parseDate(safe.next_follow_up_date),
        },
      },
      { new: true }
    );
    if (!updated) notFound('Host lead');
    return pub(updated);
  },
  async deleteHostLead(id: string) {
    const doc = await HostLeadModel.findByIdAndDelete(id);
    if (!doc) notFound('Host lead');
    return true;
  },

  // ---- Vobiz / comms actions ----
  async emailVenueLeadContact(
    id: string,
    to: string,
    subject: string,
    body: string,
    providerId?: string | null,
    by?: string | null
  ) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await vobizService.sendEmail({ to, subject, body, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: 'VENUE_LEAD', provider_id: providerId, to, subject, body, result, by });
    return result;
  },
  async callVenueLeadContact(id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await vobizService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: 'VENUE_LEAD', provider_id: providerId, to, result, by });
    return result;
  },
  async emailHostLeadContact(
    id: string,
    to: string,
    subject: string,
    body: string,
    providerId?: string | null,
    by?: string | null
  ) {
    const lead = await HostLeadModel.findById(id);
    if (!lead) notFound('Host lead');
    const result = await vobizService.sendEmail({ to, subject, body, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: 'HOST_LEAD', provider_id: providerId, to, subject, body, result, by });
    return result;
  },
  async callHostLeadContact(id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await HostLeadModel.findById(id);
    if (!lead) notFound('Host lead');
    const result = await vobizService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: 'HOST_LEAD', provider_id: providerId, to, result, by });
    return result;
  },
};
