import { z } from 'zod';
import { isVenueOfferModel, offerRateOf, podModerationImageUrls, venueOfferInput } from '@duncit/utils';
import { hasImageLine, mediaTextToInput, mediaToText } from '../media-text';
import type { HostPodActionLabels } from '../labels';
import type { HostPodTarget } from '../types';

export interface PodResubmitValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  venue_id: string;
  /** The window offered to the new venue (ISO), '' until picked. */
  offer_start: string;
  offer_end: string;
  /** How the host pays the venue (a VenueOfferModel), '' until picked. */
  venue_offer_model: string;
  /** The amount typed for that option, in rupees. */
  venue_offer_rate: string;
  /** The pod's spots — the offer's guests. */
  pax: number;
}

export const blankPodResubmitValues: PodResubmitValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  venue_id: '',
  offer_start: '',
  offer_end: '',
  venue_offer_model: '',
  venue_offer_rate: '',
  pax: 0,
};

/** Built from the surface's labels, like the edit dialog's schema: a validation
 *  message is copy the host reads, so it follows their language (rule 38). */
export const buildPodResubmitSchema = (labels: HostPodActionLabels) =>
  z.object({
    pod_title: z.string().trim().min(3, labels.titleTooShort).max(120, labels.titleTooLong),
    pod_description: z.string().trim().min(10, labels.descriptionTooShort),
    media_text: z.string().refine(hasImageLine, labels.imageRequired),
    venue_id: z.string().min(1, labels.venueRequired),
    offer_start: z.string().min(1, labels.slotRequired),
    offer_end: z.string().min(1, labels.slotRequired),
    venue_offer_model: z.string().refine(isVenueOfferModel, labels.offerModelRequired),
    venue_offer_rate: z.string().refine((rate) => offerRateOf(rate) > 0, labels.offerRateRequired),
    pax: z.number(),
  });

/** The offer the values hold, or null until it is complete. */
export const resubmitOfferOf = (values: PodResubmitValues) =>
  venueOfferInput({
    start: values.offer_start || null,
    end: values.offer_end || null,
    pax: values.pax,
    pets: false,
    spaceLabel: '',
    model: values.venue_offer_model,
    rate: values.venue_offer_rate,
  });

/** Maps the validated values onto the server's HostResubmitPodInput: the new
 *  venue gets an offer for the window, which it accepts, rejects or counters. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaTextToInput(values.media_text),
    venue_id: values.venue_id,
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

/** Prefills the form from the rejected pod (a fresh venue, window and terms must be picked). */
export function podResubmitInitialValues(pod: HostPodTarget | null): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  return {
    ...blankPodResubmitValues,
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: mediaToText(pod.pod_images_and_videos),
    pax: pod.no_of_spots ?? 0,
  };
}
