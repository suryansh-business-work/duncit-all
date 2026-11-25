/**
 * The CRM lead listings and the reminders calendar — the rules behind Fill
 * with AI (an AI-extracted record → an editable row → the create input), the
 * Nearby leads Distance column and a reminder's urgency. Shared by the CRM
 * portal and the Duncit CRM app, so both turn the same text into the same
 * leads and colour the same reminder the same way.
 */

/** The translator a rule that words a message takes (each surface passes its own). */
export type CrmLeadListTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** The lead kinds Fill with AI creates. */
export type CrmAiLeadEntity = 'VENUE_LEAD' | 'HOST_LEAD';

/** One AI-extracted lead, as the review step edits it. */
export interface CrmAiRow {
  _id: number;
  name: string;
  city: string;
  full_address: string;
  mobile: string;
  email: string;
  lead_status: string;
  priority: string;
  /** The full parsed record, carried through to build the create input. */
  _raw: Record<string, unknown>;
  /** Why the row could not be saved, shown on it after a failed Confirm. */
  _error?: string;
}

type Loose = Record<string, unknown>;

const isRecord = (value: unknown): value is Loose => typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

/** The record's first contact, or an empty one. */
const firstContact = (record: Loose): Loose => {
  const contacts = record.contacts;
  return Array.isArray(contacts) && isRecord(contacts[0]) ? contacts[0] : {};
};

/** Parsed AI record → editable row (the core fields surfaced for editing). */
export function crmAiRecordToRow(record: Loose, entity: CrmAiLeadEntity, index: number): CrmAiRow {
  const contact = firstContact(record);
  return {
    _id: index,
    name: str(entity === 'VENUE_LEAD' ? record.venue_name : record.host_name),
    city: str(record.city),
    full_address: str(record.full_address),
    mobile: str(contact.mobile_number),
    email: str(contact.email),
    lead_status: str(record.lead_status),
    priority: str(record.priority),
    _raw: record,
  };
}

/** Drop empty values, so a blank never overwrites an optional field. */
function compact(values: Loose): Loose {
  const out: Loose = {};
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/** The contact block is all-or-nothing: no name, number and email means no contact. */
function buildContacts(row: CrmAiRow): Loose[] | undefined {
  if (!row.mobile && !row.email && !row.name) return undefined;
  const raw = firstContact(row._raw);
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

const numberOrUndefined = (value: unknown) => (typeof value === 'number' ? value : undefined);

/** The VenueLeadInput / HostLeadInput an edited row creates. */
export function crmAiRowToInput(row: CrmAiRow, entity: CrmAiLeadEntity): Loose {
  const r = row._raw;
  const common = {
    contacts: buildContacts(row),
    lead_status: row.lead_status || 'New',
    priority: row.priority || 'Medium',
    lead_source: r.lead_source,
  };
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
      capacity_min: numberOrUndefined(r.capacity_min),
      capacity_max: numberOrUndefined(r.capacity_max),
      website: r.website,
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
    ...common,
  });
}

/** What a row is missing before it can be saved, worded — or null. A venue needs a city and an address. */
export function crmAiRowError(row: CrmAiRow, entity: CrmAiLeadEntity, t: CrmLeadListTranslate): string | null {
  if (!row.name.trim()) return t('crm.aiFill.nameRequired');
  if (entity === 'VENUE_LEAD') {
    if (!row.city.trim()) return t('crm.aiFill.cityRequired');
    if (!row.full_address.trim()) return t('crm.aiFill.addressRequired');
  }
  return null;
}

/** The records in the AI's answer: a JSON list, or `{ records: [...] }`. Throws on text that is not JSON. */
export function crmAiParseRecords(raw: string | null | undefined): Loose[] {
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  const list = isRecord(parsed) ? parsed.records : parsed;
  return Array.isArray(list) ? list.filter(isRecord) : [];
}

/** A nearby lead's distance: one decimal under 10 km, whole kilometres beyond. */
export const crmFormatKm = (km: number): string => (km < 10 ? km.toFixed(1) : String(Math.round(km)));

