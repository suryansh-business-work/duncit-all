import { describe, expect, it } from 'vitest';

import {
  CRM_GEO_PRECISION_KEY,
  CRM_HOST_IMPORT_FIELDS,
  CRM_VENUE_IMPORT_FIELDS,
  crmImportAutoMatch,
  crmImportFieldsFor,
  crmImportMappingInput,
  crmImportReady,
  crmAiParseRecords,
  crmCalendarEvents,
  crmAiRecordToRow,
  crmAiRowError,
  crmAiRowToInput,
  crmDueUrgency,
  crmFormatKm,
} from '../src/crm-lead-lists';

/** Echoes the key, so each assertion names the message a surface shows. */
const t = (key: string) => key;

const venueRecord = {
  venue_name: 'Sunset Courts',
  city: 'Bengaluru',
  full_address: '12 Church Street',
  area: 'Central',
  venue_types: ['SPORTS'],
  capacity_min: 4,
  capacity_max: 24,
  website: 'https://sunsetcourts.example',
  lead_source: 'AI_EXTRACTION',
  lead_status: 'New',
  priority: 'High',
  contacts: [{ name: 'Meera N', role: 'Manager', mobile_number: '9000000001', whatsapp_number: '9000000001', email: 'meera@sunsetcourts.example' }],
};

const hostRecord = {
  host_name: 'Vikram N',
  city: 'Bengaluru',
  organization_name: 'Weekend Badminton',
  frequency: 'WEEKLY',
  website: '',
  contacts: [{ mobile_number: '9000000002', email: 'vikram@duncit.com' }],
};

const contactsOf = (input: Record<string, unknown>) => input.contacts as Record<string, unknown>[];

describe('crmAiRecordToRow', () => {
  it('surfaces the fields a CRM agent edits, keeping the record underneath', () => {
    const row = crmAiRecordToRow(venueRecord, 'VENUE_LEAD', 0);
    expect(row).toMatchObject({
      _id: 0,
      name: 'Sunset Courts',
      city: 'Bengaluru',
      full_address: '12 Church Street',
      mobile: '9000000001',
      email: 'meera@sunsetcourts.example',
      lead_status: 'New',
      priority: 'High',
    });
    expect(row._raw).toBe(venueRecord);
    expect(crmAiRecordToRow(hostRecord, 'HOST_LEAD', 1).name).toBe('Vikram N');
  });

  it('writes numbers, booleans and objects the model put in a text field as text', () => {
    expect(crmAiRecordToRow({ venue_name: 12, city: true }, 'VENUE_LEAD', 0)).toMatchObject({ name: '12', city: 'true' });
    expect(crmAiRecordToRow({ venue_name: { first: 'Sunset' } }, 'VENUE_LEAD', 0).name).toBe('{"first":"Sunset"}');
  });

  it('reads missing or malformed contacts as empty strings', () => {
    expect(crmAiRecordToRow({ venue_name: 'X' }, 'VENUE_LEAD', 0)).toMatchObject({ mobile: '', email: '' });
    expect(crmAiRecordToRow({ venue_name: 'X', contacts: 'Meera' }, 'VENUE_LEAD', 0).mobile).toBe('');
    expect(crmAiRecordToRow({ venue_name: 'X', contacts: ['Meera'] }, 'VENUE_LEAD', 0).mobile).toBe('');
  });
});

