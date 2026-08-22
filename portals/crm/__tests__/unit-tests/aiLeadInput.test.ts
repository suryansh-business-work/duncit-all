/**
 * Turning an AI-extracted record into a lead the server will accept.
 *
 * The model writes free-form JSON; the server takes a typed input. Everything
 * here is that gap, and the rules exist because of what a bad conversion does
 * downstream rather than because of tidiness:
 *
 *  - EMPTY IS NOT A VALUE. An optional field sent as `""` overwrites whatever
 *    was on the record with nothing, so blanks are dropped rather than sent.
 *    That is the whole of `compact`, and it is why a lead with no website keeps
 *    the one it had.
 *  - A number that arrived as text is not a capacity. `capacity_min` is only
 *    forwarded when it really is a number, because the server's Int would
 *    reject "40" and take the whole lead down with it.
 *  - The contact block is all-or-nothing: a contact row with no name, no
 *    number and no email is a row a CRM agent has to open to discover is empty.
 *  - A venue lead needs a city and an address because that is what makes it
 *    visitable; a host lead needs neither.
 */
import { describe, expect, it } from 'vitest';

import { recordToRow, rowError, rowToInput } from '../../src/components/ai-records/aiLeadInput';

const venueRecord = {
  venue_name: 'Sunset Courts',
  city: 'Bengaluru',
  full_address: '12 Church Street',
  area: 'Central',
  venue_description: 'Two indoor courts.',
  space_type: 'INDOOR',
  venue_types: ['SPORTS'],
  event_suitability: ['BADMINTON'],
  amenities: ['Parking'],
  capacity_min: 4,
  capacity_max: 24,
  website: 'https://sunsetcourts.example',
  lead_source: 'AI_EXTRACTION',
  lead_status: 'New',
  priority: 'High',
  contacts: [
    {
      name: 'Meera N',
      role: 'Manager',
      mobile_number: '9000000001',
      whatsapp_number: '9000000001',
      email: 'meera@sunsetcourts.example',
    },
  ],
};

const hostRecord = {
  host_name: 'Vikram N',
  city: 'Bengaluru',
  host_type: 'INDIVIDUAL',
  organization_name: 'Weekend Badminton',
  area: 'South',
  interests: ['Badminton'],
  expected_audience_size: 20,
  frequency: 'WEEKLY',
  budget_range: '5-10k',
  website: '',
  lead_source: 'AI_EXTRACTION',
  contacts: [{ mobile_number: '9000000002', email: 'vikram@duncit.com' }],
};

describe('recordToRow', () => {
  it('surfaces the core fields a CRM agent edits, keeping the record underneath', () => {
    const row = recordToRow(venueRecord, 'VENUE_LEAD', 0);

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
  });

  it('reads the name from the right field for each kind of lead', () => {
    expect(recordToRow(hostRecord, 'HOST_LEAD', 1).name).toBe('Vikram N');
    expect(recordToRow(venueRecord, 'VENUE_LEAD', 1).name).toBe('Sunset Courts');
  });

  it('renders a number or a boolean the model wrote as text, not as [object Object]', () => {
    const row = recordToRow({ venue_name: 12, city: true }, 'VENUE_LEAD', 0);

    expect(row.name).toBe('12');
    expect(row.city).toBe('true');
  });

  it('serialises an object the model put where a string belonged', () => {
    const row = recordToRow({ venue_name: { first: 'Sunset' } }, 'VENUE_LEAD', 0);

    expect(row.name).toBe('{"first":"Sunset"}');
  });

  it('reads a record with no contacts at all as empty strings, never undefined', () => {
    const row = recordToRow({ venue_name: 'Sunset Courts' }, 'VENUE_LEAD', 0);

    expect(row.mobile).toBe('');
    expect(row.email).toBe('');
  });

  it('reads a record whose contacts came back as something other than a list', () => {
    const row = recordToRow({ venue_name: 'X', contacts: 'Meera' }, 'VENUE_LEAD', 0);

    expect(row.mobile).toBe('');
  });
});

