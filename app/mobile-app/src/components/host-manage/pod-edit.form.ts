import { z } from 'zod';
import { podModerationImageUrls, type PodSpotLimits } from '@duncit/utils';

import { CategoryMediaType } from '@/generated/graphql/graphql';

/** Shapes for the host's pod edit (title, images, description, capacity — 2A). */
export interface PodEditValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  /** Total spots, as text so the numeric stepper can hold a half-typed value. */
  no_of_spots_text: string;
}

export interface HostPodSummary {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  /** Capacity as last published — the edit sheet starts its slider here. */
  no_of_spots?: number | null;
}

/** The range a live pod may be resized within — one definition, in @duncit/utils. */
export type { PodSpotLimits } from '@duncit/utils';

export const blankPodEditValues: PodEditValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  no_of_spots_text: '',
};

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitLines(mediaText).some((url) => !VIDEO_URL_RE.test(url));

export const podEditSchema = z.object({
  pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  pod_description: z.string().trim().min(10, 'Add a longer description'),
  media_text: z.string().refine((text) => hasImageLine(text), 'Add at least one image URL'),
  // The stepper is bounded by the server's own range, so nothing out of range
  // can be produced here; the server re-checks it on the way in regardless.
  no_of_spots_text: z.string(),
});

/**
 * Maps the validated values onto the server's HostUpdatePodInput.
 *
 * no_of_spots is omitted until the limits load: without them the form has no
 * range to have picked inside, and sending the seeded 0 would ask the server to
 * empty the pod. mWeb twin: buildHostUpdateInput in @duncit/host-pod-actions.
 */
export function buildHostUpdateInput(
  values: PodEditValues,
  options?: Readonly<{ includeSpots?: boolean }>,
) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    ...(options?.includeSpots
      ? { no_of_spots: Number.parseInt(values.no_of_spots_text, 10) || 0 }
      : {}),
  };
}

/**
 * The sentence under the spots control.
 *
 * A host reads two different things depending on what is holding them: the
 * space's capacity when the venue caps it, and the activity's own floor when
 * nothing does. mWeb twin: spotsBoundsHint in @duncit/host-pod-actions.
 */
export function spotsBoundsHint(
  limits: PodSpotLimits,
  t: (key: string, options?: { vars?: Record<string, string | number> }) => string,
): string {
  if (limits.venue_capacity > 0) {
    return t('mweb.hostPodEdit.spotsVenueHint', {
      vars: { capacity: limits.venue_capacity, taken: limits.seats_taken },
    });
  }
  return t('mweb.hostPodEdit.spotsFreeHint', {
    vars: { min: limits.min, taken: limits.seats_taken },
  });
}

/** The same values as the AI content check's input — title, description and
 * the gallery's images, which is exactly what the guidelines cover (mWeb twin:
 * `buildPodEditModerationInput` in @duncit/host-pod-actions). */
export function buildPodEditModerationInput(values: PodEditValues) {
  const input = buildHostUpdateInput(values);
  return {
    pod_title: input.pod_title,
    pod_description: input.pod_description,
    image_urls: podModerationImageUrls(input.pod_images_and_videos),
  };
}

/** Prefills the form from the pod being edited. */
export function podEditInitialValues(pod: HostPodSummary | null): PodEditValues {
  if (!pod) return blankPodEditValues;
  return {
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    no_of_spots_text: String(pod.no_of_spots ?? ''),
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
  };
}

/** Subjects offered in the delete-pod reason dropdown (kept in sync with the server). */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

export interface PodDeleteImpact {
  other_attendee_count: number;
  refundable_payment_count: number;
  refund_total: number;
  currency_symbol: string;
}

/** Validates the delete reason — a note is mandatory for "Other". */
export function validateDeleteReason(subject: string, note: string): string | null {
  if (!subject) return 'Select a reason';
  if (subject === 'Other' && !note.trim()) return 'Please describe the reason';
  return null;
}
