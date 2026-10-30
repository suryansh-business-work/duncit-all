import {
  freeJustificationInput,
  isVideoUrl,
  mediaTypeForUrl,
  smartIncentiveInput,
  ticketDiscountInput,
  venueOfferInput,
} from '@duncit/utils';
import { isFreePodType, type CreatePodFormValues } from './create-pod.types';

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);


/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitLines(mediaText).some((url) => !isVideoUrl(url));

/** The free justification as the form holds it — one set of fields for a free pod and a free venue. */
const freeJustificationOf = (values: CreatePodFormValues) => ({
  reason: values.free_reason,
  details: values.free_details,
  accepted: values.free_accepted,
});

/** The venue offer the form holds (window = the pod window, guests = its spots),
 * with what the host asks of the venue — and, for a free venue, why it is free
 * — or null. The live quote strips the ask (`venueOfferPriceInput`). Native twin. */
export const venueOfferOf = (values: CreatePodFormValues) =>
  venueOfferInput({
    start: values.pod_date_time?.toISOString() ?? null,
    end: values.pod_end_date_time?.toISOString() ?? null,
    pax: Number(values.no_of_spots) || 0,
    pets: values.venue_booking_pets,
    spaceLabel: values.venue_space_label,
    model: values.venue_offer_model,
    rate: values.venue_offer_rate,
    offerings: values.venue_offer_offerings,
    note: values.venue_offer_note,
    freeJustification: freeJustificationOf(values),
  });

/**
 * Maps the validated form values onto the server's CreatePodInput.
 *
 * `smartIncentiveOn` is false while Loyalty's programme is not known to be on:
 * Step 4 hides the editor then, so a value carried in from a draft or a Host
 * Again copy is sent switched off rather than published unseen.
 */
export function buildCreatePodInput(values: CreatePodFormValues, { smartIncentiveOn = true } = {}) {
  const virtual = values.pod_mode === 'VIRTUAL';
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: virtual ? null : values.venue_id,
    // A Pod Request's pod books the slot that request holds; every other
    // physical pod sends the venue an offer for its window, which the venue
    // accepts, rejects or counters (the pod waits for it).
    venue_slot_id: virtual ? null : values.venue_slot_id || null,
    venue_offer: virtual || values.venue_slot_id ? null : venueOfferOf(values),
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
    // A free pod says why it is free; the server refuses a host's free pod without it.
    ...(isFreePodType(values.pod_type) ? { free_justification: freeJustificationInput(freeJustificationOf(values)) } : {}),
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
    // A free pod has no money terms: a value typed while it was paid is dropped.
    payment_terms: isFreePodType(values.pod_type) ? null : values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges: values.place_charges,
    // A FREE pod or a switched-off offer always sends the cleared pair.
    ...ticketDiscountInput(values, isFreePodType(values.pod_type)),
    // Likewise the Smart Incentive: off at 0%, else the typed % as a number.
    ...smartIncentiveInput(values, isFreePodType(values.pod_type) || !smartIncentiveOn),
    // Derived, not chosen: the "Attach products" switch is gone, so a pod's shop
    // is open exactly when it carries products. Guarding on the rows rather than
    // the flag also means a stale draft that still holds `products_enabled: true`
    // with nothing attached publishes as closed instead of half-configured.
    products_enabled: values.product_requests.length > 0,
    product_requests: values.product_requests,
    is_active: true,
    // A Pod Request's pod: the server checks the slot is the one the request confirmed.
    partner_request_id: values.partner_request_id || null,
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
