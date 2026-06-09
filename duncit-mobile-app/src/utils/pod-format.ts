import { format } from 'date-fns';

import { PodOccurrence } from '@/generated/graphql/graphql';
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

/** "Virtual" / "Physical" from the pod mode. */
export function podModeLabel(mode?: string | null): string {
  return mode === 'VIRTUAL' ? 'Virtual' : 'Physical';
}

/** Human labels for every PodOccurrence enum value — single source of truth so
 * raw values like "ONE_TIME" never reach the UI (rule 2/13). */
export const POD_OCCURRENCE_LABELS: Record<PodOccurrence, string> = {
  [PodOccurrence.OneTime]: 'One time',
  [PodOccurrence.Daily]: 'Daily',
  [PodOccurrence.AlternateDay]: 'Alternate day',
  [PodOccurrence.WeekendsOnly]: 'Weekends only',
  [PodOccurrence.Weekly]: 'Weekly',
  [PodOccurrence.Monthly]: 'Monthly',
};

/** Human occurrence label from the enum, e.g. "ONE_TIME" → "One time". */
export function podOccurrenceLabel(occurrence?: string | null): string {
  if (!occurrence) return '';
  return POD_OCCURRENCE_LABELS[occurrence as PodOccurrence] ?? occurrence.replaceAll('_', ' ');
}

export type TimeTone = 'error' | 'warning' | 'info';

/** Countdown chip data for the pod start: expired / soon / N days · hours.
 * Mirrors mWeb's PodOverview TimeChip. Null when the date is unknown. */
export function podTimeChip(iso?: string | null): { label: string; tone: TimeTone } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) return { label: 'Pod expired', tone: 'error' };
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  let label: string;
  if (days > 1) label = `${days} days remaining`;
  else if (hours > 1) label = `${hours} hours remaining`;
  else label = 'Starting soon';
  return { label, tone: days <= 1 ? 'warning' : 'info' };
}

/** Long schedule label, e.g. "Tuesday, 2 June 2026 at 19:00 → 21:00" in the
 * device timezone. */
export function podScheduleLabel(start?: string | null, end?: string | null): string {
  if (!start) return 'Date pending';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Date pending';
  let label = format(startDate, "EEEE, d MMMM yyyy 'at' HH:mm");
  if (end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime())) label += ` → ${format(endDate, 'HH:mm')}`;
  }
  return label;
}