describe('crmAiRowToInput', () => {
  const venueRow = crmAiRecordToRow(venueRecord, 'VENUE_LEAD', 0);
  const hostRow = crmAiRecordToRow(hostRecord, 'HOST_LEAD', 0);

  it('builds a venue lead from the row and the record behind it', () => {
    expect(crmAiRowToInput(venueRow, 'VENUE_LEAD')).toMatchObject({
      venue_name: 'Sunset Courts',
      full_address: '12 Church Street',
      area: 'Central',
      venue_types: ['SPORTS'],
      capacity_min: 4,
      capacity_max: 24,
      lead_source: 'AI_EXTRACTION',
    });
  });

  it('builds a host lead from the fields a host has, dropping blanks', () => {
    const input = crmAiRowToInput(hostRow, 'HOST_LEAD');
    expect(input).toMatchObject({ host_name: 'Vikram N', organization_name: 'Weekend Badminton', frequency: 'WEEKLY' });
    expect('venue_name' in input).toBe(false);
    expect('website' in input).toBe(false);
  });

  it('drops null, undefined and empty lists, and a capacity that is not a number', () => {
    const row = crmAiRecordToRow(
      { venue_name: 'X', city: 'Y', full_address: 'Z', area: null, amenities: [], website: undefined, capacity_min: '40', capacity_max: 80 },
      'VENUE_LEAD',
      0,
    );
    const input = crmAiRowToInput(row, 'VENUE_LEAD');
    expect(['area', 'amenities', 'website', 'capacity_min'].filter((key) => key in input)).toEqual([]);
    expect(input.capacity_max).toBe(80);
  });

  it('defaults an untriaged lead to New and Medium, and keeps what the agent set', () => {
    const blank = crmAiRecordToRow({ venue_name: 'X', city: 'Y', full_address: 'Z' }, 'VENUE_LEAD', 0);
    expect(crmAiRowToInput(blank, 'VENUE_LEAD')).toMatchObject({ lead_status: 'New', priority: 'Medium' });
    expect(crmAiRowToInput({ ...venueRow, lead_status: 'Contacted', priority: 'Low' }, 'VENUE_LEAD')).toMatchObject({
      lead_status: 'Contacted',
      priority: 'Low',
    });
  });

  it('sends the edited number and email with the extracted role', () => {
    const [contact] = contactsOf(crmAiRowToInput({ ...venueRow, mobile: '9111111111', email: 'new@x.example' }, 'VENUE_LEAD'));
    expect(contact).toEqual({ name: 'Meera N', role: 'Manager', mobile_number: '9111111111', whatsapp_number: '9000000001', email: 'new@x.example' });
  });

  it('names the contact after the lead when the record named nobody', () => {
    const row = { ...crmAiRecordToRow({ venue_name: 'Sunset Courts', contacts: [] }, 'VENUE_LEAD', 0), mobile: '9000000003' };
    expect(contactsOf(crmAiRowToInput(row, 'VENUE_LEAD'))).toEqual([{ name: 'Sunset Courts', mobile_number: '9000000003' }]);
  });

  it('sends no contact block when there is nothing to put in one', () => {
    const row = { ...crmAiRecordToRow({ city: 'Pune' }, 'HOST_LEAD', 0), name: '', mobile: '', email: '' };
    const input = crmAiRowToInput(row, 'HOST_LEAD');
    expect('contacts' in input).toBe(false);
    expect(input.city).toBe('Pune');
  });
});

describe('crmAiRowError', () => {
  const venueRow = crmAiRecordToRow(venueRecord, 'VENUE_LEAD', 0);
  const hostRow = crmAiRecordToRow(hostRecord, 'HOST_LEAD', 0);

  it('passes a complete lead of either kind', () => {
    expect(crmAiRowError(venueRow, 'VENUE_LEAD', t)).toBeNull();
    expect(crmAiRowError({ ...hostRow, city: '', full_address: '' }, 'HOST_LEAD', t)).toBeNull();
  });

  it('needs a name, and a city and an address on a venue', () => {
    expect(crmAiRowError({ ...hostRow, name: '  ' }, 'HOST_LEAD', t)).toBe('crm.aiFill.nameRequired');
    expect(crmAiRowError({ ...venueRow, city: '' }, 'VENUE_LEAD', t)).toBe('crm.aiFill.cityRequired');
    expect(crmAiRowError({ ...venueRow, full_address: ' ' }, 'VENUE_LEAD', t)).toBe('crm.aiFill.addressRequired');
  });
});

describe('crmAiParseRecords', () => {
  it('reads a list or a records object, keeping only objects', () => {
    expect(crmAiParseRecords('[{"venue_name":"A"},"junk",null]')).toEqual([{ venue_name: 'A' }]);
    expect(crmAiParseRecords('{"records":[{"host_name":"B"}]}')).toEqual([{ host_name: 'B' }]);
  });

  it('answers nothing for an empty reply or one with no records', () => {
    expect(crmAiParseRecords(null)).toEqual([]);
    expect(crmAiParseRecords('')).toEqual([]);
    expect(crmAiParseRecords('{"note":"none"}')).toEqual([]);
    expect(crmAiParseRecords('42')).toEqual([]);
  });

  it('throws on a reply that is not JSON, so the surface can say so', () => {
    expect(() => crmAiParseRecords('not json')).toThrow();
  });
});

describe('crmFormatKm and CRM_GEO_PRECISION_KEY', () => {
  it('keeps one decimal under 10 km and whole kilometres beyond', () => {
    expect(crmFormatKm(0.44)).toBe('0.4');
    expect(crmFormatKm(9.96)).toBe('10.0');
    expect(crmFormatKm(10)).toBe('10');
    expect(crmFormatKm(24.6)).toBe('25');
  });

  it('words each placement precision', () => {
    expect(CRM_GEO_PRECISION_KEY.AREA).toEqual({ short: 'crm.nearby.precisionAreaShort', long: 'crm.nearby.precisionArea' });
    expect(Object.keys(CRM_GEO_PRECISION_KEY)).toEqual(['PIN', 'AREA', 'CITY']);
  });
});

describe('crmDueUrgency', () => {
  const now = Date.parse('2026-11-25T10:00:00.000Z');
  const at = (offsetMs: number) => new Date(now + offsetMs);

  it('is done whatever the time once done', () => {
    expect(crmDueUrgency(at(-1), true, now)).toBe('done');
  });

  it('is overdue from its due time, soon within a day, later beyond', () => {
    expect(crmDueUrgency(at(0), false, now)).toBe('overdue');
    expect(crmDueUrgency(at(1), false, now)).toBe('soon');
    expect(crmDueUrgency(at(24 * 3_600_000), false, now)).toBe('soon');
    expect(crmDueUrgency(at(24 * 3_600_000 + 1), false, now)).toBe('later');
  });

  it('reads the clock when no time is given', () => {
    expect(crmDueUrgency(new Date(Date.now() + 2 * 24 * 3_600_000), false)).toBe('later');
  });
});

