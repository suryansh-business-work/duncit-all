import { z } from 'zod';
import { podModerationImageUrls } from '@duncit/utils';
import { hasImageLine, mediaTextToInput, mediaToText } from './media-text';
import {
  podEditTicketDiscountInput,
  podTicketDiscountValues,
  refinePodEditTicketDiscount,
  type PodEditTicketDiscount,
  type PodEditTicketDiscountValues,
} from './pod-edit-ticket-discount';
import type { HostPodActionLabels } from './labels';
import type { HostPodTarget, PodSpotLimits } from './types';

/** Shapes for the host's pod edit (title, images, description, capacity, multi-ticket discount). */
export interface PodEditValues extends PodEditTicketDiscountValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  /** Total spots. Seeded from the server's limits once they arrive. */
  no_of_spots: number;
}

export const blankPodEditValues: PodEditValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  no_of_spots: 0,
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
};

/** Built from the surface's labels: a validation message is copy the host
 *  reads, so it follows their language like the rest of the dialog (rule 38).
 *  `ticketDiscount` is the dialog's discount context — without one there is no
 *  discount on the form to check. */
export const buildPodEditSchema = (
  labels: HostPodActionLabels,
  ticketDiscount?: PodEditTicketDiscount | null,
) =>
  z
    .object({
      pod_title: z.string().trim().min(3, labels.titleTooShort).max(120, labels.titleTooLong),
      pod_description: z.string().trim().min(10, labels.descriptionTooShort),
      media_text: z.string().refine(hasImageLine, labels.imageRequired),
      // The stepper is bounded by the server's own range, so nothing out of range
      // can be produced here; the server re-checks it on the way in regardless.
      no_of_spots: z.coerce.number().int().min(0),
      ticket_discount_enabled: z.boolean(),
      ticket_discount_tiers: z.array(
        z.object({ min_tickets: z.number(), discount_pct: z.number() }),
      ),
    })
    .superRefine((values, ctx) => {
      if (ticketDiscount) {
        refinePodEditTicketDiscount(values, ctx, ticketDiscount, labels.ticketDiscount);
      }
    });

/** The edit form's raw (pre-parse) values — what the dialog's controls hold. */
export type PodEditFormInput = z.input<ReturnType<typeof buildPodEditSchema>>;

/**
 * Maps the validated values onto the server's HostUpdatePodInput.
 *
 * `no_of_spots` is omitted until the limits load: without them the form has no
 * range to have picked inside, and sending the seeded 0 would ask the server to
 * empty the pod. The discount is omitted when the dialog had no discount
 * context, and cleared (`ticketDiscountInput`) on a free pod.
 */
export function buildHostUpdateInput(
  values: PodEditValues,
  options?: Readonly<{ includeSpots?: boolean; ticketDiscount?: PodEditTicketDiscount | null }>,
) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaTextToInput(values.media_text),
    ...(options?.includeSpots ? { no_of_spots: values.no_of_spots } : {}),
    ...podEditTicketDiscountInput(values, options?.ticketDiscount),
  };
}

/** The same values as the AI content check's input — title, description and
 * the gallery's images, which is exactly what the guidelines cover. */
export function buildPodEditModerationInput(values: PodEditValues) {
  const input = buildHostUpdateInput(values);
  return {
    pod_title: input.pod_title,
    pod_description: input.pod_description,
    image_urls: podModerationImageUrls(input.pod_images_and_videos),
  };
}

/** Prefills the form from the pod being edited. */
export function podEditInitialValues(pod: HostPodTarget | null): PodEditValues {
  if (!pod) return blankPodEditValues;
  return {
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: mediaToText(pod.pod_images_and_videos),
    no_of_spots: pod.no_of_spots ?? 0,
    ...podTicketDiscountValues(pod),
  };
}

/**
 * The sentence under the spots control.
 *
 * A host reads two different things depending on what is holding them: the
 * space's capacity when the venue caps it, and the seats already sold when
 * those are what stops the pod shrinking. Both are figures they can act on, so
 * neither is left to a bare "invalid" on save.
 */
export function spotsBoundsHint(
  limits: PodSpotLimits,
  labels: HostPodActionLabels,
): string {
  if (limits.venue_capacity > 0) {
    return labels.spotsVenueHint(limits.venue_capacity, limits.seats_taken);
  }
  return labels.spotsFreeHint(limits.min, limits.seats_taken);
}
