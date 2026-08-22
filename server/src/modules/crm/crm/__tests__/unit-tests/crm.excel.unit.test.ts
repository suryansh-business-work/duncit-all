/**
 * The CRM's Excel template, export and import, with the lead models faked.
 *
 * The import is where this earns its keep. A sales admin uploads a sheet a
 * colleague edited, and the row that fails has to say WHICH column is wrong and
 * how to fix it — the alternative, which this replaced, was leaking
 * "BSONError: input must be a 24 character hex string" into the UI. One bad row
 * must also never stop the good ones: the importer counts and reports, it does
 * not abort.
 */
import * as XLSX from 'xlsx';

jest.mock('../../crm.model', () => ({
  VenueLeadModel: { find: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  HostLeadModel: { find: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));

import { VenueLeadModel, HostLeadModel } from '../../crm.model';
import {
  buildTemplateBase64,
  exportLeadsBase64,
  importLeads,
  inspectImport,
} from '../../crm.excel';

const venues = VenueLeadModel as unknown as Record<string, jest.Mock>;
const hosts = HostLeadModel as unknown as Record<string, jest.Mock>;

/**
 * A truncated .xlsx — the ZIP local-file header and nothing after it, which is
 * what a cut-off upload actually looks like.
 *
 * The obvious fixture, the literal 'not-a-workbook', stopped reaching the parse
 * failure: xlsx happily reads arbitrary text as a one-sheet CSV, so the test
 * was asserting a branch it no longer entered. A half-written workbook is both
 * realistic and reliably rejected ("Unsupported ZIP file").
 */
const TRUNCATED_XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04]).toString('base64');

/** `find().sort().lean()` and `findOne().select().lean()` as one chain. */
const chain = (value: unknown) => ({
  sort: () => chain(value),
  select: () => chain(value),
  lean: () => Promise.resolve(value),
});

/** A workbook of `rows` under `header`, as base64 — what an upload looks like. */
const sheetBase64 = (header: string[], rows: (string | number)[][], name = 'Template'): string => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), name);
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
};

/** Read a base64 workbook back into a sheet name → row objects map. */
const readSheets = (base64: string) => {
  const wb = XLSX.read(base64, { type: 'base64' });
  return Object.fromEntries(
    wb.SheetNames.map((name) => [
      name,
      XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name] as XLSX.WorkSheet, { defval: '' }),
    ])
  );
};

const headersOf = (base64: string, sheet: string) => {
  const wb = XLSX.read(base64, { type: 'base64' });
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet] as XLSX.WorkSheet, { header: 1, defval: '' });
  return (matrix[0] ?? []).map(String);
};

beforeEach(() => {
  jest.clearAllMocks();
  venues.findOne.mockReturnValue(chain(null));
  hosts.findOne.mockReturnValue(chain(null));
  venues.create.mockResolvedValue({});
  hosts.create.mockResolvedValue({});
});

describe('buildTemplateBase64', () => {
  it('ships a filled sample row, so nobody has to guess the shape of a cell', () => {
    const sheets = readSheets(buildTemplateBase64('VENUE_LEAD'));

    expect(sheets.Template).toHaveLength(1);
    expect(sheets.Template?.[0]).toMatchObject({ venue_name: 'Sample Banquet Hall', city: 'Bengaluru' });
  });

  it('ships the instructions alongside the template, not in place of it', () => {
    const wb = XLSX.read(buildTemplateBase64('HOST_LEAD'), { type: 'base64' });

    expect(wb.SheetNames).toContain('Template');
    expect(wb.SheetNames).toContain('Instructions');
  });

  it('gives each entity its own columns', () => {
    expect(headersOf(buildTemplateBase64('VENUE_LEAD'), 'Template')).toContain('venue_name');
    expect(headersOf(buildTemplateBase64('HOST_LEAD'), 'Template')).toContain('host_name');
    expect(headersOf(buildTemplateBase64('HOST_LEAD'), 'Template')).not.toContain('venue_name');
  });

  it('round-trips through the importer that reads it', () => {
    expect(inspectImport(buildTemplateBase64('VENUE_LEAD')).headers).toContain('primary_contact_mobile');
  });
});