describe('Excel import fields', () => {
  it('lists the columns of each kind, labelled from their names, the required ones first', () => {
    expect(crmImportFieldsFor('VENUE_LEAD')).toBe(CRM_VENUE_IMPORT_FIELDS);
    expect(crmImportFieldsFor('HOST_LEAD')).toBe(CRM_HOST_IMPORT_FIELDS);
    expect(CRM_VENUE_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field)).toEqual(['venue_name', 'city', 'full_address']);
    expect(CRM_HOST_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.field)).toEqual(['host_name']);
    expect(CRM_VENUE_IMPORT_FIELDS.find((f) => f.field === 'services_offered_json')).toEqual({
      field: 'services_offered_json',
      label: 'Services offered (JSON)',
      required: false,
    });
    expect(CRM_HOST_IMPORT_FIELDS.at(-1)).toEqual({ field: 'primary_contact_email', label: 'Primary contact email', required: false });
  });

  it('matches headers by field name, then by label, ignoring case and spacing', () => {
    const fields = [
      { field: 'mobile', label: 'Phone number' },
      { field: 'city', label: 'Town' },
      { field: 'area', label: 'Area' },
    ];
    expect(crmImportAutoMatch(fields, ['PHONE-NUMBER', 'City', 'Town'])).toEqual({ mobile: 'PHONE-NUMBER', city: 'City' });
    expect(crmImportAutoMatch(CRM_VENUE_IMPORT_FIELDS, ['Venue Name', 'FULL_ADDRESS']).venue_name).toBe('Venue Name');
  });

  it('is ready once every required field has a column, and sends only mapped fields', () => {
    const fields = [{ field: 'venue_name', label: 'Venue name', required: true }, { field: 'area', label: 'Area' }];
    expect(crmImportReady(fields, { area: 'Area' })).toBe(false);
    expect(crmImportReady(fields, { venue_name: 'Name', area: '' })).toBe(true);
    expect(crmImportMappingInput({ venue_name: 'Name', area: '' })).toEqual([{ field: 'venue_name', header: 'Name' }]);
  });
});

describe('crmCalendarEvents', () => {
  const reminder = (over: Record<string, unknown> = {}) => ({
    id: 'r1',
    entity_type: 'VENUE_LEAD',
    lead_id: 'v1',
    title: 'Call back',
    due_at: '2026-11-26T10:00:00.000Z',
    notes: 'Bring the deck',
    status: 'PENDING',
    ...over,
  });
  const venueLeads = [
    { id: 'v1', name: 'Grand Hall', next_follow_up_date: '2026-11-25T09:00:00.000Z' },
    { id: 'v2', name: 'No date', next_follow_up_date: null },
  ];
  const hostLeads = [{ id: 'h1', name: 'Pune Runners', next_follow_up_date: '2026-11-27T09:00:00.000Z' }];
  const build = (over: Partial<Parameters<typeof crmCalendarEvents>[0]> = {}) =>
    crmCalendarEvents({
      reminders: [reminder(), reminder({ id: 'r2', entity_type: 'GENERAL', lead_id: null, due_at: 'not a date' })],
      venueLeads,
      hostLeads,
      entity: 'ALL',
      status: 'ALL',
      followUpTitle: (name) => `Follow-up · ${name}`,
      ...over,
    });

  it('lists reminders and dated follow-ups soonest first, naming the linked lead', () => {
    const events = build();
    expect(events.map((e) => e.id)).toEqual(['f-VENUE_LEAD-v1', 'r-r1', 'f-HOST_LEAD-h1']);
    expect(events[1]).toMatchObject({ kind: 'reminder', leadName: 'Grand Hall', notes: 'Bring the deck', status: 'PENDING' });
    expect(events[2]).toMatchObject({ kind: 'followup', title: 'Follow-up · Pune Runners', entity: 'HOST_LEAD', leadId: 'h1' });
  });

  it('names no lead for a general reminder or an unknown one', () => {
    const events = build({
      reminders: [reminder({ entity_type: 'GENERAL', lead_id: null }), reminder({ id: 'r3', lead_id: 'gone' }), reminder({ id: 'r4', lead_id: null })],
    });
    expect(events.filter((e) => e.kind === 'reminder').map((e) => e.leadName)).toEqual([null, null, null]);
    expect(build({ reminders: [reminder({ entity_type: 'HOST_LEAD', lead_id: 'h1' })] })[1].leadName).toBe('Pune Runners');
  });

  it('keeps one kind only, and drops follow-ups from a Done-only calendar', () => {
    expect(build({ entity: 'HOST_LEAD' }).map((e) => e.id)).toEqual(['f-HOST_LEAD-h1']);
    expect(build({ status: 'DONE' }).map((e) => e.id)).toEqual(['r-r1']);
  });
});
