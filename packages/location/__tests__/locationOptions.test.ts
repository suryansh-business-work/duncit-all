import { describe, it, expect } from 'vitest';
import {
  cityOptions,
  cityPincode,
  countryOptions,
  localityOptions,
  stateOptions,
} from '../src/locationOptions';
import type { LocationDoc } from '../src/types';

const locations: LocationDoc[] = [
  {
    id: 'loc-1',
    country: 'India',
    country_code: 'IN',
    state: 'Karnataka',
    state_code: 'KA',
    city: 'Bengaluru',
    location_pincode: '560001',
    location_zones: [
      { zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
      { zone_name: 'Koramangala', zone_code: 'KOR', pincode: '' },
      { zone_name: '', zone_code: 'BLANK', pincode: '560099' },
      // no `pincode` key at all — exercises the `zone.pincode ?? ''` fallback.
      { zone_name: 'Whitefield', zone_code: 'WF' },
    ],
  },
  {
    id: 'loc-2',
    country: 'India',
    country_code: 'IN',
    state: 'Karnataka',
    state_code: 'KA',
    city: 'Mysuru',
    location_pincode: '570001',
    location_zones: null,
  },
  {
    id: 'loc-3',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Pune',
    location_pincode: '411001',
    location_zones: [],
  },
  // duplicate country_code with a different country label — must be skipped by the `seen` guard.
  {
    id: 'loc-4',
    country: 'Bharat',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Mumbai',
    location_pincode: '400001',
  },
  // no country_code at all — must be skipped entirely by countryOptions.
  {
    id: 'loc-5',
    country: '',
    country_code: '',
    state: 'Kerala',
    state_code: 'KL',
    city: 'Kochi',
    location_pincode: '',
  },
  // country_code set, but empty state/city — must be skipped by state/city dedup guards.
  {
    id: 'loc-6',
    country: 'India',
    country_code: 'IN',
    state: '',
    state_code: '',
    city: '',
  },
];

describe('countryOptions', () => {
  it('returns distinct countries sorted by label, skipping blanks and dup codes', () => {
    expect(countryOptions(locations)).toEqual([{ value: 'IN', label: 'India' }]);
  });

  it('returns an empty list for an empty input', () => {
    expect(countryOptions([])).toEqual([]);
  });
});

describe('stateOptions', () => {
  it('returns distinct states within a country code, sorted', () => {
    expect(stateOptions(locations, 'IN')).toEqual([
      { value: 'Karnataka', label: 'Karnataka' },
      { value: 'Maharashtra', label: 'Maharashtra' },
    ]);
  });

  it('ignores locations for a different country code', () => {
    expect(stateOptions(locations, 'US')).toEqual([]);
  });

  it('returns states across all countries when countryCode is empty', () => {
    const result = stateOptions(locations, '');
    expect(result.map((o) => o.value)).toContain('Kerala');
  });
});

describe('cityOptions', () => {
  it('returns distinct cities within a country+state, sorted', () => {
    expect(cityOptions(locations, 'IN', 'Karnataka')).toEqual([
      { value: 'Bengaluru', label: 'Bengaluru', location_id: 'loc-1' },
      { value: 'Mysuru', label: 'Mysuru', location_id: 'loc-2' },
    ]);
  });

  it('ignores a non-matching state', () => {
    expect(cityOptions(locations, 'IN', 'Nowhere')).toEqual([]);
  });

  it('returns cities across all states when state is empty', () => {
    const result = cityOptions(locations, 'IN', '');
    expect(result.map((o) => o.value)).toContain('Pune');
  });

  it('returns cities across all countries when countryCode is empty', () => {
    const result = cityOptions(locations, '', 'Kerala');
    expect(result.map((o) => o.value)).toEqual(['Kochi']);
  });
});

describe('localityOptions', () => {
  it('returns [] when the location id has no matching doc', () => {
    expect(localityOptions(locations, 'missing-id')).toEqual([]);
  });

  it('returns [] when location_zones is null', () => {
    expect(localityOptions(locations, 'loc-2')).toEqual([]);
  });

  it('returns [] when location_zones is an empty array', () => {
    expect(localityOptions(locations, 'loc-3')).toEqual([]);
  });

  it('filters out blank zone names and sorts the remaining zones by label', () => {
    expect(localityOptions(locations, 'loc-1')).toEqual([
      { value: 'Indiranagar', label: 'Indiranagar', pincode: '560038' },
      { value: 'Koramangala', label: 'Koramangala', pincode: '' },
      { value: 'Whitefield', label: 'Whitefield', pincode: '' },
    ]);
  });
});

describe('cityPincode', () => {
  it("returns the doc's location_pincode when found", () => {
    expect(cityPincode(locations, 'loc-1')).toBe('560001');
  });

  it('returns an empty string when the doc has no location_pincode', () => {
    expect(cityPincode(locations, 'loc-6')).toBe('');
  });

  it('returns an empty string when the location id is not found', () => {
    expect(cityPincode(locations, 'missing-id')).toBe('');
  });
});
