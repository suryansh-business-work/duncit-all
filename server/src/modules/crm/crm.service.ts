import { GraphQLError } from 'graphql';
import { VenueLeadModel, HostLeadModel } from './crm.model';
import { vobizService } from '../../services/vobiz/vobiz.service';
import * as C from './crm.constants';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));

const toContact = (c: any) => ({
  name: c?.name ?? '',
  role: c?.role ?? '',
  mobile_number: c?.mobile_number ?? '',
  whatsapp_number: c?.whatsapp_number ?? '',
  email: c?.email ?? '',
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
    contacts: (o.contacts ?? []).map(toContact),
    activity_log: (o.activity_log ?? []).map(toActivity),
    next_follow_up_date: iso(o.next_follow_up_date),
    preferred_event_date: iso(o.preferred_event_date),
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
}

function buildQuery(filter: any, nameField: string) {
  const q: Record<string, any> = {};
  if (filter?.city) q.city = filter.city;
  if (filter?.lead_status) q.lead_status = filter.lead_status;
  if (filter?.priority) q.priority = filter.priority;
  if (filter?.search) {
    const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ [nameField]: rx }, { city: rx }, { 'contacts.mobile_number': rx }, { 'contacts.email': rx }];
  }
  return q;
}

const parseDate = (v?: string | null) => (v ? new Date(v) : null);

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

export const crmService = {
  config() {
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
    const created = await VenueLeadModel.create({ ...input, next_follow_up_date: parseDate(input.next_follow_up_date) });
    return pub(created);
  },
  async updateVenueLead(id: string, input: any) {
    const updated = await VenueLeadModel.findByIdAndUpdate(
      id,
      { $set: { ...input, next_follow_up_date: parseDate(input.next_follow_up_date) } },
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
    const created = await HostLeadModel.create({
      ...input,
      preferred_event_date: parseDate(input.preferred_event_date),
      next_follow_up_date: parseDate(input.next_follow_up_date),
    });
    return pub(created);
  },
  async updateHostLead(id: string, input: any) {
    const updated = await HostLeadModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          preferred_event_date: parseDate(input.preferred_event_date),
          next_follow_up_date: parseDate(input.next_follow_up_date),
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

  // ---- Vobiz actions on venue leads ----
  async emailVenueLeadContact(id: string, to: string, subject: string, body: string, by?: string | null) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await vobizService.sendEmail({ to, subject, body });
    lead.activity_log.push({ type: 'EMAIL', summary: subject, status: result.ok ? 'SENT' : 'FAILED', target: to, created_by: by ?? null } as any);
    await lead.save();
    return result;
  },
  async callVenueLeadContact(id: string, to: string, by?: string | null) {
    const lead = await VenueLeadModel.findById(id);
    if (!lead) notFound('Venue lead');
    const result = await vobizService.call({ to });
    lead.activity_log.push({ type: 'CALL', summary: 'Outbound call', status: result.ok ? 'INITIATED' : 'FAILED', target: to, created_by: by ?? null } as any);
    await lead.save();
    return result;
  },
};
