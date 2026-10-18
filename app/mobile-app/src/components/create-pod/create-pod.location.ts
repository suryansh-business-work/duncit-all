import type { CreatePodForm } from './create-pod.types';

/**
 * Put the pod in a city and an area of it — from the step-1 Locality section,
 * the device's own location, or the step-2 Change button, all the same way.
 *
 * The area decides which clubs step 2 offers, so a move clears the club; a new
 * city also clears the venue and slot, which belong to the old one. Says whether
 * any pick was cleared, so the step can tell the host to choose again.
 * mWeb twin.
 */
export function applyPodLocation(
  form: CreatePodForm,
  locationId: string,
  locality: string,
): boolean {
  if (!locationId) return false;
  const { getValues, setValue } = form;
  const cityChanged = locationId !== getValues('location_id');
  const areaChanged = cityChanged || locality !== getValues('locality');
  const cleared =
    (areaChanged && !!getValues('club_id')) ||
    (cityChanged && !!(getValues('venue_id') || getValues('venue_slot_id')));
  if (cityChanged) {
    setValue('location_id', locationId, { shouldDirty: true, shouldValidate: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  }
  if (areaChanged) {
    setValue('club_id', '', { shouldDirty: true });
  }
  setValue('locality', locality, { shouldDirty: true, shouldValidate: true });
  return cleared;
}
