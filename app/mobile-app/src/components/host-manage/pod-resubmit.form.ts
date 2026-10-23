import { z } from 'zod';

import { isVenueOfferModel, isVideoUrl, offerRateOf, venueOfferInput } from '@duncit/utils';

import { CategoryMediaType, type VenueOfferModel } from '@/generated/graphql/graphql';
import { hasImageLine } from '@/components/create-pod/create-pod.form';
import type { Translate } from '@/i18n/fallback';

/** Shared logic for the venue-rejected pod's full edit + resubmission flow —
 * mirrors mWeb's pod-resubmit.form (rule 27 parity). */

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

export interface HostPodForResubmit {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  venue_id?: string | null;
  no_of_spots?: number | null;
}

export interface ResubmitVenueOption {
  id: string;
  venue_name: string;
  city?: string | null;
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

/** The resubmission's rules, worded in the host's language (mWeb's twin reads the same keys). */
export const makePodResubmitSchema = (t: Translate) =>
  z.object({
    pod_title: z
      .string()
      .trim()
      .min(3, t('mweb.hostPodActions.titleTooShort'))
      .max(120, t('mweb.hostPodActions.titleTooLong')),
    pod_description: z.string().trim().min(10, t('mweb.hostPodActions.descriptionTooShort')),
    media_text: z
      .string()
      .refine((text) => hasImageLine(text), t('mweb.hostPodActions.imageRequired')),
    venue_id: z.string().min(1, t('mweb.hostPodActions.venueRequired')),
    offer_start: z.string().min(1, t('mweb.hostPodActions.slotRequired')),
    offer_end: z.string().min(1, t('mweb.hostPodActions.slotRequired')),
    venue_offer_model: z
      .string()
      .refine(isVenueOfferModel, t('mweb.hostPodActions.offerModelRequired')),
    venue_offer_rate: z
      .string()
      .refine((rate) => offerRateOf(rate) > 0, t('mweb.hostPodActions.offerRateRequired')),
    pax: z.number(),
  });

/** The offer the values hold, or null until it is complete. mWeb twin: resubmitOfferOf. */
export function resubmitOfferOf(values: PodResubmitValues) {
  const offer = venueOfferInput({
    start: values.offer_start || null,
    end: values.offer_end || null,
    pax: values.pax,
    pets: false,
    spaceLabel: '',
    model: values.venue_offer_model,
    rate: values.venue_offer_rate,
  });
  // The app's generated enum carries the same four values the shared union does.
  return offer ? { ...offer, model: offer.model as VenueOfferModel } : null;
}

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Maps the validated values onto the server's HostResubmitPodInput. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: isVideoUrl(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    venue_id: values.venue_id,
    venue_offer: resubmitOfferOf(values),
  };
}

/** Prefills the form from the rejected pod (a fresh venue, window and terms must be picked). */
export function podResubmitInitialValues(pod: HostPodForResubmit | null): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  return {
    ...blankPodResubmitValues,
    pod_title: pod.pod_title,
    pod_description: pod.pod_description ?? '',
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
    pax: pod.no_of_spots ?? 0,
  };
}

/** One venue option line — "Hall · Pune". */
export function venueOptionLabel(venue: ResubmitVenueOption): string {
  return venue.city ? `${venue.venue_name} · ${venue.city}` : venue.venue_name;
}