/** How a nearby lead was placed on the map — short label and full wording, as literal keys. */
export const CRM_GEO_PRECISION_KEY: Readonly<Record<string, { short: string; long: string }>> = {
  PIN: { short: 'crm.nearby.precisionPinShort', long: 'crm.nearby.precisionPin' },
  AREA: { short: 'crm.nearby.precisionAreaShort', long: 'crm.nearby.precisionArea' },
  CITY: { short: 'crm.nearby.precisionCityShort', long: 'crm.nearby.precisionCity' },
};

/** A reminder or follow-up's urgency on the calendar. */
export type CrmDueUrgency = 'done' | 'overdue' | 'soon' | 'later';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Done; overdue once its time has come; due soon within a day; otherwise later. */
export function crmDueUrgency(due: Date, done: boolean, now: number = Date.now()): CrmDueUrgency {
  if (done) return 'done';
  const diff = due.getTime() - now;
  if (diff <= 0) return 'overdue';
  if (diff <= DAY_MS) return 'soon';
  return 'later';
}

/** One lead field an Excel import maps a spreadsheet column to — mirrors the server's VENUE/HOST columns. */
export interface CrmImportField {
  field: string;
  label: string;
  required?: boolean;
}

/** "services_offered_json" → "Services offered (JSON)": the field's own name, readable. */
const importLabel = (field: string) =>
  field
    .split('_')
    .join(' ')
    .replace(/\bjson\b/i, '(JSON)')
    .replace(/^\w/, (c: string) => c.toUpperCase());

const importField = (field: string, required = false): CrmImportField => ({ field, label: importLabel(field), required });

const CONTACT_IMPORT_FIELDS = [
  'primary_contact_name',
  'primary_contact_role',
  'primary_contact_mobile',
  'primary_contact_whatsapp',
  'primary_contact_email',
];

export const CRM_VENUE_IMPORT_FIELDS: readonly CrmImportField[] = [
  importField('venue_name', true),
  importField('city', true),
  importField('full_address', true),
  ...[
    'super_category_id', 'venue_types', 'venue_description', 'capacity_min', 'capacity_max', 'space_type', 'area',
    'landmark', 'map_link', 'event_suitability', 'available_days', 'available_time_slots', 'booking_notice',
    'pricing_models', 'expected_charges', 'security_deposit', 'gst_applicable', 'invoice_available', 'amenities',
    'website', 'services_offered_json', 'lead_source', 'assigned_to', 'lead_status', 'priority',
    'next_follow_up_date', 'remarks', ...CONTACT_IMPORT_FIELDS,
  ].map((field) => importField(field)),
];

export const CRM_HOST_IMPORT_FIELDS: readonly CrmImportField[] = [
  importField('host_name', true),
  ...[
    'super_category_id', 'host_type', 'organization_name', 'city', 'area', 'interests', 'expected_audience_size',
    'frequency', 'budget_range', 'revenue_models', 'need_venue', 'need_vendor', 'preferred_event_date',
    'preferred_day', 'preferred_time_slot', 'instagram_link', 'community_link', 'community_size',
    'previous_events_hosted', 'past_attendees', 'host_intent_scores', 'website', 'services_offered_json',
    'lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'notes', ...CONTACT_IMPORT_FIELDS,
  ].map((field) => importField(field)),
];

export const crmImportFieldsFor = (entity: CrmAiLeadEntity): readonly CrmImportField[] =>
  entity === 'VENUE_LEAD' ? CRM_VENUE_IMPORT_FIELDS : CRM_HOST_IMPORT_FIELDS;

const normHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Each field matched to the header that reads the same (by its name, then its label), ignoring case and spacing. */
export function crmImportAutoMatch(fields: readonly CrmImportField[], headers: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const byNorm = new Map(headers.map((header) => [normHeader(header), header]));
  for (const field of fields) {
    const match = byNorm.get(normHeader(field.field)) ?? byNorm.get(normHeader(field.label));
    if (match) out[field.field] = match;
  }
  return out;
}

