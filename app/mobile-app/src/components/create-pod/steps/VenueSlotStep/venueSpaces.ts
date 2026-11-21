import {
  startsWithinPodMinAdvance,
  type PodMinAdvanceWindow,
  type VenueSpace,
} from '@duncit/utils';

import type { CreatePodSlot, CreatePodVenue } from '../../create-pod.types';

/** A venue's bookable spaces — the one rule, shared with mWeb (@duncit/utils). */
export { venueSpaces, type VenueSpace } from '@duncit/utils';

/** Only the picked space's slots — and only once a space is chosen (so no price
 * shows before a capacity is selected). A host's Minimum Advance Days window
 * drops every slot before their first allowed day: the server would refuse it. */
export const spaceSlots = (
  slots: CreatePodSlot[],
  space: VenueSpace | null,
  minAdvance: PodMinAdvanceWindow | null = null,
): CreatePodSlot[] => {
  if (!space) return [];
  const inSpace = slots.filter((slot) => (slot.space_label ?? '') === space.slotSpaceLabel);
  return startsWithinPodMinAdvance(inSpace, minAdvance);
};

/** The venue address the map pins, as one line. */
export const venueMapQuery = (venue: CreatePodVenue | null): string => {
  if (!venue) return '';
  return [
    venue.venue_name,
    venue.address_line1,
    venue.locality,
    venue.city,
    venue.state,
    venue.postal_code,
    venue.country,
  ]
    .filter(Boolean)
    .join(', ');
};
