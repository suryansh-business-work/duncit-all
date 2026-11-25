import { describe, expect, it } from 'vitest';
import { NEARBY_RADIUS, makeNearbyLeadsSchema, nearbyLeadsDefaults } from '../src/schemas/nearby-leads';

/** A Nearby leads search: the key and its vars are echoed, so each assertion names the message shown. */
const schema = makeNearbyLeadsSchema((key, options) =>
  options?.vars ? `${key}(${Object.values(options.vars).join('-')})` : key,
);
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse({ ...nearbyLeadsDefaults, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('makeNearbyLeadsSchema', () => {
  it('starts around my position at the initial radius, with no city needed', () => {
    expect(nearbyLeadsDefaults).toEqual({ source: 'me', city: '', area: '', radius_km: NEARBY_RADIUS.initial });
    expect(issues({})).toEqual([]);
  });

  it('needs a city when searching around a place, and trims city and area', () => {
    expect(issues({ source: 'place', city: '  ' })).toEqual(['city:crm.nearby.cityRequired']);
    const parsed = schema.safeParse({ ...nearbyLeadsDefaults, source: 'place', city: ' Mumbai ', area: ' Bandra ' });
    expect(parsed.success && parsed.data).toMatchObject({ city: 'Mumbai', area: 'Bandra' });
  });

  it('keeps the radius inside what the server accepts, ends included', () => {
    expect(issues({ radius_km: NEARBY_RADIUS.min })).toEqual([]);
    expect(issues({ radius_km: NEARBY_RADIUS.max })).toEqual([]);
    expect(issues({ radius_km: 0.4 })).toEqual(['radius_km:crm.nearby.radiusRange(0.5-50)']);
    expect(issues({ radius_km: 51 })).toEqual(['radius_km:crm.nearby.radiusRange(0.5-50)']);
  });

  it('refuses a radius that is not a number, and an unknown centre source', () => {
    expect(issues({ radius_km: Number.NaN })).toEqual(['radius_km:crm.nearby.radiusRange(0.5-50)']);
    expect(issues({ source: 'gps' })).toHaveLength(1);
  });
});
