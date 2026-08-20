import { useFormContext, useWatch } from 'react-hook-form';
import { useAdminCategories } from '@duncit/category';
import { spotsBounds, type SpotsBounds } from '@duncit/utils';
import { usePodFormData } from './context';
import { useVenueSlots } from './slots/useVenueSlots';
import type { PodFormValues } from './types';

/**
 * How big this pod may be, for the portal forms.
 *
 * Floored by the sub-category's admin-set `min_pax` (a doubles game needs 4) and
 * capped by the capacity of the venue space the pod books. The pod's
 * sub-category is its club's `category_id`.
 *
 * Both reads are cache-first queries the form already issues elsewhere, so this
 * costs no extra round trip — Apollo serves the slot list the picker fetched and
 * the category tree the cascade fetched. The bounds themselves come from the one
 * shared `spotsBounds` in @duncit/utils, so the portals, mWeb and native cannot
 * disagree about the range (rules 27 + 40).
 */
export function useSpotsBounds(): SpotsBounds {
  const { clubs } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const podMode = useWatch({ control, name: 'pod_mode' });

  const { categories } = useAdminCategories();
  const { slots } = useVenueSlots(venueId, podMode === 'VIRTUAL');

  const club = clubs.find((item: any) => String(item?.id) === String(clubId));
  // A club stores its SUB-category in `category_id`.
  const subId = club ? String(club.category_id ?? '') : '';
  const minPax = categories.find((category) => category.id === subId)?.min_pax ?? 0;

  const capacity = slots.find((slot) => slot.id === slotId)?.capacity ?? null;

  return spotsBounds({ minPax, venueCapacity: capacity });
}
