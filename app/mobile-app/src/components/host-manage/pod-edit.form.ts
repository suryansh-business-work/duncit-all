import { z } from 'zod';
import { podModerationImageUrls } from '@duncit/utils';

import { CategoryMediaType } from '@/generated/graphql/graphql';

/** Shapes for the host's limited pod edit (title, images, description — 2A). */
export interface PodEditValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
}

export interface HostPodSummary {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
}

export const blankPodEditValues: PodEditValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
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
});

/** Maps the validated values onto the server's HostUpdatePodInput. */
export function buildHostUpdateInput(values: PodEditValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
  };
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