describe('exportLeadsBase64', () => {
  it('flattens the array fields to comma-separated cells a person can edit', async () => {
    venues.find.mockReturnValue(
      chain([
        {
          venue_name: 'Sunset Hall',
          city: 'Pune',
          full_address: '1 MG Road',
          venue_types: ['Banquet', 'Lounge'],
          amenities: ['Parking', 'AC'],
          contacts: [{ name: 'Rohan', mobile_number: '9876543210', email: 'r@example.com' }],
        },
      ])
    );

    const sheets = readSheets(await exportLeadsBase64('VENUE_LEAD'));

    expect(sheets['Venue Leads']?.[0]).toMatchObject({
      venue_name: 'Sunset Hall',
      venue_types: 'Banquet, Lounge',
      amenities: 'Parking, AC',
      primary_contact_name: 'Rohan',
      primary_contact_mobile: '9876543210',
    });
  });

  it('lifts the FIRST contact onto the row, and leaves the columns blank when there is none', async () => {
    venues.find.mockReturnValue(chain([{ venue_name: 'No Contact Hall', contacts: [] }]));

    const sheets = readSheets(await exportLeadsBase64('VENUE_LEAD'));

    expect(sheets['Venue Leads']?.[0]).toMatchObject({ primary_contact_name: '', primary_contact_mobile: '' });
  });

  it('exports host leads from the host model, under their own sheet', async () => {
    hosts.find.mockReturnValue(chain([{ host_name: 'Priya', interests: ['Music', 'Chess'], contacts: [] }]));

    const sheets = readSheets(await exportLeadsBase64('HOST_LEAD'));

    expect(Object.keys(sheets)).toEqual(['Host Leads']);
    expect(sheets['Host Leads']?.[0]).toMatchObject({ host_name: 'Priya', interests: 'Music, Chess' });
  });

  it('writes a header-only sheet when there are no leads yet', async () => {
    venues.find.mockReturnValue(chain([]));

    const base64 = await exportLeadsBase64('VENUE_LEAD');

    expect(readSheets(base64)['Venue Leads']).toEqual([]);
    expect(headersOf(base64, 'Venue Leads')).toContain('venue_name');
  });
});

describe('inspectImport', () => {
  it('reads the headers and a few sample rows so the admin can map the columns', () => {
    const base64 = sheetBase64(['Venue', 'Town'], [['Sunset Hall', 'Pune'], ['Moonrise', 'Goa']]);

    const { headers, sample_rows } = inspectImport(base64);

    expect(headers).toEqual(['Venue', 'Town']);
    expect(sample_rows).toHaveLength(2);
    expect(JSON.parse(sample_rows[0] as string)).toMatchObject({ Venue: 'Sunset Hall' });
  });

  it('shows at most three sample rows', () => {
    const base64 = sheetBase64(['Venue'], [['a'], ['b'], ['c'], ['d'], ['e']]);

    expect(inspectImport(base64).sample_rows).toHaveLength(3);
  });

  it('drops a blank header rather than offering an unnamed column to map', () => {
    const base64 = sheetBase64(['Venue', '  ', 'Town'], [['a', 'x', 'b']]);

    expect(inspectImport(base64).headers).toEqual(['Venue', 'Town']);
  });

  it('prefers the template/lead sheet over whatever happens to be first', () => {
    const wb = XLSX.read(sheetBase64(['Venue'], [['a']], 'Venue Leads'), { type: 'base64' });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ignored']]), 'Notes');
    // Put the decoy first so a naive reader would pick it.
    wb.SheetNames = ['Notes', 'Venue Leads'];

    expect(inspectImport(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })).headers).toEqual(['Venue']);
  });

  it('refuses an empty upload and an unreadable one', () => {
    expect(() => inspectImport('')).toThrow('No file content provided');
    expect(() => inspectImport(TRUNCATED_XLSX)).toThrow('Could not read the uploaded file');
  });
});

