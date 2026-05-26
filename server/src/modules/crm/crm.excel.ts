import * as XLSX from 'xlsx';
import { GraphQLError } from 'graphql';
import { VenueLeadModel, HostLeadModel } from './crm.model';

export type CrmExcelEntity = 'VENUE_LEAD' | 'HOST_LEAD';

const VENUE_COLUMNS = [
  'venue_name',
  'venue_types',
  'venue_description',
  'capacity_min',
  'capacity_max',
  'space_type',
  'city',
  'area',
  'full_address',
  'landmark',
  'map_link',
  'event_suitability',
  'available_days',
  'available_time_slots',
  'booking_notice',
  'pricing_models',
  'expected_charges',
  'security_deposit',
  'gst_applicable',
  'invoice_available',
  'amenities',
  'lead_source',
  'assigned_to',
  'lead_status',
  'priority',
  'next_follow_up_date',
  'remarks',
  'primary_contact_name',
  'primary_contact_role',
  'primary_contact_mobile',
  'primary_contact_whatsapp',
  'primary_contact_email',
] as const;

const HOST_COLUMNS = [
  'host_name',
  'host_type',
  'organization_name',
  'city',
  'area',
  'interests',
  'expected_audience_size',
  'frequency',
  'budget_range',
  'revenue_models',
  'need_venue',
  'need_vendor',
  'preferred_event_date',
  'preferred_day',
  'preferred_time_slot',
  'instagram_link',
  'community_link',
  'community_size',
  'previous_events_hosted',
  'past_attendees',
  'host_intent_scores',
  'lead_source',
  'assigned_to',
  'lead_status',
  'priority',
  'next_follow_up_date',
  'notes',
  'primary_contact_name',
  'primary_contact_role',
  'primary_contact_mobile',
  'primary_contact_whatsapp',
  'primary_contact_email',
] as const;

const INSTRUCTIONS = [
  ['Instructions'],
  ['1. Fill one lead per row. Required columns are highlighted in the column header.'],
  ['2. Multi-value columns (venue_types, amenities, etc.) accept comma-separated values, e.g. "Wedding, Birthday".'],
  ['3. Dates use ISO format YYYY-MM-DD. Booleans accept Yes/No, true/false, 1/0.'],
  ['4. Up to 1 primary contact per row. Add additional contacts later from the lead editor.'],
  ['5. Leave optional cells blank — do NOT type "N/A" or "-".'],
];

