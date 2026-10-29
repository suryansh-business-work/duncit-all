import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import {
  addFreeJustificationIssues,
  freeJustificationDefaults,
  freeJustificationFields,
  offerNoteField,
  offeringsTextField,
  type FreeJustificationValues,
} from '@duncit/forms/schemas';
import {
  isFreePod,
  isFreeVenueOfferModel,
  isHostOfferModel,
  isVideoUrl,
  offerRateOf,
  venueOfferInput,
  venueOfferPrefillValues,
  type VenueOfferPrefill,
} from '@duncit/utils';

import { CategoryMediaType } from '@/generated/graphql/graphql';
import { freeSourceOf, hasImageLine } from '@/components/create-pod/create-pod.form';
import { appFreeJustification, hostOfferInput } from '@/components/venue-offer/offer-terms-input';
import type { Translate } from '@/i18n/fallback';

/** Shared logic for the venue-rejected pod's full edit + resubmission flow —
 * mirrors mWeb's pod-resubmit.form (rule 27 parity). A free venue offer, or a
 * free pod, carries the host's free justification (`free_*`). */

export interface PodResubmitValues extends FreeJustificationValues {
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
  /** Hidden: the pod itself is FREE (it stays so) — its resubmission says why again. */
  pod_free: boolean;
}

/** The resubmit sheet's form, as its sections receive it. */
export type ResubmitForm = UseFormReturn<PodResubmitValues, unknown, PodResubmitValues>;

/** The declined (or expired) offer's terms a new offer starts from — the shared shape. */
export type { VenueOfferPrefill } from '@duncit/utils';

export interface HostPodForResubmit {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  venue_id?: string | null;
  no_of_spots?: number | null;
  /** FREE / PAID — a free pod's resubmission carries its free justification. */
  pod_type?: string | null;
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
  space_label: '',
  pets: false,
  venue_offer_model: '',
  venue_offer_rate: '',
  offerings: '',
  note: '',
  pax: 0,
  pod_free: false,
  ...freeJustificationDefaults,
};

/** Whether the host must say why something is free — the new venue offer, the pod or both. */
export const resubmitNeedsFreeJustification = (
  values: Pick<PodResubmitValues, 'venue_offer_model' | 'pod_free'>,
): boolean => values.pod_free || isFreeVenueOfferModel(values.venue_offer_model);

/** The resubmission's rules, worded in the host's language (mWeb's twin reads
 * the same keys). The ask beside the price is the shared rule
 * (`offeringsTextField` / `offerNoteField`); a free venue asks no amount, and a
 * free venue or a free pod needs the free justification
 * (`addFreeJustificationIssues`). */
export const makePodResubmitSchema = (t: Translate) =>
  z
    .object({
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
      space_label: z.string(),
      pets: z.boolean(),
      venue_offer_model: z
        .string()
        .refine(isHostOfferModel, t('mweb.hostPodActions.offerModelRequired')),
      venue_offer_rate: z.string(),
      offerings: offeringsTextField(t, true),
      note: offerNoteField(t),
      pax: z.number(),
      pod_free: z.boolean(),
      ...freeJustificationFields,
    })
    .superRefine((values, ctx) => {
      if (
        !isFreeVenueOfferModel(values.venue_offer_model) &&
        offerRateOf(values.venue_offer_rate) <= 0
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['venue_offer_rate'],
          message: t('mweb.hostPodActions.offerRateRequired'),
        });
      }
      if (resubmitNeedsFreeJustification(values)) addFreeJustificationIssues(values, ctx, t);
    });

/** The offer the values hold, with what the host asks of the venue (and, for a
 * free venue, why it is free), or null until it is complete. mWeb twin:
 * resubmitOfferOf. */
export function resubmitOfferOf(values: PodResubmitValues) {
  const offer = venueOfferInput({
    start: values.offer_start || null,
    end: values.offer_end || null,
    pax: values.pax,
    pets: values.pets,
    spaceLabel: values.space_label,
    model: values.venue_offer_model,
    rate: values.venue_offer_rate,
    offerings: values.offerings,
    note: values.note,
    freeJustification: freeSourceOf(values),
  });
  return offer ? hostOfferInput(offer) : null;
}

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Maps the validated values onto the server's HostResubmitPodInput: the new
 * venue gets an offer for the window, which it accepts, rejects or counters.
 * The pod's spots go with it once known — raised to the venue's minimum, they
 * are the offer's guests. A free pod says why it is free again. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  const justification = values.pod_free ? appFreeJustification(freeSourceOf(values)) : null;
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: isVideoUrl(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    venue_id: values.venue_id,
    ...(values.pax > 0 ? { no_of_spots: values.pax } : {}),
    venue_offer: resubmitOfferOf(values),
    ...(justification ? { free_justification: justification } : {}),
  };
}

/** A declined offer's terms as the form holds them, at the pod's own venue. */
function prefilledOffer(
  pod: HostPodForResubmit,
  prefill: Readonly<VenueOfferPrefill>,
): Partial<PodResubmitValues> {
  return { venue_id: pod.venue_id ?? '', ...venueOfferPrefillValues(prefill) };
}

/**
 * Prefills the form from the rejected pod. Without `prefill` a fresh venue,
 * window and terms must be picked; with it (a new offer after a decline) the
 * form starts from the declined terms at the pod's venue — window, space, pets,
 * pricing option, amount, the points and the note.
 */
export function podResubmitInitialValues(
  pod: HostPodForResubmit | null,
  prefill?: Readonly<VenueOfferPrefill> | null,
): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  const values: PodResubmitValues = {
    ...blankPodResubmitValues,
    pod_title: pod.pod_title,
    pod_description: pod.pod_description ?? '',
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
    pax: pod.no_of_spots ?? 0,
    pod_free: isFreePod(pod.pod_type),
  };
  return prefill ? { ...values, ...prefilledOffer(pod, prefill) } : values;
}

/** One venue option line — "Hall · Pune". */
export function venueOptionLabel(venue: ResubmitVenueOption): string {
  return venue.city ? `${venue.venue_name} · ${venue.city}` : venue.venue_name;
}
