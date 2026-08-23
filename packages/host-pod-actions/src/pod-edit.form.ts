import { z } from 'zod';
import { podModerationImageUrls } from '@duncit/utils';
import { hasImageLine, mediaTextToInput, mediaToText } from './media-text';
import type { HostPodActionLabels } from './labels';
import type { HostPodTarget } from './types';

/** Shapes for the host's limited pod edit (title, images, description). */
export interface PodEditValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
}

export const blankPodEditValues: PodEditValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
};

/** Built from the surface's labels: a validation message is copy the host
 *  reads, so it follows their language like the rest of the dialog (rule 38). */
export const buildPodEditSchema = (labels: HostPodActionLabels) =>
  z.object({
    pod_title: z.string().trim().min(3, labels.titleTooShort).max(120, labels.titleTooLong),
    pod_description: z.string().trim().min(10, labels.descriptionTooShort),
    media_text: z.string().refine(hasImageLine, labels.imageRequired),
  });

/** Maps the validated values onto the server's HostUpdatePodInput. */
export function buildHostUpdateInput(values: PodEditValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaTextToInput(values.media_text),
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
  };
}
