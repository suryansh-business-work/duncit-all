import { z } from 'zod';
import { offerNoteField, offeringsTextField, type Translate } from '@duncit/forms/schemas';
import {
  isVenueOfferModel,
  offerRateOf,
  podModerationImageUrls,
  venueOfferInput,
  venueOfferPrefillValues,
  type VenueOfferPrefill,
} from '@duncit/utils';
import { hasImageLine, mediaTextToInput, mediaToText } from '../media-text';
import type { HostPodActionLabels } from '../labels';
import type { HostPodTarget } from '../types';
import { askFallbackT } from './ask-translation';

export interface PodResubmitValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  venue_id: string;
  /** The window offered to the new venue (ISO), '' until picked. */
  offer_start: string;
  offer_end: string;
  /** The space the window is for ('' = the whole venue) — kept from a prefilled offer, dropped with its venue. */
  space_label: string;
  /** Whether pets come (the venue may charge a pet fee). */
  pets: boolean;
  /** How the host pays the venue (a VenueOfferModel), '' until picked. */
  venue_offer_model: string;
  /** The amount typed for that option, in rupees. */
  venue_offer_rate: string;
  /** What the host needs from the venue, one point per line (at least one). */
  offerings: string;
  /** The request note to the venue (optional). */
  note: string;
  /** The pod's spots — the offer's guests, from the venue's minimum up to what it holds. */
  pax: number;
}

/** The declined offer's terms "Send a new offer" starts the form from (shared with the app: @duncit/utils). */
export type { VenueOfferPrefill };

export const blankPodResubmitValues: PodResubmitValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  venue_id: '',
  offer_start: '',
  offer_end: '',
  space_label: '',
  pets: false,
  venue_offer_model: '',
  venue_offer_rate: '',
  offerings: '',
  note: '',
  pax: 0,
};

/** Built from the surface's labels, like the edit dialog's schema: a validation
 *  message is copy the host reads, so it follows their language (rule 38). The
 *  ask beside the price is the shared rule (`offeringsTextField` /
 *  `offerNoteField`), worded by `t` — the surface's translator for the shared
 *  `availability.offers.*` copy (the bundled English when none is given). */
export const buildPodResubmitSchema = (labels: HostPodActionLabels, t: Translate = askFallbackT) =>
  z.object({
    pod_title: z.string().trim().min(3, labels.titleTooShort).max(120, labels.titleTooLong),
    pod_description: z.string().trim().min(10, labels.descriptionTooShort),
    media_text: z.string().refine(hasImageLine, labels.imageRequired),
    venue_id: z.string().min(1, labels.venueRequired),
    offer_start: z.string().min(1, labels.slotRequired),
    offer_end: z.string().min(1, labels.slotRequired),
    space_label: z.string(),
    pets: z.boolean(),
    venue_offer_model: z.string().refine(isVenueOfferModel, labels.offerModelRequired),
    venue_offer_rate: z.string().refine((rate) => offerRateOf(rate) > 0, labels.offerRateRequired),
    offerings: offeringsTextField(t, true),
    note: offerNoteField(t),
    pax: z.number(),
  });

/** The offer the values hold, with what the host asks of the venue, or null until it is complete. */
export const resubmitOfferOf = (values: PodResubmitValues) =>
  venueOfferInput({
    start: values.offer_start || null,
    end: values.offer_end || null,
    pax: values.pax,
    pets: values.pets,
    spaceLabel: values.space_label,
    model: values.venue_offer_model,
    rate: values.venue_offer_rate,
    offerings: values.offerings,
    note: values.note,
  });

/** Maps the validated values onto the server's HostResubmitPodInput: the new
 *  venue gets an offer for the window, which it accepts, rejects or counters.
 *  The pod's spots go with it once known — raised to the venue's minimum, they
 *  are the offer's guests. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaTextToInput(values.media_text),
    venue_id: values.venue_id,
    ...(values.pax > 0 ? { no_of_spots: values.pax } : {}),
    venue_offer: resubmitOfferOf(values),
  };
}

/** The resubmitted copy as the content check's input — the venue and the offer
 * are bookings, not content, so only the title, description and gallery go. */
export function buildPodResubmitModerationInput(values: PodResubmitValues) {
  const input = buildHostResubmitInput(values);
  return {
    pod_title: input.pod_title,
    pod_description: input.pod_description,
    image_urls: podModerationImageUrls(input.pod_images_and_videos),
  };
}

/** A declined offer's terms as the form holds them, at the pod's own venue. */
function prefilledOffer(pod: HostPodTarget, prefill: Readonly<VenueOfferPrefill>): Partial<PodResubmitValues> {
  return { venue_id: pod.venue_id ?? '', ...venueOfferPrefillValues(prefill) };
}

/**
 * Prefills the form from the rejected pod. Without `prefill` a fresh venue,
 * window and terms must be picked; with it (a new offer after a decline) the
 * form starts from the declined terms at the pod's venue — window, space, pets,
 * pricing option, amount, the points and the note.
 */
export function podResubmitInitialValues(
  pod: HostPodTarget | null,
  prefill?: Readonly<VenueOfferPrefill> | null,
): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  const values: PodResubmitValues = {
    ...blankPodResubmitValues,
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: mediaToText(pod.pod_images_and_videos),
    pax: pod.no_of_spots ?? 0,
  };
  return prefill ? { ...values, ...prefilledOffer(pod, prefill) } : values;
}
