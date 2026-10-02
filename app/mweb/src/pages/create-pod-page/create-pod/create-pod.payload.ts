import { isVideoUrl, mediaTypeForUrl, ticketDiscountInput } from '@duncit/utils';
import { isFreePodType, type CreatePodFormValues } from './create-pod.types';

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);


/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitLines(mediaText).some((url) => !isVideoUrl(url));

/** Maps the validated form values onto the server's CreatePodInput. */
export function buildCreatePodInput(values: CreatePodFormValues) {
  const virtual = values.pod_mode === 'VIRTUAL';
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: virtual ? null : values.venue_id,
    // The booked slot drives the pod window server-side; the venue must
    // approve it before the pod goes live (own venues confirm instantly).
    venue_slot_id: virtual ? null : values.venue_slot_id || null,
    location_id: values.location_id || null,
    zone_name: virtual ? null : values.locality || null,
    meeting_platform: virtual ? values.meeting_platform.trim() || null : null,
    meeting_url: virtual ? values.meeting_url.trim() : null,
    meeting_notes: virtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time?.toISOString(),
    pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
    no_of_spots: Number(values.no_of_spots) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: mediaTypeForUrl(url),
    })),
    reel_url: values.reel_url || null,
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges: values.place_charges,
    // A FREE pod or a switched-off offer always sends the cleared pair.
    ...ticketDiscountInput(values, isFreePodType(values.pod_type)),
    // Derived, not chosen: the "Attach products" switch is gone, so a pod's shop
    // is open exactly when it carries products. Guarding on the rows rather than
    // the flag also means a stale draft that still holds `products_enabled: true`
    // with nothing attached publishes as closed instead of half-configured.
    products_enabled: values.product_requests.length > 0,
    product_requests: values.product_requests,
    is_active: true,
  };
}

/** The pod text + image URLs sent to the server moderation preflight. */
export function buildModerationInput(values: CreatePodFormValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description,
    pod_info: values.pod_info || null,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    image_urls: splitLines(values.media_text).filter((url) => !isVideoUrl(url)),
  };
}

/** Maps a server moderation `field` onto the matching form field. */
export const MODERATION_FIELD_MAP: Record<string, keyof CreatePodFormValues> = {
  pod_title: 'pod_title',
  pod_description: 'pod_description',
  pod_info: 'pod_info',
  pod_hashtag: 'pod_hashtag_text',
  image: 'media_text',
};
