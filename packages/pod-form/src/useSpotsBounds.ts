import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAdminCategories } from '@duncit/category';
import { spotsBounds, type SpotsBounds } from '@duncit/utils';
import { usePodFormData } from './context';
import { useVenueSlots } from './slots/useVenueSlots';
import { usePodSpotLimits } from './usePodSpotLimits';
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
 *
 * EDITING an existing pod is the exception, and the server owns that answer.
 * Its slot is BOOKED, so `venueAvailableSlots` no longer lists it and the
 * capacity below resolves to null — which is how a live pod's spots used to
 * open as an uncapped number field. `podSpotLimits` also folds in the seats
 * already sold, which nothing on this form can see.
 */
export function useSpotsBounds(): SpotsBounds {
  const { clubs, config, editingPodDocId } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const podMode = useWatch({ control, name: 'pod_mode' });
  const autoPodSubId = useWatch({ control, name: 'sub_category_id' });

  const { categories } = useAdminCategories();
  const { slots } = useVenueSlots(venueId, podMode === 'VIRTUAL');

  const club = clubs.find((item: any) => String(item?.id) === String(clubId));
  // A club stores its SUB-category in `category_id`; an Auto Pod, having no
  // club yet, carries the sub-category itself.
  const clubSubId = club ? String(club.category_id ?? '') : '';
  const subId = config.autoPod ? autoPodSubId : clubSubId;
  const minPax = categories.find((category) => category.id === subId)?.min_pax ?? 0;

  const capacity = slots.find((slot) => slot.id === slotId)?.capacity ?? null;
  const limits = usePodSpotLimits(editingPodDocId);
  if (limits) {
    return { min: limits.min, max: limits.max, slidable: limits.slidable };
  }

  return spotsBounds({ minPax, venueCapacity: capacity });
}

/**
 * Raise the spots to the floor once the floor is known; never lower, so a
 * legitimately larger pod is left alone. The control clamps what it DISPLAYS
 * to the activity's minimum, so without this the form could still hold a
 * smaller number than the admin was shown and save it. (Sections stay mounted
 * when their accordion is collapsed, so this runs regardless.)
 */
export function useSpotsFloor(min: number) {
  const { getValues, setValue } = useFormContext<PodFormValues>();
  useEffect(() => {
    if (min > 0 && (Number(getValues('no_of_spots')) || 0) < min) {
      setValue('no_of_spots', min, { shouldValidate: true });
    }
  }, [min]); // eslint-disable-line react-hooks/exhaustive-deps
}
