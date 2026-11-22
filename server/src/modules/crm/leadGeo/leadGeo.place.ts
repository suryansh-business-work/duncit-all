import type { Types } from 'mongoose';
import { cityAreaPoint, type GeoPoint } from '@modules/platform/location/location.geo';
import { LEAD_MODELS } from '@modules/crm/crm/leadModels';

export type LeadGeoKind = keyof typeof LEAD_MODELS;

/** How exactly a lead sits on the map: its own map-link pin, its area's centre, or its city's. */
export type GeoPrecision = 'PIN' | 'AREA' | 'CITY';

/** A stored lead point (GeoJSON, longitude first) — what the 2dsphere index reads. */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

/** The lead fields that decide where it is. Editing any of them makes the stored point stale. */
export const LEAD_LOCATION_FIELDS = ['city', 'area', 'map_link'] as const;

/** Leads placed per nearby search; the rest are placed by the searches after it. */
export const PLACE_BATCH = 1000;

const COORD = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
/** `!3d<lat>!4d<lng>` is the place's own pin inside a Google Maps URL; `@<lat>,<lng>` the map centre. */
const PIN_PATTERNS = [new RegExp(`!3d${COORD}!4d${COORD}`), new RegExp(`@${COORD},${COORD}`)];
const PAIR = new RegExp(`^${COORD},\\s*${COORD}$`);
const POINT_PARAMS = ['q', 'query', 'll', 'destination', 'center'];

const inRange = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const pointOf = (lat: string, lng: string): GeoPoint | null => {
  const point = { lat: Number(lat), lng: Number(lng) };
  return inRange(point.lat, point.lng) ? point : null;
};

/**
 * The coordinates a full Google Maps link carries, if any. Short share links
 * (maps.app.goo.gl) carry none, so those leads fall back to their area.
 */
export function mapLinkPoint(link?: string | null): GeoPoint | null {
  const text = link?.trim();
  if (!text) return null;
  for (const pattern of PIN_PATTERNS) {
    const match = pattern.exec(text);
    const point = match && pointOf(match[1], match[2]);
    if (point) return point;
  }
  let params: URLSearchParams;
  try {
    params = new URL(text).searchParams;
  } catch {
    return null;
  }
  for (const name of POINT_PARAMS) {
    const match = PAIR.exec(params.get(name)?.trim() ?? '');
    const point = match && pointOf(match[1], match[2]);
    if (point) return point;
  }
  return null;
}

type Resolve = (city: string, area?: string | null) => Promise<GeoPoint | null>;

/** `cityAreaPoint` memoised for one batch, so each (city, area) is looked up once. */
export function placeResolver(): Resolve {
  const cache = new Map<string, Promise<GeoPoint | null>>();
  return (city, area) => {
    const key = `${city.trim().toLowerCase()}|${(area ?? '').trim().toLowerCase()}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = cityAreaPoint(city, area);
      cache.set(key, hit);
    }
    return hit;
  };
}

interface LeadPlaceFields {
  city?: string | null;
  area?: string | null;
  map_link?: string | null;
}

const samePoint = (a: GeoPoint, b: GeoPoint) => a.lat === b.lat && a.lng === b.lng;

/**
 * Where a lead is: its map-link pin, else its area's centre, else its city's.
 * An area that resolves to the city's own point (it could not be geocoded) is
 * reported as CITY, so the table never claims more precision than it has.
 */
export async function leadPlace(
  lead: LeadPlaceFields,
  resolve: Resolve
): Promise<{ point: GeoPoint; precision: GeoPrecision } | null> {
  const pin = mapLinkPoint(lead.map_link);
  if (pin) return { point: pin, precision: 'PIN' };
  const city = lead.city?.trim();
  if (!city) return null;
  const cityPoint = await resolve(city);
  const area = lead.area?.trim();
  if (area) {
    const areaPoint = await resolve(city, area);
    if (areaPoint && !(cityPoint && samePoint(areaPoint, cityPoint))) return { point: areaPoint, precision: 'AREA' };
  }
  return cityPoint ? { point: cityPoint, precision: 'CITY' } : null;
}

export const toGeoJson = (point: GeoPoint): GeoJsonPoint => ({ type: 'Point', coordinates: [point.lng, point.lat] });

/**
 * The `$unset` an edit needs when it touches where the lead is: the stored
 * point goes, and the next nearby search places the lead again. Null when the
 * edit leaves the location alone.
 */
export function staleGeoUnset(input: Record<string, unknown>): Record<string, 1> | null {
  return LEAD_LOCATION_FIELDS.some((field) => field in input) ? { geo: 1, geo_precision: 1, geo_checked_at: 1 } : null;
}

/** The update document for a lead edit: `$set`, plus the `$unset` of a now-stale point. */
export function leadUpdate(set: Record<string, unknown>, input: Record<string, unknown>) {
  const unset = staleGeoUnset(input);
  return unset ? { $set: set, $unset: unset } : { $set: set };
}

interface UnplacedLead extends LeadPlaceFields {
  _id: Types.ObjectId;
}

/** The two calls made here; the five models' generic signatures differ only in their document type. */
interface PlaceModel {
  find(filter: Record<string, unknown>): {
    select(fields: string): { limit(n: number): { lean(): Promise<UnplacedLead[]> } };
  };
  bulkWrite(ops: Record<string, unknown>[], options: { ordered: boolean }): Promise<unknown>;
}
const placeModelOf = (kind: LeadGeoKind) => LEAD_MODELS[kind] as unknown as PlaceModel;

/**
 * Give a point to the leads of one kind never placed yet (new, imported, or
 * edited since). A lead that cannot be placed is still marked checked, so it
 * is not retried on every search; editing its location clears the mark.
 * Returns how many leads were looked at.
 */
export async function placeUnplacedLeads(kind: LeadGeoKind, limit = PLACE_BATCH): Promise<number> {
  const model = placeModelOf(kind);
  const leads = await model.find({ geo_checked_at: null }).select('city area map_link').limit(limit).lean();
  if (leads.length === 0) return 0;
  const resolve = placeResolver();
  const checkedAt = new Date();
  const ops = await Promise.all(
    leads.map(async (lead) => {
      const place = await leadPlace(lead, resolve);
      const update = place
        ? { $set: { geo: toGeoJson(place.point), geo_precision: place.precision, geo_checked_at: checkedAt } }
        : { $set: { geo_checked_at: checkedAt }, $unset: { geo: 1, geo_precision: 1 } };
      return { updateOne: { filter: { _id: lead._id }, update } };
    })
  );
  await model.bulkWrite(ops, { ordered: false });
  return leads.length;
}
