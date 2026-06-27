import type { PartnerPodFormValues } from './partner-pod.types';

export function buildPartnerPodInput(values: PartnerPodFormValues, draft?: boolean) {
  const lines = (text: string) => text.split('\n').map((item) => item.trim()).filter(Boolean);
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: values.pod_mode === 'PHYSICAL' ? values.venue_id : null,
    venue_slot_id: values.pod_mode === 'PHYSICAL' ? values.venue_slot_id || null : null,
    location_id: null,
    zone_name: null,
    meeting_platform: values.pod_mode === 'VIRTUAL' ? values.meeting_platform.trim() || null : null,
    meeting_url: values.pod_mode === 'VIRTUAL' ? values.meeting_url.trim() : null,
    meeting_notes: values.pod_mode === 'VIRTUAL' ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time?.toISOString(),
    pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
    pod_occurrence: values.pod_occurrence,
    no_of_spots: Number(values.no_of_spots) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text.split(/[\s,]+/).map((item) => item.replace(/^#/, '').trim()).filter(Boolean),
    pod_images_and_videos: lines(values.media_text).map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' })),
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: lines(values.what_this_pod_offers_text),
    available_perks: lines(values.available_perks_text),
    place_charges: [],
    products_enabled: values.pod_mode === 'PHYSICAL' && values.products_enabled,
    product_requests: values.pod_mode === 'PHYSICAL' && values.products_enabled ? values.product_requests : [],
    is_active: !draft,
  };
}
