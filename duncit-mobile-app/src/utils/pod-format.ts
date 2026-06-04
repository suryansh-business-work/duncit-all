import { format } from 'date-fns';

import type { HomePod } from '@/hooks/useHomeFeed';

/** First image (preferred) or first media url for a pod, else null. */
export function podImageUrl(pod: HomePod): string | null {
  const media =
    pod.pod_images_and_videos.find((m) => m.type === 'IMAGE') ?? pod.pod_images_and_videos[0];
  return media?.url ?? null;
}

/** Local-timezone date label, e.g. "Sat, 7 Jun · 6:30 PM". date-fns formats in
 * the device timezone; admin-configurable formatting is a follow-up (rule 11). */
export function podDateLabel(pod: HomePod): string {
  if (!pod.pod_date_time) return 'Date pending';
  const date = new Date(pod.pod_date_time);
  return Number.isNaN(date.getTime()) ? 'Date pending' : format(date, 'EEE, d MMM · h:mm a');
}

/** "Free" for any free pod type, else the rupee amount. */
export function podPriceLabel(pod: HomePod): string {
  return pod.pod_type.includes('FREE') ? 'Free' : `₹${pod.pod_amount}`;
}

/** "label · detail" from the optional place fields. */
export function podPlaceLabel(pod: HomePod): string {
  return [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
}
