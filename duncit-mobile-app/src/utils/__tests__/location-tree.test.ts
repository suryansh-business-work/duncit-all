import {
  buildLocationTree,
  countryFlagUrl,
  locationMapEmbedUrl,
  locationMapQuery,
} from '@/utils/location-tree';
import type { LocationItem } from '@/stores/location.store';

const loc = (over: Partial<LocationItem>): LocationItem =>
  ({
    id: 'x',
    location_name: 'City',
    city: 'City',
    state: 'State',
    state_code: 'ST',
    country: 'India',
    country_code: 'IN',
    location_image: '',
    location_pincode: '',
    location_zones: [],
    ...over,
  }) as LocationItem;

describe('countryFlagUrl', () => {
  it('builds a flagcdn url for a code and empty for none', () => {
    expect(countryFlagUrl('IN')).toBe('https://flagcdn.com/48x36/in.png');
    expect(countryFlagUrl('')).toBe('');
    expect(countryFlagUrl(null)).toBe('');
  });
});

describe('buildLocationTree', () => {
  it('groups and sorts country → state → city', () => {
    const tree = buildLocationTree([
      loc({ id: 'b', location_name: 'Mumbai', state: 'Maharashtra', country: 'India' }),
      loc({ id: 'a', location_name: 'Pune', state: 'Maharashtra', country: 'India' }),
      loc({ id: 'd', location_name: 'Dubai', state: 'Dubai', country: 'UAE', country_code: 'AE' }),
      loc({ id: 'c', location_name: 'Delhi', state: 'Delhi', country: 'India' }),
    ]);
    expect(tree.map((c) => c.country)).toEqual(['India', 'UAE']);
    const india = tree[0]!;
    expect(india.states.map((s) => s.state)).toEqual(['Delhi', 'Maharashtra']);
    expect(india.states[1]!.cities.map((c) => c.location_name)).toEqual(['Mumbai', 'Pune']);
    expect(tree[1]!.country_code).toBe('AE');
  });

  it('falls back to "Other" for missing country/state', () => {
    const tree = buildLocationTree([loc({ country: '', state: '', country_code: '' })]);
    expect(tree[0]!.country).toBe('Other');
    expect(tree[0]!.states[0]!.state).toBe('Other');
  });
});

describe('locationMapQuery / locationMapEmbedUrl', () => {
  it('joins non-empty parts', () => {
    expect(locationMapQuery('Mumbai', 'Andheri', '400001', 'India')).toBe(
      'Andheri, Mumbai, 400001, India',
    );
    expect(locationMapQuery('', '', '', '')).toBe('');
  });

  it('builds an embed url only with a key and query', () => {
    expect(locationMapEmbedUrl('key', 'Mumbai')).toContain('key=key');
    expect(locationMapEmbedUrl('key', 'Mumbai')).toContain('q=Mumbai');
    expect(locationMapEmbedUrl('', 'Mumbai')).toBe('');
    expect(locationMapEmbedUrl('key', '')).toBe('');
  });
});
