/** Canonical import fields per lead kind — mirrors the server VENUE/HOST columns. */
export interface ImportField {
  field: string;
  label: string;
  required?: boolean;
}

const label = (field: string) =>
  field.replace(/_/g, ' ').replace(/\bjson\b/i, '(JSON)').replace(/^\w/, (c) => c.toUpperCase());

const f = (field: string, required = false): ImportField => ({ field, label: label(field), required });

export const VENUE_IMPORT_FIELDS: ImportField[] = [
  f('venue_name', true), f('city', true), f('full_address', true),
  f('super_category_id'), f('venue_types'), f('venue_description'), f('capacity_min'), f('capacity_max'),
  f('space_type'), f('area'), f('landmark'), f('map_link'), f('event_suitability'), f('available_days'),
  f('available_time_slots'), f('booking_notice'), f('pricing_models'), f('expected_charges'), f('security_deposit'),
  f('gst_applicable'), f('invoice_available'), f('amenities'), f('website'), f('services_offered_json'),
  f('lead_source'), f('assigned_to'), f('lead_status'), f('priority'), f('next_follow_up_date'), f('remarks'),
  f('primary_contact_name'), f('primary_contact_role'), f('primary_contact_mobile'), f('primary_contact_whatsapp'), f('primary_contact_email'),
];

export const HOST_IMPORT_FIELDS: ImportField[] = [
  f('host_name', true),
  f('super_category_id'), f('host_type'), f('organization_name'), f('city'), f('area'), f('interests'),
  f('expected_audience_size'), f('frequency'), f('budget_range'), f('revenue_models'), f('need_venue'), f('need_vendor'),
  f('preferred_event_date'), f('preferred_day'), f('preferred_time_slot'), f('instagram_link'), f('community_link'),
  f('community_size'), f('previous_events_hosted'), f('past_attendees'), f('host_intent_scores'), f('website'),
  f('services_offered_json'), f('lead_source'), f('assigned_to'), f('lead_status'), f('priority'), f('next_follow_up_date'), f('notes'),
  f('primary_contact_name'), f('primary_contact_role'), f('primary_contact_mobile'), f('primary_contact_whatsapp'), f('primary_contact_email'),
];

export const importFieldsFor = (entity: 'VENUE_LEAD' | 'HOST_LEAD') =>
  entity === 'VENUE_LEAD' ? VENUE_IMPORT_FIELDS : HOST_IMPORT_FIELDS;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Auto-match each field to the closest header by normalised name. */
export function autoMatch(fields: ImportField[], headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  for (const fld of fields) {
    const exact = byNorm.get(norm(fld.field));
    const byLabel = byNorm.get(norm(fld.label));
    if (exact) out[fld.field] = exact;
    else if (byLabel) out[fld.field] = byLabel;
  }
  return out;
}
