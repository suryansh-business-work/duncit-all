import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  venues: any[];
}

/**
 * Keeps dependent fields consistent inside the RHF tree:
 * - resets venue_id when club changes and the prior venue is no longer valid
 * - forces pod_amount = 0 for FREE pod types
 */
export default function CascadeEffect({ clubs, venues }: Readonly<Props>) {
  const { control, getValues, setValue } = useFormContext<PodForm>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const podType = useWatch({ control, name: 'pod_type' });
  const productsEnabled = useWatch({ control, name: 'products_enabled' });

  useEffect(() => {
    const values = getValues();
    if (podMode === 'VIRTUAL') {
      if (values.venue_id) setValue('venue_id', '');
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
    const club = clubs.find((item: any) => item.id === clubId);
    const linked = new Set(club?.meetup_venues_id ?? []);
    const valid = venues.some((venue: any) => venue.id === venueId && linked.has(venue.id));
    if (!valid) {
      setValue('venue_id', '');
      setValue('location_id', '');
      setValue('zone_name', '');
    }
  }, [clubId, venues, clubs]); // eslint-disable-line react-hooks/exhaustive-deps

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
