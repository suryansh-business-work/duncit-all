/**
 * The point a city (or an area inside it) stands for: cached coordinates are
 * used as they are, missing ones are geocoded once with the platform Maps key
 * and stored on the Location, an area that cannot be placed falls back to its
 * city, and nothing is placed without a key. Google is never called — `fetch`
 * and the runtime env are faked.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));

import { Types } from 'mongoose';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { LocationModel } from '../../location.model';
import { distanceKm, locationPoint, pointResolver } from '../../location.geo';

const envValue = getRuntimeEnvValue as jest.Mock;
const warn = logs.server.warn as jest.Mock;
const logError = logs.server.error as jest.Mock;
let fetchSpy: jest.SpyInstance;

const geocodeReply = (body: unknown) => ({ json: async () => body }) as unknown as Response;
const ok = (lat: number, lng: number) => geocodeReply({ status: 'OK', results: [{ geometry: { location: { lat, lng } } }] });

async function seedCity(over: Record<string, unknown> = {}) {
  const loc = await LocationModel.create({
    location_id: `mumbai-${new Types.ObjectId().toString()}`,
    location_name: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    location_image: 'https://img.example.test/mumbai.jpg',
    location_pincode: '400001',
    location_zones: [{ zone_name: 'Bandra' }, { zone_name: 'Andheri', lat: 19.11, lng: 72.86 }],
    ...over,
  });
  return String(loc._id);
}

beforeEach(() => {
  envValue.mockResolvedValue('maps-key');
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('unexpected network call');
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('distanceKm', () => {
  it('is zero for the same point and symmetric', () => {
    const a = { lat: 19.076, lng: 72.8777 };
    const b = { lat: 18.5204, lng: 73.8567 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });

  it('measures Mumbai to Pune at about 120 km great-circle', () => {
    const km = distanceKm({ lat: 19.076, lng: 72.8777 }, { lat: 18.5204, lng: 73.8567 });
    expect(km).toBeGreaterThan(115);
    expect(km).toBeLessThan(125);
  });

  it('measures one degree of latitude at about 111 km', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });
});

describe('locationPoint', () => {
  it('returns null for a malformed id or a missing location without any lookup', async () => {
    expect(await locationPoint('not-an-id')).toBeNull();
    expect(await locationPoint(new Types.ObjectId().toString())).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses an area's cached point as it is", async () => {
    const id = await seedCity({ lat: 19.07, lng: 72.87 });
    expect(await locationPoint(id, '  andheri ')).toEqual({ lat: 19.11, lng: 72.86 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the city's cached point when no area is given or the area is unknown", async () => {
    const id = await seedCity({ lat: 19.07, lng: 72.87 });
    expect(await locationPoint(id)).toEqual({ lat: 19.07, lng: 72.87 });
    expect(await locationPoint(id, 'Atlantis')).toEqual({ lat: 19.07, lng: 72.87 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('geocodes an unplaced area with its city, state and country, then stores it on that area only', async () => {
    const id = await seedCity();
    fetchSpy.mockResolvedValueOnce(ok(19.06, 72.83));

    expect(await locationPoint(id, 'Bandra')).toEqual({ lat: 19.06, lng: 72.83 });
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain(`address=${encodeURIComponent('Bandra, Mumbai, Maharashtra, India')}`);
    expect(url).toContain('key=maps-key');

    const stored = await LocationModel.findById(id).lean();
    expect(stored?.location_zones).toEqual([
      expect.objectContaining({ zone_name: 'Bandra', lat: 19.06, lng: 72.83 }),
      expect.objectContaining({ zone_name: 'Andheri', lat: 19.11, lng: 72.86 }),
    ]);
    expect(stored?.lat).toBeNull();

    // Second lookup reads the stored point: one Google call per area, ever.
    expect(await locationPoint(id, 'Bandra')).toEqual({ lat: 19.06, lng: 72.83 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the city when the area cannot be geocoded, and stores the city point', async () => {
    const id = await seedCity();
    fetchSpy.mockResolvedValueOnce(geocodeReply({ status: 'ZERO_RESULTS', results: [] })).mockResolvedValueOnce(ok(19.07, 72.87));

    expect(await locationPoint(id, 'Bandra')).toEqual({ lat: 19.07, lng: 72.87 });
    expect(String(fetchSpy.mock.calls[1][0])).toContain(`address=${encodeURIComponent('Mumbai, Maharashtra, India')}`);
    expect(warn).toHaveBeenCalledWith('location-geo', 'geocode', expect.objectContaining({ status: 'ZERO_RESULTS' }));

    const stored = await LocationModel.findById(id).lean();
    expect(stored).toMatchObject({ lat: 19.07, lng: 72.87 });
    expect(stored?.location_zones[0]).toMatchObject({ zone_name: 'Bandra', lat: null, lng: null });
  });

  it('uses location_name when the city field is blank', async () => {
    const id = await seedCity({ city: '', state: '', country: '', location_zones: [] });
    fetchSpy.mockResolvedValueOnce(ok(1, 2));
    expect(await locationPoint(id)).toEqual({ lat: 1, lng: 2 });
    expect(String(fetchSpy.mock.calls[0][0])).toContain('address=Mumbai&');
  });

  it('returns null and stores nothing when no Maps key is configured', async () => {
    envValue.mockResolvedValue('');
    const id = await seedCity();
    expect(await locationPoint(id, 'Bandra')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await LocationModel.findById(id).lean()).toMatchObject({ lat: null, lng: null });
  });

  it('returns null when Google answers OK without a point', async () => {
    const id = await seedCity({ location_zones: [] });
    fetchSpy.mockResolvedValueOnce(geocodeReply({ status: 'OK', results: [{}] }));
    expect(await locationPoint(id)).toBeNull();
    expect(warn).toHaveBeenCalledWith('location-geo', 'geocode', expect.objectContaining({ status: 'OK' }));
  });

  it('logs a failed request and returns null instead of throwing', async () => {
    const id = await seedCity({ location_zones: [] });
    const failure = new Error('socket hang up');
    fetchSpy.mockRejectedValueOnce(failure);
    expect(await locationPoint(id)).toBeNull();
    expect(logError).toHaveBeenCalledWith('location-geo', 'geocode', expect.objectContaining({ error: failure }));
  });
});

describe('pointResolver', () => {
  it('resolves each (city, area) once per resolver, case-insensitively on the area', async () => {
    const id = await seedCity({ location_zones: [{ zone_name: 'Bandra' }] });
    fetchSpy.mockResolvedValue(ok(19.06, 72.83));
    const findById = jest.spyOn(LocationModel, 'findById');

    const resolve = pointResolver();
    const [a, b] = await Promise.all([resolve(id, 'Bandra'), resolve(id, 'BANDRA')]);
    expect(a).toEqual({ lat: 19.06, lng: 72.83 });
    expect(b).toBe(a);
    expect(findById).toHaveBeenCalledTimes(1);

    // A different key (no area) is its own lookup; a fresh resolver starts empty.
    await resolve(id);
    expect(findById).toHaveBeenCalledTimes(2);
    await pointResolver()(id, 'bandra');
    expect(findById).toHaveBeenCalledTimes(3);
    findById.mockRestore();
  });
});
