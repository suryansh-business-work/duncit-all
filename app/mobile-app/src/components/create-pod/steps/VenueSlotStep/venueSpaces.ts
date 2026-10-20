import type { VenueSpace } from '@duncit/utils';

import type { CreatePodSlot, CreatePodVenue } from '../../create-pod.types';

/** A venue's bookable spaces — the one rule, shared with mWeb (@duncit/utils). */
export { venueSpaces, type VenueSpace } from '@duncit/utils';

/** Only the picked space's slots — and only once a space is chosen (so no price
 * shows before a capacity is selected). */
export const spaceSlots = (slots: CreatePodSlot[], space: VenueSpace | null): CreatePodSlot[] => {
  if (!space) return [];
  return slots.filter((slot) => (slot.space_label ?? '') === space.slotSpaceLabel);
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
