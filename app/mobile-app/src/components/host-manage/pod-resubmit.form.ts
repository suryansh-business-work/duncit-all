import { z } from 'zod';

import { CategoryMediaType } from '@/generated/graphql/graphql';
import { hasImageLine } from '@/components/create-pod/create-pod.form';

/** Shared logic for the venue-rejected pod's full edit + resubmission flow —
 * mirrors mWeb's pod-resubmit.form (rule 27 parity). */

export interface PodResubmitValues {
  pod_title: string;
  pod_description: string;
  media_text: string;
  venue_id: string;
  venue_slot_id: string;
}

export interface HostPodForResubmit {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  venue_id?: string | null;
}

export interface ResubmitVenueOption {
  id: string;
  venue_name: string;
  city?: string | null;
}

export interface ResubmitSlotOption {
  id: string;
  start_at: string;
  end_at: string;
  price: number;
  space_label: string;
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
  media_text: z.string().refine((text) => hasImageLine(text), 'Add at least one image URL'),
  venue_id: z.string().min(1, 'Select a venue'),
  venue_slot_id: z.string().min(1, 'Select a time slot'),
});

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

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
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    venue_id: values.venue_id,
    venue_slot_id: values.venue_slot_id,
  };
}

/** Prefills the form from the rejected pod (a fresh venue + slot must be picked). */
export function podResubmitInitialValues(pod: HostPodForResubmit | null): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  return {
    pod_title: pod.pod_title,
    pod_description: pod.pod_description ?? '',
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
    venue_id: '',
    venue_slot_id: '',
  };
}

/** "Wed, 5 Mar, 6:00 pm – 8:00 pm · Hall A · ₹400" — one slot option line. */
export function slotOptionLabel(slot: ResubmitSlotOption): string {
  const start = new Date(slot.start_at);
  const end = new Date(slot.end_at);
  const day = start.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = `${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  const space = slot.space_label ? ` · ${slot.space_label}` : '';
  const price = slot.price > 0 ? ` · ₹${slot.price}` : '';
  return `${day}, ${time}${space}${price}`;
}

/** One venue option line — "Hall · Pune". */
export function venueOptionLabel(venue: ResubmitVenueOption): string {
  return venue.city ? `${venue.venue_name} · ${venue.city}` : venue.venue_name;
}
