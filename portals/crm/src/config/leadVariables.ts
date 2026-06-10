import type { HostLead, VenueLead } from '../api/crm.types';

/** A reusable CRM template variable: its slug (used as {{ slug }}) + a label. */
export interface LeadVariable {
  slug: string;
  label: string;
}

/**
 * Catalogue of variables a CRM email template can use, per lead kind. The
 * `slug` is the {{ placeholder }} key; values are pulled from the lead at send
 * time (see `venueVariableValues` / `hostVariableValues`). Single source of
 * truth for the editor's "Available for …" lists and compose auto-fill.
 */
export const VENUE_VARIABLES: LeadVariable[] = [
  { slug: 'venue_name', label: 'Venue name' },
  { slug: 'super_category', label: 'Super category' },
  { slug: 'space_type', label: 'Space type' },
  { slug: 'city', label: 'City' },
  { slug: 'area', label: 'Area' },
  { slug: 'full_address', label: 'Address' },
  { slug: 'contact_name', label: 'Contact name' },
  { slug: 'contact_email', label: 'Contact email' },
  { slug: 'contact_mobile', label: 'Contact mobile' },
  { slug: 'website', label: 'Website' },
  { slug: 'lead_status', label: 'Lead status' },
  { slug: 'priority', label: 'Priority' },
];

export const HOST_VARIABLES: LeadVariable[] = [
  { slug: 'host_name', label: 'Host name' },
  { slug: 'organization_name', label: 'Organization' },
  { slug: 'host_type', label: 'Host type' },
  { slug: 'super_category', label: 'Super category' },
  { slug: 'city', label: 'City' },
  { slug: 'area', label: 'Area' },
  { slug: 'contact_name', label: 'Contact name' },
  { slug: 'contact_email', label: 'Contact email' },
  { slug: 'contact_mobile', label: 'Contact mobile' },
  { slug: 'website', label: 'Website' },
  { slug: 'lead_status', label: 'Lead status' },
  { slug: 'priority', label: 'Priority' },
];

export const leadVariablesFor = (entity: 'VENUE_LEAD' | 'HOST_LEAD') =>
  entity === 'HOST_LEAD' ? HOST_VARIABLES : VENUE_VARIABLES;

const s = (v: unknown) => (v == null ? '' : String(v));

/** Slug → value map from a venue lead (blank when the field is empty). */
export function venueVariableValues(lead: VenueLead): Record<string, string> {
  const c = lead.contacts?.[0];
  return {
    venue_name: s(lead.venue_name),
    super_category: s(lead.super_category?.name),
    space_type: s(lead.space_type),
    city: s(lead.city),
    area: s(lead.area),
    full_address: s(lead.full_address),
    contact_name: s(c?.name),
    contact_email: s(c?.email),
    contact_mobile: s(c?.mobile_number),
    website: s(lead.website),
    lead_status: s(lead.lead_status),
    priority: s(lead.priority),
  };
}

/** Slug → value map from a host lead (blank when the field is empty). */
export function hostVariableValues(lead: HostLead): Record<string, string> {
  const c = lead.contacts?.[0];
  return {
    host_name: s(lead.host_name),
    organization_name: s(lead.organization_name),
    host_type: s(lead.host_type),
    super_category: s(lead.super_category?.name),
    city: s(lead.city),
    area: s(lead.area),
    contact_name: s(c?.name),
    contact_email: s(c?.email),
    contact_mobile: s(c?.mobile_number),
    website: s(lead.website),
    lead_status: s(lead.lead_status),
    priority: s(lead.priority),
  };
}