describe('rowToInput', () => {
  const venueRow = recordToRow(venueRecord, 'VENUE_LEAD', 0);
  const hostRow = recordToRow(hostRecord, 'HOST_LEAD', 0);

  it('builds a venue lead from the row and the record behind it', () => {
    const input = rowToInput(venueRow, 'VENUE_LEAD');

    expect(input).toMatchObject({
      venue_name: 'Sunset Courts',
      city: 'Bengaluru',
      full_address: '12 Church Street',
      capacity_min: 4,
      capacity_max: 24,
      lead_source: 'AI_EXTRACTION',
    });
  });

  it('builds a host lead from the fields a host actually has', () => {
    const input = rowToInput(hostRow, 'HOST_LEAD');

    expect(input).toMatchObject({
      host_name: 'Vikram N',
      organization_name: 'Weekend Badminton',
      frequency: 'WEEKLY',
    });
    expect(input.venue_name).toBeUndefined();
  });

  it('drops empty strings rather than sending them — a blank overwrites what was there', () => {
    const input = rowToInput(hostRow, 'HOST_LEAD');

    expect('website' in input).toBe(false);
  });

  it('drops null, undefined and empty lists for the same reason', () => {
    const row = recordToRow(
      { venue_name: 'X', city: 'Y', full_address: 'Z', area: null, amenities: [], website: undefined },
      'VENUE_LEAD',
      0
    );

    const input = rowToInput(row, 'VENUE_LEAD');

    expect('area' in input).toBe(false);
    expect('amenities' in input).toBe(false);
    expect('website' in input).toBe(false);
  });

  it('forwards a capacity only when it really is a number — the server takes an Int', () => {
    const asText = recordToRow(
      { venue_name: 'X', city: 'Y', full_address: 'Z', capacity_min: '40', capacity_max: 80 },
      'VENUE_LEAD',
      0
    );

    const input = rowToInput(asText, 'VENUE_LEAD');

    expect('capacity_min' in input).toBe(false);
    expect(input.capacity_max).toBe(80);
  });

  it('defaults a lead nobody triaged to New and Medium rather than leaving them blank', () => {
    const row = recordToRow({ venue_name: 'X', city: 'Y', full_address: 'Z' }, 'VENUE_LEAD', 0);

    const input = rowToInput(row, 'VENUE_LEAD');

    expect(input.lead_status).toBe('New');
    expect(input.priority).toBe('Medium');
  });

  it('keeps a status and a priority the agent set', () => {
    const input = rowToInput({ ...venueRow, lead_status: 'Contacted', priority: 'Low' }, 'VENUE_LEAD');

    expect(input.lead_status).toBe('Contacted');
    expect(input.priority).toBe('Low');
  });

  it('sends the edited number and email, not the ones the model extracted', () => {
    const edited = { ...venueRow, mobile: '9111111111', email: 'new@sunsetcourts.example' };

    const [contact] = rowToInput(edited, 'VENUE_LEAD').contacts;

    expect(contact).toMatchObject({
      mobile_number: '9111111111',
      email: 'new@sunsetcourts.example',
      role: 'Manager',
    });
  });

  it('names the contact from the lead when the record named nobody', () => {
    const row = recordToRow(
      { venue_name: 'Sunset Courts', city: 'Y', full_address: 'Z', contacts: [{ mobile_number: '9000000001' }] },
      'VENUE_LEAD',
      0
    );

    const [contact] = rowToInput(row, 'VENUE_LEAD').contacts;

    expect(contact.name).toBe('Sunset Courts');
  });

  it('sends no contact block at all when there is nothing to put in one', () => {
    const row = { ...recordToRow({}, 'VENUE_LEAD', 0), name: '', mobile: '', email: '' };

    expect('contacts' in rowToInput(row, 'VENUE_LEAD')).toBe(false);
  });
});

describe('rowError', () => {
  const venueRow = recordToRow(venueRecord, 'VENUE_LEAD', 0);
  const hostRow = recordToRow(hostRecord, 'HOST_LEAD', 0);

  it('passes a complete lead of either kind', () => {
    expect(rowError(venueRow, 'VENUE_LEAD')).toBeNull();
    expect(rowError(hostRow, 'HOST_LEAD')).toBeNull();
  });

  it('needs a name, whitespace not counting as one', () => {
    expect(rowError({ ...venueRow, name: '   ' }, 'VENUE_LEAD')).toBe('Name is required');
    expect(rowError({ ...hostRow, name: '' }, 'HOST_LEAD')).toBe('Name is required');
  });

  it('needs a city and an address on a VENUE, which is what makes it visitable', () => {
    expect(rowError({ ...venueRow, city: '' }, 'VENUE_LEAD')).toBe('City is required');
    expect(rowError({ ...venueRow, full_address: '  ' }, 'VENUE_LEAD')).toBe('Address is required');
  });

  it('needs neither on a HOST, who is a person rather than a place', () => {
    expect(rowError({ ...hostRow, city: '', full_address: '' }, 'HOST_LEAD')).toBeNull();
  });
});
