import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { LocationModel } from '@modules/platform/location/location.model';
import { escapedSearchRegex } from '@utils/table-query';

const fail = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** Where a gig happens, or where a freelancer works, as stored. */
export interface GigPlace {
  location_id: Types.ObjectId | null;
  /** The city's display name: the Location's own, or the typed text on a legacy save. */
  city: string;
  locality: string;
}

interface PlaceInput {
  location_id?: string | null;
  locality?: string | null;
  city?: string | null;
}

const LOCATION_FIELDS = 'city location_name location_zones.zone_name';

/** The Location's display name — the same `city || location_name` pods and clubs show. */
const cityNameOf = (location: { city?: string | null; location_name?: string | null }) =>
  (location.city ?? '').trim() || (location.location_name ?? '').trim();

/**
 * Turns a validated input's place into what is stored.
 *
 * With a `location_id` the admin Location decides: it must exist and be active,
 * `city` is copied from it (whatever was typed), and `locality` must be one of
 * its zones, kept in the zone's own spelling (an edit may keep the row's
 * current Location even once it is switched off). Without one — a client built
 * before the picker — the typed city is kept as it always was, and a locality
 * is dropped, because an area only means something inside a known city.
 */
export async function resolveGigPlace(input: PlaceInput, keepLocationId?: string | null): Promise<GigPlace> {
  const id = (input.location_id ?? '').trim();
  if (!id) return { location_id: null, city: (input.city ?? '').trim(), locality: '' };
  if (!Types.ObjectId.isValid(id)) throw fail('Pick a city from the list');
  const oid = new Types.ObjectId(id);
  // An edit may keep a city an admin has since switched off, as it may keep a category.
  const active = id === keepLocationId ? {} : { is_active: true };
  const location = await LocationModel.findOne({ _id: oid, ...active })
    .select(LOCATION_FIELDS)
    .lean();
  if (!location) throw fail('Pick a city from the list');

  const wanted = (input.locality ?? '').trim().toLowerCase();
  const zone = wanted
    ? (location.location_zones ?? []).find((item) => item.zone_name.trim().toLowerCase() === wanted)
    : undefined;
  if (wanted && !zone) throw fail('Pick an area of that city from the list');

  return { location_id: oid, city: cityNameOf(location), locality: zone?.zone_name.trim() ?? '' };
}

/**
 * The board's "in this city" condition: gigs placed in the Location, plus
 * legacy rows (no `location_id`) whose typed city is that Location's name, so
 * a gig posted before the picker does not vanish from its own city's board.
 * Null when the id is not a Location — the caller then filters on nothing.
 */
export async function gigCityCondition(locationId: string): Promise<Record<string, unknown> | null> {
  if (!Types.ObjectId.isValid(locationId)) return null;
  const oid = new Types.ObjectId(locationId);
  const location = await LocationModel.findById(oid).select('city location_name').lean();
  if (!location) return { location_id: oid };
  const names = Array.from(
    new Set([cityNameOf(location), (location.location_name ?? '').trim()].filter(Boolean))
  ).map((name) => new RegExp(`^${escapedSearchRegex(name).source}$`, 'i'));
  if (names.length === 0) return { location_id: oid };
  return { $or: [{ location_id: oid }, { location_id: null, city: { $in: names } }] };
}

