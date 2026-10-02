import type { CreatePodSlot, CreatePodVenue } from '../../create-pod.types';

/** `label` is what the host sees; `slotSpaceLabel` is the VenueSlot.space_label
 * this space books ('' = whole venue), used to filter the slot list. */
export type VenueSpace = { label: string; capacity: number; slotSpaceLabel: string };

/** The venue's bookable spaces: its named capacity items, else the whole venue
 * as a single option. Always ≥1 when a venue is picked, so capacity selection is
 * always required before slots/prices show. Picking one fills No. of spots.
 *
 * The whole-venue `label` stays in English on purpose: it is the value stored on
 * the form (and in the draft) that identifies the space, so translating it would
 * stop a draft resumed in another language from matching. It is translated where
 * it is DISPLAYED instead. */
export const venueSpaces = (venue: CreatePodVenue | null): VenueSpace[] => {
  if (!venue) return [];
  const items = venue.capacity_items ?? [];
  if (items.length > 0) {
    return items.map((item) => ({
      label: item.label,
      capacity: item.capacity,
      slotSpaceLabel: item.label,
    }));
  }
  return [{ label: 'Whole venue', capacity: venue.capacity ?? 0, slotSpaceLabel: '' }];
};

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
