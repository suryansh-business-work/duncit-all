// Pod form contract — schema lives in ../pod-form/schema.ts because the dialog already
// imports it from there. This file re-exports + provides GraphQL mapper helpers so
// the new folder structure is consistent across all forms.

export { podFormSchema } from '../pod-form/schema';
import { podFormSchema } from '../pod-form/schema';
import type { PodForm } from '../queries';

export function toPodMutationInput(values: PodForm) {
  const cast: any = (podFormSchema as any).cast(values, { stripUnknown: true });
  return {
    pod_title: cast.pod_title,
    club_id: cast.club_id,
    pod_mode: cast.pod_mode,
    venue_id: cast.pod_mode === 'PHYSICAL' ? cast.venue_id : null,
    location_id: cast.location_id || null,
    zone_name: cast.zone_name || null,
    meeting_platform: cast.meeting_platform || null,
    meeting_url: cast.pod_mode === 'VIRTUAL' ? cast.meeting_url : null,
    meeting_notes: cast.meeting_notes || null,
    pod_hosts_id: cast.pod_hosts_id,
    pod_description: cast.pod_description,
    pod_date_time: cast.pod_date_time ? new Date(cast.pod_date_time).toISOString() : null,
    pod_end_date_time: cast.pod_end_date_time ? new Date(cast.pod_end_date_time).toISOString() : null,
    pod_type: cast.pod_type,
    pod_amount: Number(cast.pod_amount) || 0,
    pod_occurrence: cast.pod_occurrence,
    no_of_spots: Number(cast.no_of_spots) || 0,
    pod_info: cast.pod_info || null,
    pod_hashtag_text: cast.pod_hashtag_text || null,
    media_text: cast.media_text || null,
    payment_terms: cast.payment_terms || null,
    what_this_pod_offers: cast.what_this_pod_offers ?? [],
    available_perks: cast.available_perks ?? [],
    place_charges: cast.place_charges ?? [],
    products_enabled: !!cast.products_enabled,
    product_requests: cast.product_requests ?? [],
  };
}
