import { describe, it, expect } from 'vitest';
import {
  clubCountLabel,
  countryFlagUrl,
  buildLocationTree,
  locationMapQuery,
  type LocationLike,
} from '../location-tree';

const loc = (over: Partial<LocationLike>): LocationLike => ({
  id: Math.random().toString(),
  location_name: 'Loc',
  ...over,
});

describe('clubCountLabel', () => {
  it('returns empty-state text for null/zero/negative', () => {
    expect(clubCountLabel(null)).toBe('No Clubs Operating Yet');
    expect(clubCountLabel(0)).toBe('No Clubs Operating Yet');
    expect(clubCountLabel(-5)).toBe('No Clubs Operating Yet');
    expect(clubCountLabel()).toBe('No Clubs Operating Yet');
  });

  it('singularizes 1 and pluralizes many', () => {
    expect(clubCountLabel(1)).toBe('1 Club');
    expect(clubCountLabel(128)).toBe('128 Clubs');
  });
});

describe('countryFlagUrl', () => {
  it('builds a lowercased flag url', () => {
    expect(countryFlagUrl('IN')).toBe('https://flagcdn.com/24x18/in.png');
    expect(countryFlagUrl('  Us ')).toBe('https://flagcdn.com/24x18/us.png');
  });

  it('returns empty string when code missing', () => {
    expect(countryFlagUrl('')).toBe('');
    expect(countryFlagUrl(null)).toBe('');
    expect(countryFlagUrl(undefined)).toBe('');
  });
});

describe('buildLocationTree', () => {
  it('groups by country -> state -> city and sorts each level', () => {
    const locations: LocationLike[] = [
      loc({ id: '1', location_name: 'Zeta', country: 'India', country_code: 'IN', state: 'Karnataka', state_code: 'KA' }),
      loc({ id: '2', location_name: 'Alpha', country: 'India', country_code: 'IN', state: 'Karnataka', state_code: 'KA' }),
      loc({ id: '3', location_name: 'Beta', country: 'India', country_code: 'IN', state: 'Assam', state_code: 'AS' }),
      loc({ id: '4', location_name: 'Gamma', country: 'Australia', country_code: 'AU', state: 'NSW', state_code: 'NS' }),
    ];
    const tree = buildLocationTree(locations);

    // Countries sorted alphabetically: Australia before India
    expect(tree.map((c) => c.country)).toEqual(['Australia', 'India']);

    const india = tree.find((c) => c.country === 'India')!;
    // States sorted: Assam before Karnataka
    expect(india.states.map((s) => s.state)).toEqual(['Assam', 'Karnataka']);
    expect(india.country_code).toBe('IN');

    const karnataka = india.states.find((s) => s.state === 'Karnataka')!;
    // Cities sorted by name: Alpha before Zeta
    expect(karnataka.cities.map((c) => c.location_name)).toEqual(['Alpha', 'Zeta']);
    expect(karnataka.state_code).toBe('KA');
  });

  it('falls back to "Other" for missing country/state', () => {
    const tree = buildLocationTree([loc({ id: 'x', location_name: 'Nowhere' })]);
    expect(tree).toHaveLength(1);
    expect(tree[0].country).toBe('Other');
    expect(tree[0].country_code).toBe('');
    expect(tree[0].states[0].state).toBe('Other');
    expect(tree[0].states[0].state_code).toBe('');
  });

  it('returns empty array for no locations', () => {
    expect(buildLocationTree([])).toEqual([]);
  });
});

describe('locationMapQuery', () => {
  it('joins present parts in zone,city,pincode,country order', () => {
    expect(locationMapQuery('Bengaluru', 'Indiranagar', '560038', 'India')).toBe(
      'Indiranagar, Bengaluru, 560038, India',
    );
  });

  it('trims and drops empty/nullish parts', () => {
    expect(locationMapQuery('  City ', null, '', 'India')).toBe('City, India');
    expect(locationMapQuery()).toBe('');
  });
});
