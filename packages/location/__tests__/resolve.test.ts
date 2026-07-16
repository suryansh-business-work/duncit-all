import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { LocationDoc } from '../src/types';

const { useAdminLocationsMock } = vi.hoisted(() => ({ useAdminLocationsMock: vi.fn() }));

vi.mock('../src/queries', () => ({ useAdminLocations: useAdminLocationsMock }));

const { buildLocationValue, buildLocationValueFromNames, useLocationValueFromId } = await import('../src/resolve');

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
    ],
  },
];

describe('buildLocationValue', () => {
  it('returns an empty value stub (keeping the id + locality) when the doc is not found', () => {
    expect(buildLocationValue(locations, 'missing-id', 'SomeArea')).toEqual({
      location_id: 'missing-id',
      country: '',
      country_code: '',
      state: '',
      state_code: '',
      city: '',
      locality: 'SomeArea',
      pincode: '',
    });
  });

  it('defaults locality to "" when not provided and the doc is not found', () => {
    expect(buildLocationValue(locations, 'missing-id')).toMatchObject({ locality: '' });
  });

  it('fills the full value from the doc and matched zone (zone pincode wins)', () => {
    expect(buildLocationValue(locations, 'loc-1', 'Indiranagar')).toEqual({
      location_id: 'loc-1',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      state_code: 'KA',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      pincode: '560038',
    });
  });

  it('falls back to the city pincode when the matched zone has no pincode of its own', () => {
    expect(buildLocationValue(locations, 'loc-1', 'Koramangala')).toMatchObject({
      locality: 'Koramangala',
      pincode: '560001',
    });
  });

  it('clears locality/uses the city pincode when the locality does not match any zone', () => {
    expect(buildLocationValue(locations, 'loc-1', 'Nonexistent')).toMatchObject({
      locality: '',
      pincode: '560001',
    });
  });

  it('defaults locality to "" when not provided and the doc is found', () => {
    expect(buildLocationValue(locations, 'loc-1')).toMatchObject({ locality: '' });
  });
});

describe('useLocationValueFromId', () => {
  it('returns EMPTY_LOCATION when no locationId is given', () => {
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
    const { result } = renderHook(() => useLocationValueFromId(undefined));
    expect(result.current).toMatchObject({ location_id: '', city: '' });
  });

  it('returns EMPTY_LOCATION when locationId is null', () => {
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
    const { result } = renderHook(() => useLocationValueFromId(null));
    expect(result.current).toMatchObject({ location_id: '', city: '' });
  });

  it('hydrates a full value once the admin list has loaded', () => {
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
    const { result } = renderHook(() => useLocationValueFromId('loc-1', 'Indiranagar'));
    expect(result.current).toMatchObject({ city: 'Bengaluru', locality: 'Indiranagar', pincode: '560038' });
  });

  it('defaults locality to "" when not passed', () => {
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
    const { result } = renderHook(() => useLocationValueFromId('loc-1'));
    expect(result.current).toMatchObject({ city: 'Bengaluru', locality: '' });
  });
});

describe('buildLocationValueFromNames', () => {
  it('returns the saved names directly when no city name is given', () => {
    expect(buildLocationValueFromNames(locations, { country: 'India' })).toMatchObject({
      location_id: '',
      country: 'India',
      state: '',
      city: '',
      locality: '',
    });
  });

  it('returns default empty strings for every unset name field', () => {
    expect(buildLocationValueFromNames(locations, {})).toMatchObject({
      country: '',
      state: '',
      city: '',
      locality: '',
    });
  });

  it('matches a doc by city name alone (case-insensitive), ignoring unset state/country', () => {
    const result = buildLocationValueFromNames(locations, { city: 'bengaluru' });
    expect(result).toMatchObject({ location_id: 'loc-1', city: 'Bengaluru' });
  });

  it('matches a doc by city+state+country names (case-insensitive)', () => {
    const result = buildLocationValueFromNames(locations, {
      city: 'BENGALURU',
      state: 'karnataka',
      country: 'INDIA',
      locality: 'Indiranagar',
    });
    expect(result).toMatchObject({ location_id: 'loc-1', locality: 'Indiranagar', pincode: '560038' });
  });

  it('falls back to the saved names when the state name does not match any doc', () => {
    const result = buildLocationValueFromNames(locations, { city: 'Bengaluru', state: 'Wrong State' });
    expect(result).toMatchObject({ location_id: '', city: 'Bengaluru', state: 'Wrong State' });
  });

  it('falls back to the saved names when the country name does not match any doc', () => {
    const result = buildLocationValueFromNames(locations, { city: 'Bengaluru', country: 'Wrong Country' });
    expect(result).toMatchObject({ location_id: '', city: 'Bengaluru', country: 'Wrong Country' });
  });

  it('falls back to the saved names when the city itself has no match', () => {
    const result = buildLocationValueFromNames(locations, { city: 'Nowhere' });
    expect(result).toMatchObject({ location_id: '', city: 'Nowhere' });
  });

  it('defaults locality to "" on a matched doc when no locality name is given', () => {
    const result = buildLocationValueFromNames(locations, { city: 'Bengaluru' });
    expect(result).toMatchObject({ locality: '' });
  });

  it('treats a malformed doc field (undefined) as an empty string when comparing names', () => {
    // Simulates an incomplete admin record — country/state fields aren't optional per the
    // LocationDoc type, but defend against bad data reaching the comparison anyway.
    const malformed = [{ ...locations[0], country: undefined as unknown as string }];
    const result = buildLocationValueFromNames(malformed, { city: 'Bengaluru', country: 'India' });
    expect(result).toMatchObject({ location_id: '', city: 'Bengaluru' });
  });
});
