import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';

/** Where a pod happens, in the two lines every surface shows: a short place
 * name and the address under it. Either may be null for a pod that has
 * neither a venue nor a location. */
export interface PodPlace {
  label: string | null;
  detail: string | null;
}

interface PlaceCache {
  venues: Map<string, Promise<any>>;
  locations: Map<string, Promise<any>>;
}

const cleanParts = (parts: Array<string | null | undefined>) =>
  parts.map((part) => part?.trim()).filter(Boolean) as string[];

const joinParts = (parts: Array<string | null | undefined>) => cleanParts(parts).join(', ');

/**
 * The lookups, memoised for the length of one operation. The carrier is
 * whatever holds that cache — the GraphQL context while a query resolves, a
 * plain object for a one-off caller such as a share link — so it is typed as
 * loosely as the pod document beside it.
 */
const getPlaceCache = (carrier: any): PlaceCache => {
  carrier.__podPlaceCache ??= { venues: new Map(), locations: new Map() };
  return carrier.__podPlaceCache;
};

export async function resolvePodPlace(parent: any, carrier: any): Promise<PodPlace> {
  if (parent.__podPlace) return parent.__podPlace;
  const cache = getPlaceCache(carrier);

  if ((parent.pod_mode ?? 'PHYSICAL') === 'VIRTUAL') {
    parent.__podPlace = {
      label: 'Virtual pod',
      detail: parent.meeting_platform || 'Online',
    };
    return parent.__podPlace;
  }

  if (parent.venue_id) {
    const key = String(parent.venue_id);
    if (!cache.venues.has(key)) {
      cache.venues.set(
        key,
        VenueModel.findById(key)
          .select('venue_name address_line1 address_line2 locality city state country postal_code')
          .lean()
          .exec()
      );
    }
    const venue = await cache.venues.get(key);
    if (venue) {
      parent.__podPlace = {
        label: venue.venue_name || joinParts([venue.locality, venue.city]) || 'Venue',
        detail: joinParts([
          venue.address_line1,
          venue.address_line2,
          venue.locality,
          venue.city,
          venue.state,
          venue.postal_code,
          venue.country,
        ]),
      };
      return parent.__podPlace;
    }
  }

  const zoneName = parent.zone_name?.trim() || '';
  if (parent.location_id) {
    const key = String(parent.location_id);
    if (!cache.locations.has(key)) {
      cache.locations.set(
        key,
        LocationModel.findById(key)
          .select('location_name city state country location_pincode location_zones')
          .lean()
          .exec()
      );
    }
    const location = await cache.locations.get(key);
    if (location) {
      const zone = (location.location_zones ?? []).find((item: any) => item.zone_name === zoneName);
      const city = location.city || location.location_name;
      parent.__podPlace = {
        label: joinParts([zoneName, city]) || city || location.location_name,
        detail: joinParts([location.state, zone?.pincode || location.location_pincode, location.country]),
      };
      return parent.__podPlace;
    }
  }

  parent.__podPlace = zoneName ? { label: zoneName, detail: '' } : { label: null, detail: null };
  return parent.__podPlace;
}
