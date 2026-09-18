import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';

/**
 * Narrowing a page to one city. Pods and clubs carry their own location;
 * everything recorded against a pod — a booking, a payment, a door scan, a
 * score — is narrowed through the ids of that city's pods. With no city every
 * filter here is empty, so a query reads exactly as it did before.
 */
export interface CityScope {
  /** For collections with their own `location_id` (pods, clubs). */
  location: Record<string, unknown>;
  /** For collections that point at a pod through `pod_id`. */
  pods: Record<string, unknown>;
}

/** Every city — the scope a page without a city filter reads. */
export const NO_CITY: CityScope = { location: {}, pods: {} };

/** The filter for a collection with its own `location_id` — empty for every city. */
export const cityLocation = (city: string | null): Record<string, unknown> =>
  city ? { location_id: new Types.ObjectId(city) } : {};

export async function cityScope(city: string | null): Promise<CityScope> {
  if (!city) return NO_CITY;
  const location_id = new Types.ObjectId(city);
  // Cancelled pods included: a booking or a payment on one still happened in that city.
  const podIds = await PodModel.distinct('_id', { location_id }).setOptions({ includeDeleted: true });
  return { location: { location_id }, pods: { pod_id: { $in: podIds } } };
}
