import { useSearchParams } from 'react-router';
import { PICK_VENUE_PARAM, hostCategoryKeyOf, pickedVenueSeed, type PickedVenueSeed } from '@duncit/utils';
import type { CreatePodHostCategory, CreatePodLocation, CreatePodVenue } from './create-pod/create-pod.types';

interface PickedVenue {
  /** The picked venue while Create Pod can offer it — kept across a refresh of the draft. */
  venueId?: string;
  /** What a NEW pod opens with; null for a resumed draft, which already holds its own picks. */
  seed: PickedVenueSeed | null;
}

/**
 * `/create-pod?pick_venue=<venueId>` — "Pick This Venue for Pod" on Venue
 * Details. A new pod opens as a physical pod at that venue, in its city and
 * area, on Where & when when the host has one category to pick. A venue
 * Create Pod does not offer (not approved, dark) is ignored and the form opens
 * as usual; a Pod Request's own venue wins over it. Native twin: useCreatePod's
 * pickVenueId.
 */
export function usePickedVenue(
  venues: readonly CreatePodVenue[],
  locations: readonly CreatePodLocation[],
  hostCategories: readonly CreatePodHostCategory[],
  isNew: boolean,
): PickedVenue {
  const [params] = useSearchParams();
  const venueId = params.get(PICK_VENUE_PARAM) ?? '';
  const venue = venueId && !params.get('partner_request_id') ? venues.find((row) => row.id === venueId) : undefined;
  if (!venue) return { seed: null };
  const sole = hostCategories.length === 1 ? hostCategories[0] : undefined;
  return {
    venueId: venue.id,
    seed: isNew ? pickedVenueSeed(venue, locations, sole ? hostCategoryKeyOf(sole) : null) : null,
  };
}
