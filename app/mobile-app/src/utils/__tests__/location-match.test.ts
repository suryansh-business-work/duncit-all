import { matchLocation, matchZone } from '@/utils/location-match';

const loc = (over: Record<string, unknown>) => ({
  id: 'l1',
  location_name: 'Bengaluru',
  city: 'Bengaluru',
  location_pincode: '560001',
  location_zones: [{ zone_name: 'Indiranagar', pincode: '560038' }],
  ...over,
});

describe('matchLocation', () => {
  const locations = [
    loc({}),
    loc({
      id: 'l2',
      location_name: 'New Delhi',
      city: 'New Delhi',
      location_pincode: '110001',
      location_zones: [],
    }),
  ];

  it('matches on the location pincode first', () => {
    expect(matchLocation(locations, 'Anything', '560001')?.id).toBe('l1');
  });

  it('matches on a zone pincode', () => {
    expect(matchLocation(locations, 'Anything', '560038')?.id).toBe('l1');
  });

  it('matches exactly on city/name when there is no pincode', () => {
    expect(matchLocation(locations, 'new delhi')?.id).toBe('l2');
  });

  it('matches by containment (Delhi → New Delhi)', () => {
    expect(matchLocation(locations, 'Delhi')?.id).toBe('l2');
  });

  it('returns null when nothing matches', () => {
    expect(matchLocation(locations, 'Atlantis', '000000')).toBeNull();
  });

  it('returns null for an empty query', () => {
    expect(matchLocation(locations, '')).toBeNull();
  });

  it('tolerates null city/pincode/zones on a candidate', () => {
    const sparse = [
      { id: 'l3', location_name: 'Goa', city: null, location_pincode: null, location_zones: null },
    ];
    expect(matchLocation(sparse, 'goa')?.id).toBe('l3');
  });

  it('tolerates null pincode/zones while matching by pincode', () => {
    const sparse = [
      { id: 'a', location_name: 'A', city: 'A', location_pincode: null, location_zones: null },
      {
        id: 'b',
        location_name: 'B',
        city: 'B',
        location_pincode: null,
        location_zones: [{ zone_name: 'Z', pincode: null }],
      },
    ];
    expect(matchLocation(sparse, 'nope', '999999')).toBeNull();
  });
});

describe('matchZone', () => {
  it('resolves the zone for a known pincode', () => {
    expect(matchZone(loc({}), '560038')).toBe('Indiranagar');
  });

  it('returns an empty string without a pincode or match', () => {
    expect(matchZone(loc({}), '')).toBe('');
    expect(matchZone(loc({}), '999999')).toBe('');
  });

  it('tolerates null zones and null zone pincodes', () => {
    expect(matchZone(loc({ location_zones: null }), '560038')).toBe('');
    expect(matchZone(loc({ location_zones: [{ zone_name: 'Z', pincode: null }] }), '560038')).toBe(
      '',
    );
  });

  it('returns an empty string for a null/undefined pincode', () => {
    expect(matchZone(loc({}), null)).toBe('');
    expect(matchZone(loc({}), undefined)).toBe('');
  });
});
