/**
 * Placing a CRM lead on the map: coordinates read out of a full Google Maps
 * link, the area/city fallback (never claiming AREA when the area resolved to
 * the city's own point), one lookup per (city, area) per batch, and the edit
 * rule that drops a stored point when the lead's location changes.
 */
jest.mock('@modules/platform/location/location.geo', () => ({ cityAreaPoint: jest.fn() }));

import { cityAreaPoint } from '@modules/platform/location/location.geo';
import {
  leadPlace,
  leadUpdate,
  mapLinkPoint,
  placeResolver,
  staleGeoUnset,
  toGeoJson,
} from '../../leadGeo.place';

const cityAreaPointMock = cityAreaPoint as jest.Mock;

const MUMBAI = { lat: 19.076, lng: 72.8777 };
const BANDRA = { lat: 19.0596, lng: 72.8295 };

afterEach(() => jest.clearAllMocks());

describe('mapLinkPoint', () => {
  it('prefers the place pin (!3d…!4d…) over the map centre (@…)', () => {
    const link = 'https://www.google.com/maps/place/Cafe/@19.1,72.9,17z/data=!3m1!4b1!4m6!3m5!8m2!3d19.0596!4d72.8295';
    expect(mapLinkPoint(link)).toEqual(BANDRA);
  });

  it('reads the map centre of a place or search link', () => {
    expect(mapLinkPoint('https://www.google.com/maps/@19.0596,72.8295,15z')).toEqual(BANDRA);
  });

  it.each(['q', 'query', 'll', 'destination', 'center'])('reads a "lat,lng" %s parameter', (param) => {
    expect(mapLinkPoint(`https://maps.google.com/?${param}=19.0596,%2072.8295`)).toEqual(BANDRA);
  });

  it('ignores a parameter that names a place rather than coordinates', () => {
    expect(mapLinkPoint('https://maps.google.com/?q=Bandra+West+Mumbai')).toBeNull();
  });

  it('finds nothing in a short share link, a blank value or text that is not a URL', () => {
    expect(mapLinkPoint('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
    expect(mapLinkPoint('')).toBeNull();
    expect(mapLinkPoint('   ')).toBeNull();
    expect(mapLinkPoint(null)).toBeNull();
    expect(mapLinkPoint(undefined)).toBeNull();
    expect(mapLinkPoint('near the station')).toBeNull();
  });

  it('rejects coordinates outside the globe', () => {
    expect(mapLinkPoint('https://www.google.com/maps/@95.1,72.8,15z')).toBeNull();
    expect(mapLinkPoint('https://maps.google.com/?q=19.05,190.2')).toBeNull();
  });
});

describe('leadPlace', () => {
  const resolverFor = (points: Record<string, { lat: number; lng: number } | null>) =>
    jest.fn(async (city: string, area?: string | null) => points[`${city}|${area ?? ''}`] ?? null);

  it('uses the map link pin before anything else, without a lookup', async () => {
    const resolve = resolverFor({});
    const place = await leadPlace(
      { city: 'Mumbai', area: 'Bandra', map_link: 'https://www.google.com/maps/@19.0596,72.8295,15z' },
      resolve
    );
    expect(place).toEqual({ point: BANDRA, precision: 'PIN' });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("places a lead at its area's centre when the area is known", async () => {
    const resolve = resolverFor({ 'Mumbai|': MUMBAI, 'Mumbai|Bandra': BANDRA });
    expect(await leadPlace({ city: 'Mumbai', area: ' Bandra ', map_link: '' }, resolve)).toEqual({
      point: BANDRA,
      precision: 'AREA',
    });
  });

  it('reports CITY when the area fell back to the city point', async () => {
    const resolve = resolverFor({ 'Mumbai|': MUMBAI, 'Mumbai|Colaba': MUMBAI });
    expect(await leadPlace({ city: 'Mumbai', area: 'Colaba' }, resolve)).toEqual({ point: MUMBAI, precision: 'CITY' });
  });

  it('uses the city centre when there is no area, or the area is unknown', async () => {
    const resolve = resolverFor({ 'Mumbai|': MUMBAI });
    expect(await leadPlace({ city: 'Mumbai' }, resolve)).toEqual({ point: MUMBAI, precision: 'CITY' });
    expect(await leadPlace({ city: 'Mumbai', area: 'Nowhere' }, resolve)).toEqual({ point: MUMBAI, precision: 'CITY' });
  });

  it('keeps an area point even when the city itself cannot be placed', async () => {
    const resolve = resolverFor({ 'Mumbai|Bandra': BANDRA });
    expect(await leadPlace({ city: 'Mumbai', area: 'Bandra' }, resolve)).toEqual({ point: BANDRA, precision: 'AREA' });
  });

  it('cannot place a lead with no city, or a city the map does not know', async () => {
    const resolve = resolverFor({});
    expect(await leadPlace({ city: '  ', area: 'Bandra' }, resolve)).toBeNull();
    expect(await leadPlace({}, resolve)).toBeNull();
    expect(await leadPlace({ city: 'Atlantis' }, resolve)).toBeNull();
  });
});

describe('placeResolver', () => {
  it('looks each (city, area) up once per batch, ignoring case and spacing', async () => {
    cityAreaPointMock.mockResolvedValue(BANDRA);
    const resolve = placeResolver();
    await Promise.all([resolve('Mumbai', 'Bandra'), resolve(' mumbai ', 'BANDRA '), resolve('Mumbai')]);
    expect(cityAreaPointMock).toHaveBeenCalledTimes(2);
    expect(cityAreaPointMock).toHaveBeenCalledWith('Mumbai', 'Bandra');
    expect(cityAreaPointMock).toHaveBeenCalledWith('Mumbai', undefined);
  });

  it('starts every batch with an empty memo', async () => {
    cityAreaPointMock.mockResolvedValue(MUMBAI);
    await placeResolver()('Mumbai');
    await placeResolver()('Mumbai');
    expect(cityAreaPointMock).toHaveBeenCalledTimes(2);
  });
});

describe('stale points on edit', () => {
  it('drops the stored point when city, area or map link is part of the edit', () => {
    for (const field of ['city', 'area', 'map_link']) {
      expect(staleGeoUnset({ [field]: 'x' })).toEqual({ geo: 1, geo_precision: 1, geo_checked_at: 1 });
    }
  });

  it('leaves the point alone when the edit does not touch the location', () => {
    expect(staleGeoUnset({ lead_status: 'Contacted', notes: 'called' })).toBeNull();
  });

  it('builds the update document with or without the $unset', () => {
    expect(leadUpdate({ lead_status: 'Won' }, { lead_status: 'Won' })).toEqual({ $set: { lead_status: 'Won' } });
    expect(leadUpdate({ area: 'Bandra' }, { area: 'Bandra' })).toEqual({
      $set: { area: 'Bandra' },
      $unset: { geo: 1, geo_precision: 1, geo_checked_at: 1 },
    });
  });

  it('stores points longitude first, as GeoJSON wants', () => {
    expect(toGeoJson(BANDRA)).toEqual({ type: 'Point', coordinates: [72.8295, 19.0596] });
  });
});