describe('importLeads', () => {
  const VENUE_HEADER = ['venue_name', 'city', 'full_address', 'primary_contact_name', 'primary_contact_mobile'];

  it('inserts every good row and says how many', async () => {
    const base64 = sheetBase64(VENUE_HEADER, [
      ['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210'],
      ['Moonrise', 'Goa', '2 Beach Road', 'Priya', '9876543211'],
    ]);

    const result = await importLeads('VENUE_LEAD', base64);

    expect(result).toMatchObject({ inserted: 2, failed: 0, errors: [] });
    expect(venues.create).toHaveBeenCalledTimes(2);
  });

  it('keeps going after a bad row, and numbers it as the admin sees it in Excel', async () => {
    const base64 = sheetBase64(VENUE_HEADER, [
      ['', 'Pune', '1 MG Road', 'Rohan', '9876543210'],
      ['Moonrise', 'Goa', '2 Beach Road', 'Priya', '9876543211'],
    ]);

    const result = await importLeads('VENUE_LEAD', base64);

    expect(result.inserted).toBe(1);
    expect(result.failed).toBe(1);
    // Row 1 of the data is row 2 of the sheet, under the header.
    expect(result.errors[0]?.row).toBe(2);
    expect(result.errors[0]?.message).toContain('required');
  });

  it('refuses a second lead with a phone number already on file', async () => {
    venues.findOne.mockReturnValue(chain({ _id: 'existing' }));
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    const result = await importLeads('VENUE_LEAD', base64);

    expect(result.failed).toBe(1);
    expect(result.errors[0]?.message).toContain('already exists');
    expect(venues.create).not.toHaveBeenCalled();
  });

  it('names the column and how to fix it when a category ID was typed as a name', async () => {
    venues.create.mockRejectedValue(
      Object.assign(new Error('input must be a 24 character hex string'), {
        name: 'BSONError',
        path: 'super_category_id',
      })
    );
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    const message = (await importLeads('VENUE_LEAD', base64)).errors[0]?.message ?? '';

    expect(message).toContain('super_category_id');
    expect(message).toContain('24-character category ID');
    expect(message).toContain('Do not type the category name');
  });

  it('lists every field a validation error names, and why', async () => {
    venues.create.mockRejectedValue({
      name: 'ValidationError',
      errors: {
        city: { path: 'city', kind: 'required' },
        capacity_max: { path: 'capacity_max', kind: 'Number' },
        priority: { path: 'priority', kind: 'enum' },
        area: { path: 'area', kind: 'something-else' },
      },
    });
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    const message = (await importLeads('VENUE_LEAD', base64)).errors[0]?.message ?? '';

    expect(message).toContain('"city" is required');
    expect(message).toContain('"capacity_max" must be a number');
    expect(message).toContain(`"priority" has a value that isn't allowed`);
    expect(message).toContain('"area" is invalid');
  });

  it('says what a mistyped cell should have been', async () => {
    venues.create.mockRejectedValue({ name: 'CastError', kind: 'Date', path: 'next_follow_up_date', value: 'soon' });
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    const message = (await importLeads('VENUE_LEAD', base64)).errors[0]?.message ?? '';

    expect(message).toContain('next_follow_up_date');
    expect(message).toContain('YYYY-MM-DD');
  });

  it('falls back to the raw message rather than saying nothing useful', async () => {
    venues.create.mockRejectedValue(new Error('the database is on fire'));
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    expect((await importLeads('VENUE_LEAD', base64)).errors[0]?.message).toBe('the database is on fire');
  });

  it('translates a sheet whose headers are the colleague’s words, not ours', async () => {
    const base64 = sheetBase64(
      ['Venue', 'Town', 'Address'],
      [['Sunset Hall', 'Pune', '1 MG Road']]
    );

    const result = await importLeads('VENUE_LEAD', base64, [
      { field: 'venue_name', header: 'Venue' },
      { field: 'city', header: 'Town' },
      { field: 'full_address', header: 'Address' },
      { field: 'landmark', header: 'Not In The Sheet' },
    ]);

    expect(result.inserted).toBe(1);
    expect(venues.create).toHaveBeenCalledWith(
      expect.objectContaining({ venue_name: 'Sunset Hall', city: 'Pune', full_address: '1 MG Road' })
    );
  });

  it('splits the comma-separated cells back into lists, and reads the yes/no columns', async () => {
    const base64 = sheetBase64(
      [...VENUE_HEADER, 'venue_types', 'amenities', 'gst_applicable', 'capacity_max'],
      [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210', 'Banquet, Lounge', 'Parking', 'yes', '250']]
    );

    await importLeads('VENUE_LEAD', base64);

    expect(venues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_types: ['Banquet', 'Lounge'],
        amenities: ['Parking'],
        gst_applicable: true,
        capacity_max: 250,
      })
    );
  });

  it('defaults a new lead to New / Medium when the sheet left them blank', async () => {
    const base64 = sheetBase64(VENUE_HEADER, [['Sunset Hall', 'Pune', '1 MG Road', 'Rohan', '9876543210']]);

    await importLeads('VENUE_LEAD', base64);

    expect(venues.create).toHaveBeenCalledWith(
      expect.objectContaining({ lead_status: 'New', priority: 'Medium' })
    );
  });

  it('needs only a name for a host lead', async () => {
    const good = sheetBase64(['host_name', 'city'], [['Priya Kapoor', 'Pune']]);
    expect((await importLeads('HOST_LEAD', good)).inserted).toBe(1);

    jest.clearAllMocks();
    hosts.findOne.mockReturnValue(chain(null));
    const bad = sheetBase64(['host_name', 'city'], [['   ', 'Pune']]);
    const result = await importLeads('HOST_LEAD', bad);
    expect(result.failed).toBe(1);
    expect(result.errors[0]?.message).toContain('host_name is required');
  });

  it('attaches no contact when the row named nobody', async () => {
    const base64 = sheetBase64(['venue_name', 'city', 'full_address'], [['Sunset Hall', 'Pune', '1 MG Road']]);

    await importLeads('VENUE_LEAD', base64);

    expect(venues.create).toHaveBeenCalledWith(expect.objectContaining({ contacts: [] }));
  });

  it('refuses an empty upload and an unreadable one', async () => {
    await expect(importLeads('VENUE_LEAD', '')).rejects.toThrow('No file content provided');
    await expect(importLeads('VENUE_LEAD', TRUNCATED_XLSX)).rejects.toThrow(
      'Could not read the uploaded Excel file',
    );
  });
});
