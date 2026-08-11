import { z } from 'zod';
import { hasImageLine, mediaTextToInput, mediaToText } from '../media-text';
import type { HostPodTarget } from '../types';

export interface PodResubmitValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  venue_id: string;
  venue_slot_id: string;
}

export const blankPodResubmitValues: PodResubmitValues = {
  pod_title: '',
  pod_description: '',
  media_text: '',
  venue_id: '',
  venue_slot_id: '',
};

export const podResubmitSchema = z.object({
  pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  pod_description: z.string().trim().min(10, 'Add a longer description'),
  media_text: z.string().refine(hasImageLine, 'Add at least one image URL'),
  venue_id: z.string().min(1, 'Select a venue'),
  venue_slot_id: z.string().min(1, 'Select a time slot'),
});

/** Maps the validated values onto the server's HostResubmitPodInput. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaTextToInput(values.media_text),
    venue_id: values.venue_id,
    venue_slot_id: values.venue_slot_id,
  };
}

/** Prefills the form from the rejected pod (a fresh venue + slot must be picked). */
export function podResubmitInitialValues(pod: HostPodTarget | null): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  return {
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: mediaToText(pod.pod_images_and_videos),
    venue_id: '',
    venue_slot_id: '',
  };
}
