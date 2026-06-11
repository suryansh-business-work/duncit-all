import { describe, expect, it } from 'vitest';
import { autoMatch, VENUE_IMPORT_FIELDS } from '@/config/importFields';

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
});
