import type { CrmContact, CrmServiceOffered, VenueLead } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';
import { venueLeadInitialValues, type VenueLeadFormValues } from './venue-lead.types';

const toNum = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const numToStr = (value?: number | null): string => (value === null || value === undefined ? '' : String(value));
const linesToArray = (value: string): string[] => value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
const arrayToLines = (value?: string[] | null): string => (value ?? []).join('\n');

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

/** Form values → GraphQL VenueLeadInput. */
export function toVenueLeadInput(v: VenueLeadFormValues) {
  return {
    super_category_id: v.super_category_id.trim() || null,
    venue_name: v.venue_name.trim(),
    venue_types: v.venue_types,
    venue_description: v.venue_description.trim(),
    capacity_min: toNum(v.capacity_min),
    capacity_max: toNum(v.capacity_max),
    space_type: v.space_type,
    city: v.city.trim(),
    area: v.area.trim(),
    full_address: v.full_address.trim(),
    landmark: v.landmark.trim(),
    map_link: v.map_link.trim(),
    contacts: cleanContacts(v.contacts),
    event_suitability: v.event_suitability,
    available_days: v.available_days,
    available_time_slots: v.available_time_slots.trim(),
    booking_notice: v.booking_notice,
    pricing_models: v.pricing_models,
    expected_charges: toNum(v.expected_charges),
    security_deposit: toNum(v.security_deposit),
    gst_applicable: v.gst_applicable,
    invoice_available: v.invoice_available,
    amenities: v.amenities,
    photos: linesToArray(v.photos),
    videos: linesToArray(v.videos),
    brochure_url: v.brochure_url.trim(),
    website: v.website.trim(),
    services_offered: cleanServices(v.services_offered),
    linked_host_ids: v.linked_host_ids.filter(Boolean),
    lead_source: v.lead_source,
    assigned_to: v.assigned_to.trim(),
    lead_status: v.lead_status,
    priority: v.priority,
    next_follow_up_date: v.next_follow_up_date ? v.next_follow_up_date.toISOString() : null,
    remarks: v.remarks.trim(),
  };
}

/** Existing VenueLead → editable form values. */
export function fromVenueLead(lead: VenueLead): VenueLeadFormValues {
  return {
    ...venueLeadInitialValues,
    super_category_id: lead.super_category_id ?? '',
    venue_name: lead.venue_name ?? '',
    venue_types: lead.venue_types ?? [],
    venue_description: lead.venue_description ?? '',
    capacity_min: numToStr(lead.capacity_min),
    capacity_max: numToStr(lead.capacity_max),
    space_type: lead.space_type ?? '',
    city: lead.city ?? '',
    area: lead.area ?? '',
    full_address: lead.full_address ?? '',
    landmark: lead.landmark ?? '',
    map_link: lead.map_link ?? '',
    contacts: lead.contacts?.length ? lead.contacts.map((c) => ({ ...emptyContact, ...c })) : [{ ...emptyContact }],
    event_suitability: lead.event_suitability ?? [],
    available_days: lead.available_days ?? [],
    available_time_slots: lead.available_time_slots ?? '',
    booking_notice: lead.booking_notice ?? '',
    pricing_models: lead.pricing_models ?? [],
    expected_charges: numToStr(lead.expected_charges),
    security_deposit: numToStr(lead.security_deposit),
    gst_applicable: !!lead.gst_applicable,
    invoice_available: !!lead.invoice_available,
    amenities: lead.amenities ?? [],
    photos: arrayToLines(lead.photos),
    videos: arrayToLines(lead.videos),
    brochure_url: lead.brochure_url ?? '',
    website: lead.website ?? '',
    services_offered: (lead.services_offered ?? []).map((s) => ({
      service: s.service ?? '',
      custom_name: s.custom_name ?? '',
      description: s.description ?? '',
    })),
    linked_host_ids: lead.linked_host_ids ?? [],
    lead_source: lead.lead_source ?? '',
    assigned_to: lead.assigned_to ?? '',
    lead_status: lead.lead_status ?? 'New',
    priority: lead.priority ?? 'Medium',
    next_follow_up_date: lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null,
    remarks: lead.remarks ?? '',
  };
}
