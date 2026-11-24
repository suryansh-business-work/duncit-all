import { GraphQLError } from 'graphql';
import type { PipelineStage } from 'mongoose';
import { cityAreaPoint, type GeoPoint } from '@modules/platform/location/location.geo';
import { LEAD_MODELS } from '@modules/crm/crm/leadModels';
import { runTableAggregate, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { placeUnplacedLeads, toGeoJson, type LeadGeoKind } from './leadGeo.place';

/** The radius a Nearby leads search may ask for, in km. */
export const NEARBY_RADIUS_KM = { min: 0.5, max: 50 } as const;

/** A Nearby leads search: a position (lat + lng) or a city (and area) from the admin Location list, and a radius. */
export interface LeadNearInput {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  area?: string | null;
  radius_km: number;
}

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};
const isNumber = (value?: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

/** The search centre, after checking the radius and coordinates are sane. */
export async function nearCentre(near: LeadNearInput): Promise<GeoPoint> {
  const radius = near.radius_km;
  if (!isNumber(radius) || radius < NEARBY_RADIUS_KM.min || radius > NEARBY_RADIUS_KM.max) {
    fail('BAD_USER_INPUT', `Radius must be between ${NEARBY_RADIUS_KM.min} and ${NEARBY_RADIUS_KM.max} km`);
  }
  const hasLat = near.lat !== null && near.lat !== undefined;
  const hasLng = near.lng !== null && near.lng !== undefined;
  if (hasLat || hasLng) {
    const { lat, lng } = near;
    if (isNumber(lat) && isNumber(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    return fail('BAD_USER_INPUT', 'Give a valid latitude and longitude together');
  }
  const city = near.city?.trim();
  if (!city) return fail('BAD_USER_INPUT', 'Give your position or pick a city');
  const point = await cityAreaPoint(city, near.area);
  return point ?? fail('FAILED_PRECONDITION', 'This place cannot be put on the map yet');
}

/** The lead table's allowlists plus the computed distance, nearest first unless another sort is picked. */
export function nearbyTableConfig(config: TableEntityConfig): TableEntityConfig {
  return {
    ...config,
    sortFields: { ...config.sortFields, distance_km: 'distance_km' },
    filterFields: { ...config.filterFields, distance_km: { type: 'number' } },
    defaultSort: { distance_km: 1 },
  };
}

interface NearbyModel {
  aggregate(pipeline: PipelineStage[]): PromiseLike<unknown[]>;
  countDocuments(filter: Record<string, unknown>): PromiseLike<number>;
}
const nearbyModelOf = (kind: LeadGeoKind) => LEAD_MODELS[kind] as unknown as NearbyModel;

/**
 * One page of the leads within `radius_km` of the centre, with each row's
 * `distance_km`, under the table's own search, filters, sort and paging.
 * Leads not placed yet are placed first; `unplaced` counts the ones that
 * still have no point (no city, or a city the map does not know).
 */
export async function nearbyLeadTable<TDoc>(
  kind: LeadGeoKind,
  near: LeadNearInput,
  input: TableQueryInput | null | undefined,
  config: TableEntityConfig,
  /** A filter the caller resolved itself (the Devices filter), applied inside the radius. */
  baseFilter: Record<string, unknown> = {}
) {
  const centre = await nearCentre(near);
  await placeUnplacedLeads(kind);
  const model = nearbyModelOf(kind);
  const stages: PipelineStage[] = [
    {
      $geoNear: {
        near: toGeoJson(centre),
        key: 'geo',
        distanceField: 'distance_km',
        distanceMultiplier: 0.001,
        maxDistance: near.radius_km * 1000,
        spherical: true,
        ...(Object.keys(baseFilter).length > 0 ? { query: baseFilter } : {}),
      },
    },
  ];
  const [page, unplaced] = await Promise.all([
    runTableAggregate<TDoc>(model, stages, input, nearbyTableConfig(config)),
    model.countDocuments({ geo: null }),
  ]);
  return { ...page, unplaced };
}
