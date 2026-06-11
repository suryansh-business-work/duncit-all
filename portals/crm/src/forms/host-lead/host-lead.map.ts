import type { CrmContact, CrmServiceOffered, HostLead } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';
import { hostLeadInitialValues, type HostLeadFormValues } from './host-lead.types';

const toNum = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const numToStr = (value?: number | null): string => (value === null || value === undefined ? '' : String(value));

const cleanContacts = (contacts: CrmContact[]) =>
  contacts
    .filter((c) => c.name || c.mobile_number || c.email || c.whatsapp_number)
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      mobile_number: c.mobile_number.trim(),
      whatsapp_number: c.whatsapp_number.trim(),
      email: c.email.trim(),
    }));

const cleanServices = (services: CrmServiceOffered[]) =>
  services
    .filter((s) => s?.service?.trim())
    .map((s) => ({
      service: s.service.trim(),
      custom_name: (s.custom_name ?? '').trim(),
      description: (s.description ?? '').trim(),
    }));

/** Form values → GraphQL HostLeadInput. */
export function toHostLeadInput(v: HostLeadFormValues) {
  return {
    super_category_id: v.super_category_id.trim() || null,
    category_ids: v.category_ids,
    sub_category_ids: v.sub_category_ids,
    host_name: v.host_name.trim(),
    host_type: v.host_type,
    organization_name: v.organization_name.trim(),
    city: v.city.trim(),
    area: v.area.trim(),
    contacts: cleanContacts(v.contacts),
    interests: v.interests,
    expected_audience_size: v.expected_audience_size,
    frequency: v.frequency,
    budget_range: v.budget_range.trim(),
    revenue_models: v.revenue_models,
    need_venue: v.need_venue,
    need_vendor: v.need_vendor,
    preferred_event_date: v.preferred_event_date ? v.preferred_event_date.toISOString() : null,
    preferred_day: v.preferred_day,
    preferred_time_slot: v.preferred_time_slot.trim(),
    website: v.website.trim(),
    services_offered: cleanServices(v.services_offered),
    instagram_link: v.instagram_link.trim(),
    community_link: v.community_link.trim(),
    community_size: toNum(v.community_size),
    previous_events_hosted: v.previous_events_hosted,
    past_attendees: toNum(v.past_attendees),
    host_intent_scores: v.host_intent_scores,
    tags: (v.tags ?? []).map((t) => t.trim()).filter(Boolean),
    profile_photo_url: v.profile_photo_url.trim(),
    dynamic_values_json: v.dynamic_values_json || '{}',
    lead_source: v.lead_source,
    assigned_to: v.assigned_to.trim(),
    lead_status: v.lead_status,
    priority: v.priority,
    next_follow_up_date: v.next_follow_up_date ? v.next_follow_up_date.toISOString() : null,
    notes: v.notes.trim(),
  };
}

/** Existing HostLead → editable form values. */
export function fromHostLead(lead: HostLead): HostLeadFormValues {
  return {
    ...hostLeadInitialValues,
    super_category_id: lead.super_category_id ?? '',
    category_ids: lead.category_ids ?? [],
    sub_category_ids: lead.sub_category_ids ?? [],
    host_name: lead.host_name ?? '',
    host_type: lead.host_type ?? '',
    organization_name: lead.organization_name ?? '',
    city: lead.city ?? '',
    area: lead.area ?? '',
    contacts: lead.contacts?.length ? lead.contacts.map((c) => ({ ...emptyContact, ...c })) : [{ ...emptyContact }],
    interests: lead.interests ?? [],
    expected_audience_size: lead.expected_audience_size ?? '',
    frequency: lead.frequency ?? '',
    budget_range: lead.budget_range ?? '',
    revenue_models: lead.revenue_models ?? [],
    need_venue: !!lead.need_venue,
    need_vendor: !!lead.need_vendor,
    preferred_event_date: lead.preferred_event_date ? new Date(lead.preferred_event_date) : null,
    preferred_day: lead.preferred_day ?? '',
    preferred_time_slot: lead.preferred_time_slot ?? '',
    website: lead.website ?? '',
    services_offered: (lead.services_offered ?? []).map((s) => ({
      service: s.service ?? '',
      custom_name: s.custom_name ?? '',
      description: s.description ?? '',
    })),
    instagram_link: lead.instagram_link ?? '',
    community_link: lead.community_link ?? '',
    community_size: numToStr(lead.community_size),
    previous_events_hosted: !!lead.previous_events_hosted,
    past_attendees: numToStr(lead.past_attendees),
    host_intent_scores: lead.host_intent_scores ?? [],
    tags: lead.tags ?? [],
    profile_photo_url: lead.profile_photo_url ?? '',
    dynamic_values_json: lead.dynamic_values_json ?? '{}',
    lead_source: lead.lead_source ?? '',
    assigned_to: lead.assigned_to ?? '',
    lead_status: lead.lead_status ?? 'New',
    priority: lead.priority ?? 'Medium',
    next_follow_up_date: lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null,
    notes: lead.notes ?? '',
  };
}
