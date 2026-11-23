/**
 * The centre and radius of a Nearby leads search are checked before any
 * query runs: the radius stays inside its bounds, coordinates come as a sane
 * pair, and a city is placed through the admin Location list.
 */
jest.mock('@modules/platform/location/location.geo', () => ({ cityAreaPoint: jest.fn() }));

import { cityAreaPoint } from '@modules/platform/location/location.geo';
import { leadTableConfig } from '@modules/crm/crm/crm.service';
import { NEARBY_RADIUS_KM, nearCentre, nearbyTableConfig } from '../../leadGeo.nearby';

const cityAreaPointMock = cityAreaPoint as jest.Mock;
const BANDRA = { lat: 19.0596, lng: 72.8295 };

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { extensions?: { code?: string } }).extensions?.code;
  }
  return 'NO_ERROR';
};

afterEach(() => jest.clearAllMocks());

describe('nearCentre', () => {
  it('uses the searcher position as it is', async () => {
    await expect(nearCentre({ ...BANDRA, radius_km: 5 })).resolves.toEqual(BANDRA);
    expect(cityAreaPointMock).not.toHaveBeenCalled();
  });

  it('accepts the radius bounds themselves', async () => {
    await expect(nearCentre({ ...BANDRA, radius_km: NEARBY_RADIUS_KM.min })).resolves.toEqual(BANDRA);
    await expect(nearCentre({ ...BANDRA, radius_km: NEARBY_RADIUS_KM.max })).resolves.toEqual(BANDRA);
  });

  it.each([0, 0.4, 50.1, -3, Number.NaN, Number.POSITIVE_INFINITY])('refuses a radius of %p km', async (radius_km) => {
    expect(await codeOf(nearCentre({ ...BANDRA, radius_km }))).toBe('BAD_USER_INPUT');
  });

  it('refuses half a position or coordinates off the globe', async () => {
    expect(await codeOf(nearCentre({ lat: 19.05, radius_km: 5 }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(nearCentre({ lng: 72.8, radius_km: 5 }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(nearCentre({ lat: 91, lng: 72.8, radius_km: 5 }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(nearCentre({ lat: 19.05, lng: -181, radius_km: 5 }))).toBe('BAD_USER_INPUT');
  });

  it('places a picked city and area through the Location list', async () => {
    cityAreaPointMock.mockResolvedValue(BANDRA);
    await expect(nearCentre({ city: ' Mumbai ', area: 'Bandra', radius_km: 3 })).resolves.toEqual(BANDRA);
    expect(cityAreaPointMock).toHaveBeenCalledWith('Mumbai', 'Bandra');
  });

  it('says so when the picked place cannot be put on the map', async () => {
    cityAreaPointMock.mockResolvedValue(null);
    expect(await codeOf(nearCentre({ city: 'Atlantis', radius_km: 3 }))).toBe('FAILED_PRECONDITION');
  });

  it('needs a position or a city', async () => {
    expect(await codeOf(nearCentre({ city: '  ', radius_km: 3 }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(nearCentre({ radius_km: 3 }))).toBe('BAD_USER_INPUT');
  });
});

describe('nearbyTableConfig', () => {
  it('adds a sortable, filterable distance and sorts nearest first by default', () => {
    const base = leadTableConfig('venue_name');
    const config = nearbyTableConfig(base);
    expect(config.sortFields).toEqual({ ...base.sortFields, distance_km: 'distance_km' });
    expect(config.filterFields.distance_km).toEqual({ type: 'number' });
    expect(config.defaultSort).toEqual({ distance_km: 1 });
    expect(config.searchFields).toEqual(base.searchFields);
    expect(base.defaultSort).toEqual({ next_follow_up_date: 1 });
  });
});
