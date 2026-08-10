import { format } from 'date-fns';
import { buildPodShareMessage } from '@duncit/utils';

import { PodOccurrence } from '@/generated/graphql/graphql';
import { fallbackT, type Translate } from '@/i18n/fallback';
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

/** "Free" for a free pod, else the rupee amount. `t` comes from the rendering
 * screen so the word follows the reader's language; the bundled English is the
 * default for call sites that have none. */
export function podPriceLabel(pod: HomePod, t: Translate = fallbackT): string {
  return pod.pod_type === 'FREE' ? t('mweb.podDetails.free') : `₹${pod.pod_amount}`;
}

/** "Free" / "Paid" from the pod type. */
export function podTypeLabel(type: string): string {
  return type === 'FREE' ? 'Free' : 'Paid'; // TODO(i18n)
}

/** "label · detail" from the optional place fields. */
export function podPlaceLabel(pod: HomePod): string {
  return [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
}

// Product names, which are the same in every language — only "Online", the
// stand-in for a platform we have no name for, is copy.
const MEETING_PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MICROSOFT_TEAMS: 'Microsoft Teams',
  TEAMS: 'Microsoft Teams',
  SKYPE: 'Skype',
  WEBEX: 'Webex',
};

/** Maps a meeting-platform enum (e.g. GOOGLE_MEET) to a human label. Falls back
 * to a title-cased value, never the raw SCREAMING_SNAKE enum. Mirrors mWeb. */
export function formatMeetingPlatform(value?: string | null, t: Translate = fallbackT): string {
  if (!value || value === 'OTHER') return t('mweb.podDetails.online');
  return (
    MEETING_PLATFORM_LABELS[value] ??
    value
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ')
  );
}

/** "Virtual" / "Physical" from the pod mode. */
export function podModeLabel(mode?: string | null, t: Translate = fallbackT): string {
  return mode === 'VIRTUAL' ? t('mweb.podDetails.virtual') : t('mweb.podDetails.physical');
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

// When a pod has no explicit end time, treat it as live for this long after start.
const POD_LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

export type PodStatus = 'LIVE' | 'UPCOMING' | 'ENDED';

/** Derives a pod's status from its start (and optional end) timestamp relative
 * to now. Mirrors mWeb's podStatus. */
export function podStatus(start?: string | null, end?: string | null): PodStatus {
  if (!start) return 'UPCOMING';
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return 'UPCOMING';
  const endMs = end ? new Date(end).getTime() : startMs + POD_LIVE_TAIL_MS;
  const now = Date.now();
  if (now < startMs) return 'UPCOMING';
  if (now <= endMs) return 'LIVE';
  return 'ENDED';
}

/** True while a pod has not ended yet (live or upcoming) — used to hide past
 * pods from "Upcoming" lists. Mirrors mWeb's podStatus/isPodActive. */
export function isPodActive(start?: string | null, end?: string | null): boolean {
  return podStatus(start, end) !== 'ENDED';
}

/** True once the pod's start time has passed — the canonical "expired" test used
 * across Explore (join closed) and Pod details (shop disabled, "Attended"). */
export function isPodExpired(start?: string | null): boolean {
  if (!start) return false;
  const ms = new Date(start).getTime();
  return !Number.isNaN(ms) && ms < Date.now();
}

export type TimeTone = 'error' | 'warning' | 'info';

/** Countdown chip data for the pod start: expired / soon / N days · hours.
 * Mirrors mWeb's PodOverview TimeChip. Null when the date is unknown. */
export function podTimeChip(
  iso?: string | null,
  t: Translate = fallbackT,
): { label: string; tone: TimeTone } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) return { label: t('mweb.podDetails.podExpired'), tone: 'error' };
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  let label: string;
  if (days > 1) label = t('mweb.podDetails.daysRemaining', { vars: { days } });
  else if (hours > 1) label = t('mweb.podDetails.hoursRemaining', { vars: { hours } });
  else label = t('mweb.podDetails.startingSoon');
  return { label, tone: days <= 1 ? 'warning' : 'info' };
}

/** Long schedule label, e.g. "Tuesday, 2 June 2026 at 19:00 → 21:00" in the
 * device timezone. */
export function podScheduleLabel(
  start?: string | null,
  end?: string | null,
  t: Translate = fallbackT,
): string {
  if (!start) return t('mweb.podDetails.datePending');
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return t('mweb.podDetails.datePending');
  let label = format(startDate, "EEEE, d MMMM yyyy 'at' h:mm a");
  if (end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime())) label += ` → ${format(endDate, 'h:mm a')}`;
  }
  return label;
}

export const POD_WEB_BASE = 'https://mweb.duncit.com';

export interface PodSharable {
  pod_id: string;
  pod_title: string;
  club_slug?: string | null;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
  place_label?: string | null;
  place_detail?: string | null;
}

/** Share text for a pod — name + a deep link plus the date/time and venue, so a
 * recipient lands on the pod detail page with full context (not just the title). */
export function podShareMessage(pod: PodSharable): { message: string; url: string } {
  const url = pod.club_slug
    ? `${POD_WEB_BASE}/club/${pod.club_slug}/pod/${pod.pod_id}`
    : `${POD_WEB_BASE}/pod/${pod.pod_id}`;
  // Shape lives in @duncit/utils so mWeb shares the identical message (rule 27);
  // the date string is formatted here, through this surface's own clock.
  const message = buildPodShareMessage({
    title: pod.pod_title,
    whenText: pod.pod_date_time ? podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time) : null,
    venue: pod,
    url,
  });
  return { message, url };
}