const splitCsv = (value: unknown): string[] =>
  String(value ?? '')
    .split(/[,\n;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toBool = (value: unknown): boolean => {
  const s = String(value ?? '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1'].includes(s);
};

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function rowToContact(row: Record<string, any>) {
  const name = String(row.primary_contact_name ?? '').trim();
  const mobile = String(row.primary_contact_mobile ?? '').trim();
  if (!name && !mobile) return null;
  return {
    name,
    role: String(row.primary_contact_role ?? '').trim(),
    mobile_number: mobile,
    whatsapp_number: String(row.primary_contact_whatsapp ?? '').trim(),
    email: String(row.primary_contact_email ?? '').trim(),
  };
}

function buildTemplateWorkbook(entity: CrmExcelEntity): XLSX.WorkBook {
  const columns = entity === 'VENUE_LEAD' ? VENUE_COLUMNS : HOST_COLUMNS;
  const wb = XLSX.utils.book_new();
  const sample = entity === 'VENUE_LEAD'
    ? {
        venue_name: 'Sample Banquet Hall',
        venue_types: 'Banquet, Lounge',
        city: 'Bengaluru',
        full_address: '123 MG Road, Bengaluru, KA 560001',
        lead_status: 'New',
        priority: 'Medium',
        primary_contact_name: 'Rohan Mehta',
        primary_contact_mobile: '9876543210',
        primary_contact_email: 'rohan@example.com',
      }
    : {
        host_name: 'Sample Pod Host',
        host_type: 'Individual',
        city: 'Bengaluru',
        lead_status: 'New',
        priority: 'Medium',
        primary_contact_name: 'Priya Kapoor',
        primary_contact_mobile: '9876543210',
      };
  const data: any[][] = [
    columns.slice(),
    columns.map((col) => (sample as any)[col] ?? ''),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const instr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  XLSX.utils.book_append_sheet(wb, instr, 'Instructions');
  return wb;
}

export function buildTemplateBase64(entity: CrmExcelEntity): string {
  const wb = buildTemplateWorkbook(entity);
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

export async function exportLeadsBase64(entity: CrmExcelEntity): Promise<string> {
  const docs: any[] = entity === 'VENUE_LEAD'
    ? await VenueLeadModel.find().sort({ created_at: -1 }).lean()
    : await HostLeadModel.find().sort({ created_at: -1 }).lean();
  const rows = docs.map((doc: any) => {
    const c = (doc.contacts ?? [])[0] ?? {};
    const base: Record<string, any> = {
      ...doc,
      venue_types: (doc.venue_types ?? []).join(', '),
      event_suitability: (doc.event_suitability ?? []).join(', '),
      available_days: (doc.available_days ?? []).join(', '),
      pricing_models: (doc.pricing_models ?? []).join(', '),
      amenities: (doc.amenities ?? []).join(', '),
      interests: (doc.interests ?? []).join(', '),
      revenue_models: (doc.revenue_models ?? []).join(', '),
      host_intent_scores: (doc.host_intent_scores ?? []).join(', '),
      primary_contact_name: c.name ?? '',
      primary_contact_role: c.role ?? '',
      primary_contact_mobile: c.mobile_number ?? '',
      primary_contact_whatsapp: c.whatsapp_number ?? '',
      primary_contact_email: c.email ?? '',
    };
    return base;
  });
  const columns = entity === 'VENUE_LEAD' ? VENUE_COLUMNS : HOST_COLUMNS;
  const data: any[][] = [
    columns.slice(),
    ...rows.map((row: Record<string, any>) => columns.map((col) => row[col] ?? '')),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), entity === 'VENUE_LEAD' ? 'Venue Leads' : 'Host Leads');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export async function importLeads(entity: CrmExcelEntity, base64: string): Promise<ImportResult> {
  if (!base64) throw new GraphQLError('No file content provided', { extensions: { code: 'BAD_USER_INPUT' } });
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(base64, { type: 'base64' });
  } catch {
    throw new GraphQLError('Could not read the uploaded Excel file', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const sheetName = wb.SheetNames.find((name) => name.toLowerCase().includes('template') || name.toLowerCase().includes('lead')) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const result: ImportResult = { inserted: 0, failed: 0, errors: [] };
  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];
    const contact = rowToContact(row);
    const contacts = contact ? [contact] : [];
    try {
      if (entity === 'VENUE_LEAD') {
        const name = String(row.venue_name ?? '').trim();
        const city = String(row.city ?? '').trim();
        const address = String(row.full_address ?? '').trim();
        if (!name || !city || !address) throw new Error('venue_name, city and full_address are required');
        await VenueLeadModel.create({
          venue_name: name,
          venue_types: splitCsv(row.venue_types),
          venue_description: String(row.venue_description ?? '').trim(),
          capacity_min: toNumber(row.capacity_min),
          capacity_max: toNumber(row.capacity_max),
          space_type: String(row.space_type ?? '').trim(),
          city,
          area: String(row.area ?? '').trim(),
          full_address: address,
          landmark: String(row.landmark ?? '').trim(),
          map_link: String(row.map_link ?? '').trim(),
          contacts,
          event_suitability: splitCsv(row.event_suitability),
          available_days: splitCsv(row.available_days),
          available_time_slots: String(row.available_time_slots ?? '').trim(),
          booking_notice: String(row.booking_notice ?? '').trim(),
          pricing_models: splitCsv(row.pricing_models),
          expected_charges: toNumber(row.expected_charges),
          security_deposit: toNumber(row.security_deposit),
          gst_applicable: toBool(row.gst_applicable),
          invoice_available: toBool(row.invoice_available),
          amenities: splitCsv(row.amenities),
          lead_source: String(row.lead_source ?? '').trim(),
          assigned_to: String(row.assigned_to ?? '').trim(),
          lead_status: String(row.lead_status ?? 'New').trim() || 'New',
          priority: String(row.priority ?? 'Medium').trim() || 'Medium',
          remarks: String(row.remarks ?? '').trim(),
        });
      } else {
        const name = String(row.host_name ?? '').trim();
        if (!name) throw new Error('host_name is required');
        await HostLeadModel.create({
          host_name: name,
          host_type: String(row.host_type ?? '').trim(),
          organization_name: String(row.organization_name ?? '').trim(),
          city: String(row.city ?? '').trim(),
          area: String(row.area ?? '').trim(),
          contacts,
          interests: splitCsv(row.interests),
          expected_audience_size: String(row.expected_audience_size ?? '').trim(),
          frequency: String(row.frequency ?? '').trim(),
          budget_range: String(row.budget_range ?? '').trim(),
          revenue_models: splitCsv(row.revenue_models),
          need_venue: toBool(row.need_venue),
          need_vendor: toBool(row.need_vendor),
          preferred_day: String(row.preferred_day ?? '').trim(),
          preferred_time_slot: String(row.preferred_time_slot ?? '').trim(),
          instagram_link: String(row.instagram_link ?? '').trim(),
          community_link: String(row.community_link ?? '').trim(),
          community_size: toNumber(row.community_size),
          previous_events_hosted: toBool(row.previous_events_hosted),
          past_attendees: toNumber(row.past_attendees),
          host_intent_scores: splitCsv(row.host_intent_scores),
          lead_source: String(row.lead_source ?? '').trim(),
          assigned_to: String(row.assigned_to ?? '').trim(),
          lead_status: String(row.lead_status ?? 'New').trim() || 'New',
          priority: String(row.priority ?? 'Medium').trim() || 'Medium',
          notes: String(row.notes ?? '').trim(),
        });
      }
      result.inserted += 1;
    } catch (err: any) {
      result.failed += 1;
      result.errors.push({ row: idx + 2, message: err?.message ?? 'Unknown error' });
    }
  }
  return result;
}
