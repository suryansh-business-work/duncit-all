import { useEffect } from 'react';
import { useFormikContext } from 'formik';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  venues: any[];
}

/**
 * Keeps dependent fields consistent inside the Formik tree:
 * - resets venue_id when club changes and the prior venue is no longer valid
 * - forces pod_amount = 0 for FREE pod types
 */
export default function CascadeEffect({ clubs, venues }: Props) {
  const { values, setFieldValue } = useFormikContext<PodForm>();

  useEffect(() => {
    if (values.pod_mode === 'VIRTUAL') {
      if (values.venue_id) setFieldValue('venue_id', '');
      if (values.location_id) setFieldValue('location_id', '');
      if (values.zone_name) setFieldValue('zone_name', '');
      if (values.place_charges.length > 0) setFieldValue('place_charges', []);
      if (values.products_enabled) setFieldValue('products_enabled', false);
      if (values.product_requests.length > 0) setFieldValue('product_requests', []);
      return;
    }
    if (values.meeting_platform) setFieldValue('meeting_platform', '');
    if (values.meeting_url) setFieldValue('meeting_url', '');
    if (values.meeting_notes) setFieldValue('meeting_notes', '');
  }, [values.pod_mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!values.club_id || !values.venue_id) return;
    const club = clubs.find((item: any) => item.id === values.club_id);
    const linked = new Set(club?.meetup_venues_id ?? []);
    const valid = venues.some((venue: any) => venue.id === values.venue_id && linked.has(venue.id));
    if (!valid) {
      setFieldValue('venue_id', '');
      setFieldValue('location_id', '');
      setFieldValue('zone_name', '');
    }
  }, [values.club_id, venues, clubs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
      setFieldValue('pod_amount', 0);
    }
  }, [values.pod_type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!values.products_enabled && values.product_requests.length > 0) {
      setFieldValue('product_requests', []);
    }
  }, [values.products_enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
