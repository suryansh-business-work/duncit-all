import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from './context';
import type { PodFormValues } from './types';

/**
 * Keeps dependent fields consistent inside the RHF tree:
 * - clears venue/meeting/place/product fields when the pod mode flips
 * - resets venue when the club no longer links the selected venue
 * - forces pod_amount = 0 for FREE pod types
 * - clears product requests when products are disabled
 */
export default function CascadeEffect() {
  const { clubs, getClubVenueIds } = usePodFormData();
  const { control, getValues, setValue } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const podType = useWatch({ control, name: 'pod_type' });
  const productsEnabled = useWatch({ control, name: 'products_enabled' });

  useEffect(() => {
    const values = getValues();
    if (podMode === 'VIRTUAL') {
      if (values.venue_id) setValue('venue_id', '');
      if (values.venue_slot_id) setValue('venue_slot_id', '');
      if (values.location_id) setValue('location_id', '');
      if (values.zone_name) setValue('zone_name', '');
      if (values.place_charges.length > 0) setValue('place_charges', []);
      if (values.products_enabled) setValue('products_enabled', false);
      if (values.product_requests.length > 0) setValue('product_requests', []);
      return;
    }
    if (values.meeting_platform) setValue('meeting_platform', '');
    if (values.meeting_url) setValue('meeting_url', '');
    if (values.meeting_notes) setValue('meeting_notes', '');
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

  useEffect(() => {
    if (!productsEnabled && getValues('product_requests').length > 0) {
      setValue('product_requests', []);
    }
  }, [productsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
