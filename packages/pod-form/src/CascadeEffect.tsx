import { useEffect } from 'react';
import { useFormContext, useWatch, type UseFormSetValue } from 'react-hook-form';
import { usePodFormData } from './context';
import { clubCategoryKey, filterProductsForClub, pruneProductRequests } from './product-category';
import { usePodCategoryClub } from './usePodCategoryClub';
import type { PodFormValues } from './types';

/** A VIRTUAL pod has no venue, place charges or products — clear them. */
function clearPhysicalFields(values: PodFormValues, setValue: UseFormSetValue<PodFormValues>) {
  if (values.venue_id) setValue('venue_id', '');
  if (values.venue_slot_id) setValue('venue_slot_id', '');
  if (values.location_id) setValue('location_id', '');
  if (values.zone_name) setValue('zone_name', '');
  if (values.place_charges.length > 0) setValue('place_charges', []);
  if (values.product_requests.length > 0) setValue('product_requests', []);
}

/** A PHYSICAL pod has no meeting link — clear it. */
function clearVirtualFields(values: PodFormValues, setValue: UseFormSetValue<PodFormValues>) {
  if (values.meeting_platform) setValue('meeting_platform', '');
  if (values.meeting_url) setValue('meeting_url', '');
  if (values.meeting_notes) setValue('meeting_notes', '');
}

/**
 * Keeps dependent fields consistent inside the RHF tree:
 * - clears venue/meeting/place/product fields when the pod mode flips
 * - resets venue when the club no longer links the selected venue
 * - forces pod_amount = 0 for FREE pod types
 * - drops product rows the newly-selected club does not offer
 */
export default function CascadeEffect() {
  const { clubs, products, getClubVenueIds } = usePodFormData();
  const { control, getValues, setValue } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const podType = useWatch({ control, name: 'pod_type' });
  // The club whose category the products must match — or, for an Auto Pod,
  // the category the form holds, in a club's shape.
  const categoryClub = usePodCategoryClub();
  const key = clubCategoryKey(categoryClub);
  const categoryId = key ? `${key.superId}|${key.subId}` : '';

  useEffect(() => {
    const values = getValues();
    if (podMode === 'VIRTUAL') {
      clearPhysicalFields(values, setValue);
      return;
    }
    clearVirtualFields(values, setValue);
  }, [podMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clubId || !venueId) return;
    const linked = new Set(getClubVenueIds(clubs.find((item) => item.id === clubId)));
    if (!linked.has(venueId)) {
      setValue('venue_id', '');
      setValue('venue_slot_id', '');
      setValue('location_id', '');
      setValue('zone_name', '');
    }
  }, [clubId, venueId, clubs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (podType.includes('FREE') && getValues('pod_amount') !== 0) {
      setValue('pod_amount', 0);
    }
  }, [podType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching category (a club, or an Auto Pod's own pair) switches which
  // products the pod may carry, so rows it no longer offers are dropped.
  // Without this they survive unrenderable and the save fails on the server's
  // category gate. Twin of the same effect in both Create Pod steppers.
  useEffect(() => {
    const requests = getValues('product_requests');
    if (requests.length === 0) return;
    const kept = pruneProductRequests(requests, filterProductsForClub(products, categoryClub));
    if (kept !== requests) setValue('product_requests', kept);
  }, [categoryId, products]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