/** Every required field has a column. */
export const crmImportReady = (fields: readonly CrmImportField[], mapping: Readonly<Record<string, string>>) =>
  fields.filter((field) => field.required).every((field) => Boolean(mapping[field.field]));

/** The import mutation's `mapping`: only the fields given a column. */
export const crmImportMappingInput = (mapping: Readonly<Record<string, string>>) =>
  Object.entries(mapping)
    .filter(([, header]) => header)
    .map(([field, header]) => ({ field, header }));

/** A CRM reminder as the calendar reads it. */
export interface CrmCalendarReminder {
  id: string;
  entity_type: string;
  lead_id?: string | null;
  title: string;
  due_at: string;
  notes?: string | null;
  status: string;
}

/** A venue or host lead's next follow-up, shown read-only on the calendar. */
export interface CrmCalendarLead {
  id: string;
  name: string;
  next_follow_up_date?: string | null;
}

export type CrmCalendarEntityFilter = 'ALL' | 'VENUE_LEAD' | 'HOST_LEAD';
export type CrmCalendarStatusFilter = 'ALL' | 'PENDING' | 'DONE';

export interface CrmCalendarEvent<R extends CrmCalendarReminder> {
  id: string;
  date: Date;
  title: string;
  kind: 'reminder' | 'followup';
  status?: R['status'];
  entity: R['entity_type'] | 'VENUE_LEAD' | 'HOST_LEAD';
  leadId?: string | null;
  /** The linked venue or host lead's name, when known. */
  leadName?: string | null;
  notes?: string | null;
  reminder?: R;
}

const validDate = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The reminders calendar's events, soonest first: every reminder (editable)
 * and each venue and host lead's next follow-up (read-only), filtered by kind
 * and reminder status. Follow-ups are leads, not reminders, so a Done-only
 * calendar leaves them out.
 */
export function crmCalendarEvents<R extends CrmCalendarReminder>(input: {
  reminders: readonly R[];
  venueLeads: readonly CrmCalendarLead[];
  hostLeads: readonly CrmCalendarLead[];
  entity: CrmCalendarEntityFilter;
  status: CrmCalendarStatusFilter;
  followUpTitle: (name: string) => string;
}): CrmCalendarEvent<R>[] {
  const { entity, status } = input;
  const names = {
    VENUE_LEAD: new Map(input.venueLeads.map((lead) => [lead.id, lead.name])),
    HOST_LEAD: new Map(input.hostLeads.map((lead) => [lead.id, lead.name])),
  };
  const nameFor = (kind: string, id?: string | null) =>
    kind === 'VENUE_LEAD' || kind === 'HOST_LEAD' ? (names[kind].get(id ?? '') ?? null) : null;
  const out: CrmCalendarEvent<R>[] = [];
  for (const r of input.reminders) {
    const date = validDate(r.due_at);
    if (!date || (entity !== 'ALL' && r.entity_type !== entity)) continue;
    out.push({
      id: `r-${r.id}`,
      date,
      title: r.title,
      kind: 'reminder',
      status: r.status,
      entity: r.entity_type,
      leadId: r.lead_id,
      leadName: nameFor(r.entity_type, r.lead_id),
      notes: r.notes,
      reminder: r,
    });
  }
  const addFollowUps = (leads: readonly CrmCalendarLead[], kind: 'VENUE_LEAD' | 'HOST_LEAD') => {
    if (status === 'DONE' || (entity !== 'ALL' && entity !== kind)) return;
    for (const lead of leads) {
      const date = validDate(lead.next_follow_up_date);
      if (!date) continue;
      out.push({
        id: `f-${kind}-${lead.id}`,
        date,
        title: input.followUpTitle(lead.name),
        kind: 'followup',
        entity: kind,
        leadId: lead.id,
        leadName: lead.name,
      });
    }
  };
  addFollowUps(input.venueLeads, 'VENUE_LEAD');
  addFollowUps(input.hostLeads, 'HOST_LEAD');
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
