import type { AiRow } from './AiRecordsTable';

type Entity = 'VENUE_LEAD' | 'HOST_LEAD';

const str = (v: unknown) => {
  if (v == null) return '';
  return typeof v === 'object' ? JSON.stringify(v) : String(v as string);
};

/** Parsed AI record → editable grid row (core fields surfaced for editing). */
export function recordToRow(rec: Record<string, any>, entity: Entity, index: number): AiRow {
  const c = Array.isArray(rec.contacts) ? rec.contacts[0] : undefined;
  return {
    _id: index,
    name: str(entity === 'VENUE_LEAD' ? rec.venue_name : rec.host_name),
    city: str(rec.city),
    full_address: str(rec.full_address),
    mobile: str(c?.mobile_number),
    email: str(c?.email),
    lead_status: str(rec.lead_status),
    priority: str(rec.priority),
    _raw: rec,
  };
}

/** Drop undefined/empty so we never send blanks for optional input fields. */
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function buildContact(row: AiRow): any[] {
  const raw = Array.isArray(row._raw.contacts) ? row._raw.contacts[0] ?? {} : {};
  if (!row.mobile && !row.email && !row.name) return [];
  return [
    compact({
      name: raw.name || row.name,
      role: raw.role || '',
      mobile_number: row.mobile,
      whatsapp_number: raw.whatsapp_number || '',
      email: row.email,
    }),
  ];
}

/** Build a GraphQL VenueLeadInput / HostLeadInput from an edited AI row. */
export function rowToInput(row: AiRow, entity: Entity): Record<string, any> {
  const r = row._raw;
  const contacts = buildContact(row);
  const common = { lead_status: row.lead_status || 'New', priority: row.priority || 'Medium', lead_source: r.lead_source };
  if (entity === 'VENUE_LEAD') {
    return compact({
      venue_name: row.name,
      city: row.city,
      full_address: row.full_address,
      area: r.area,
      venue_description: r.venue_description,
      space_type: r.space_type,
      venue_types: r.venue_types,
      event_suitability: r.event_suitability,
      amenities: r.amenities,
      capacity_min: typeof r.capacity_min === 'number' ? r.capacity_min : undefined,
      capacity_max: typeof r.capacity_max === 'number' ? r.capacity_max : undefined,
      website: r.website,
      contacts: contacts.length ? contacts : undefined,
      ...common,
    });
  }
  return compact({
    host_name: row.name,
    city: row.city,
    host_type: r.host_type,
    organization_name: r.organization_name,
    area: r.area,
    interests: r.interests,
    expected_audience_size: r.expected_audience_size,
    frequency: r.frequency,
    budget_range: r.budget_range,
    website: r.website,
    contacts: contacts.length ? contacts : undefined,
    ...common,
  });
}

/** Validate required fields client-side; return a message or null. */
export function rowError(row: AiRow, entity: Entity): string | null {
  if (!row.name.trim()) return 'Name is required';
  if (entity === 'VENUE_LEAD') {
    if (!row.city.trim()) return 'City is required';
    if (!row.full_address.trim()) return 'Address is required';
  }
  return null;
}
