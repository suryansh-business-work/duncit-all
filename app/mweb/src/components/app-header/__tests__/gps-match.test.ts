import { describe, expect, it } from 'vitest';

import { matchLocation, matchZone, type MatchableLocation } from '../gps-match';

const addr = (over: Partial<{ city: string; pincode: string }> = {}) => ({
  city: '',
  state: '',
  country: '',
  pincode: '',
  ...over,
});

const BLR: MatchableLocation = {
  id: 'blr',
  city: 'Bengaluru',
  location_name: 'Bangalore City',
  location_pincode: '560001',
  location_zones: [
    { zone_name: 'Indiranagar', pincode: '560038' },
    { zone_name: 'No Pin Zone', pincode: null },
  ],
};
const DEL: MatchableLocation = { id: 'del', city: 'Delhi', location_name: 'Delhi NCR', location_pincode: null, location_zones: null };
const NOCITY: MatchableLocation = { id: 'x', city: null, location_name: null };

describe('matchLocation', () => {
  it('matches by the location pincode, ignoring surrounding whitespace', () => {
    expect(matchLocation([DEL, BLR], addr({ pincode: ' 560001 ', city: 'Elsewhere' }))?.id).toBe('blr');
  });

  it('matches by a zone pincode', () => {
    expect(matchLocation([DEL, BLR], addr({ pincode: '560038' }))?.id).toBe('blr');
  });

  it('prefers the pincode over the city name', () => {
    expect(matchLocation([DEL, BLR], addr({ pincode: '560001', city: 'Delhi' }))?.id).toBe('blr');
  });

  it('falls back to an exact, case-insensitive city or location name match', () => {
    expect(matchLocation([BLR, DEL], addr({ city: 'DELHI' }))?.id).toBe('del');
    expect(matchLocation([BLR, DEL], addr({ city: 'bangalore city' }))?.id).toBe('blr');
  });

  it('falls back to containment in either direction', () => {
    expect(matchLocation([BLR], addr({ city: 'Bengaluru Urban' }))?.id).toBe('blr');
    expect(matchLocation([DEL], addr({ city: 'Del' }))?.id).toBe('del');
    expect(matchLocation([BLR], addr({ city: 'Bangalore' }))?.id).toBe('blr');
  });

  it('returns null when nothing matches, with no pincode and no city, or with nameless locations', () => {
    expect(matchLocation([BLR, DEL], addr({ city: 'Atlantis', pincode: '000000' }))).toBeNull();
    expect(matchLocation([BLR], addr())).toBeNull();
    expect(matchLocation([NOCITY], addr({ city: 'Atlantis' }))).toBeNull();
  });

  it('does not match a location with no pincode against a blank pincode', () => {
    expect(matchLocation([DEL], addr({ pincode: '   ', city: 'Atlantis' }))).toBeNull();
  });
});

describe('matchZone', () => {
  it('returns the zone name whose pincode matches', () => {
    expect(matchZone(BLR, '560038')).toBe('Indiranagar');
    expect(matchZone(BLR, ' 560038 ')).toBe('Indiranagar');
  });

  it('returns empty for no location, no pincode, no matching zone or no zones', () => {
    expect(matchZone(null, '560038')).toBe('');
    expect(matchZone(BLR, '')).toBe('');
    expect(matchZone(BLR, '999999')).toBe('');
    expect(matchZone(DEL, '110001')).toBe('');
  });
});
