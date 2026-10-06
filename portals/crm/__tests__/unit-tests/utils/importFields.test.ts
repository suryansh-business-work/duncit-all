import { describe, expect, it } from 'vitest';
import { autoMatch, HOST_IMPORT_FIELDS, importFieldsFor, VENUE_IMPORT_FIELDS } from '@/config/importFields';

describe('autoMatch (import column mapping)', () => {
  it('matches headers by exact field name and by friendly label, ignoring case/spacing', () => {
    const headers = ['Venue Name', 'city', 'FULL_ADDRESS', 'Primary Contact Mobile', 'unmapped col'];
    const m = autoMatch(VENUE_IMPORT_FIELDS, headers);
    expect(m.venue_name).toBe('Venue Name');
    expect(m.city).toBe('city');
    expect(m.full_address).toBe('FULL_ADDRESS');
    expect(m.primary_contact_mobile).toBe('Primary Contact Mobile');
  });

  it('leaves unknown fields unmapped', () => {
    const m = autoMatch(VENUE_IMPORT_FIELDS, ['something else']);
    expect(m.venue_name).toBeUndefined();
  });

  it('falls back to the friendly label when the header does not match the field key', () => {
    const fields = [
      { field: 'mobile', label: 'Phone number' },
      { field: 'city', label: 'Town' },
    ];
    const m = autoMatch(fields, ['PHONE-NUMBER', 'City', 'Town']);
    expect(m).toEqual({ mobile: 'PHONE-NUMBER', city: 'City' });
  });

  it('labels fields from their keys and picks the field list per lead kind', () => {
    const json = VENUE_IMPORT_FIELDS.find((x) => x.field === 'services_offered_json');
    expect(json).toEqual({ field: 'services_offered_json', label: 'Services offered (JSON)', required: false });
    expect(VENUE_IMPORT_FIELDS[0]).toEqual({ field: 'venue_name', label: 'Venue name', required: true });
    expect(importFieldsFor('VENUE_LEAD')).toBe(VENUE_IMPORT_FIELDS);
    expect(importFieldsFor('HOST_LEAD')).toBe(HOST_IMPORT_FIELDS);
    expect(HOST_IMPORT_FIELDS.filter((x) => x.required).map((x) => x.field)).toEqual(['host_name']);
  });
});
