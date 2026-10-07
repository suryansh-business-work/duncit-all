import { Types } from 'mongoose';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { LocationModel } from './location.model';

export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const GEOCODE_TIMEOUT_MS = 5000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isPoint = (lat?: number | null, lng?: number | null): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);

/** One address → one point through the platform's Google Maps key; null when unset or unknown. */
async function geocode(address: string): Promise<GeoPoint | null> {
  const key = await getRuntimeEnvValue('GOOGLE_MAP_API');
  if (!key || !address.trim()) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
    const body = (await res.json()) as { status?: string; results?: { geometry?: { location?: GeoPoint } }[] };
    const point = body.results?.[0]?.geometry?.location;
    if (body.status !== 'OK' || !point) {
      logs.server.warn('location-geo', 'geocode', { status: body.status, msg: 'no geocode result' });
      return null;
    }
    return { lat: point.lat, lng: point.lng };
  } catch (error) {
    logs.server.error('location-geo', 'geocode', { error, msg: 'geocode request failed' });
    return null;
  }
}

interface LeanLocation {
  _id: Types.ObjectId;
  location_name?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  location_zones?: { zone_name: string; lat?: number | null; lng?: number | null }[];
}

/**
 * The point a city — or an area inside it — stands for, the centre every
 * "nearby" search measures from. Admins never enter coordinates: the first
 * lookup geocodes the name with the platform Maps key and stores the answer on
 * the Location, so each area costs one Google call, ever. An area that cannot
 * be geocoded falls back to its city.
 */
export async function locationPoint(locationId: string, zoneName?: string | null): Promise<GeoPoint | null> {
  if (!Types.ObjectId.isValid(locationId)) return null;
  const loc = await LocationModel.findById(locationId)
    .select('location_name city state country lat lng location_zones')
    .lean<LeanLocation>();
  if (!loc) return null;
  const cityName = loc.city || loc.location_name || '';
  const region = [cityName, loc.state, loc.country].filter(Boolean).join(', ');

  const zone = zoneName
    ? loc.location_zones?.find((z) => z.zone_name.toLowerCase() === zoneName.trim().toLowerCase())
    : undefined;
  if (zone) {
    if (isPoint(zone.lat, zone.lng)) return { lat: zone.lat, lng: zone.lng as number };
    const point = await geocode(`${zone.zone_name}, ${region}`);
    if (point) {
      await LocationModel.updateOne(
        { _id: loc._id },
        { $set: { 'location_zones.$[z].lat': point.lat, 'location_zones.$[z].lng': point.lng } },
        { arrayFilters: [{ 'z.zone_name': zone.zone_name }] }
      );
      return point;
    }
  }
  if (isPoint(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng as number };
  const point = await geocode(region);
  if (point) await LocationModel.updateOne({ _id: loc._id }, { $set: { lat: point.lat, lng: point.lng } });
  return point;
}

/** `locationPoint` memoised for one request — a search resolves each (city, area) once. */
export function pointResolver() {
  const cache = new Map<string, Promise<GeoPoint | null>>();
  return (locationId: string, zoneName?: string | null) => {
    const key = `${locationId}|${(zoneName ?? '').toLowerCase()}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = locationPoint(locationId, zoneName);
      cache.set(key, hit);
    }
    return hit;
  };
}
