import {
  buildPodShareMessage,
  meetingPlatformName,
  podPhase,
  type PodPhase,
  type PodShareLinks,
} from '@duncit/utils';

import { config } from '@/constants/config';
import { PodOccurrence } from '@/generated/graphql/graphql';
import { fallbackT, type Translate } from '@/i18n/fallback';
import type { HomePod } from '@/hooks/useHomeFeed';
import { formatDateTime, formatTime } from '@/utils/date-format';

/** First image (preferred) or first media url for a pod, else null. */
export function podImageUrl(pod: HomePod): string | null {
  const media =
    pod.pod_images_and_videos.find((m) => m.type === 'IMAGE') ?? pod.pod_images_and_videos[0];
  return media?.url ?? null;
}

/** Pod date label in the admin's configured date and time patterns and zone,
 * e.g. "07 Jun 2026 · 06:30 PM" — the same reading mWeb's pod cards give. */
export function podDateLabel(pod: HomePod): string {
  return formatDateTime(pod.pod_date_time) || 'Date pending';
}

/** "Free" for a free pod, else the rupee amount. `t` comes from the rendering
 * screen so the word follows the reader's language; the bundled English is the
 * default for call sites that have none. */
export function podPriceLabel(pod: HomePod, t: Translate = fallbackT): string {
  return pod.pod_type === 'FREE' ? t('mweb.podDetails.free') : `₹${pod.pod_amount}`;
}

/** "Free" / "Paid" from the pod type. `t` comes from the rendering screen so
 * the word follows the reader's language; the bundled English is the default. */
export function podTypeLabel(type: string, t: Translate = fallbackT): string {
  return type === 'FREE' ? t('mweb.createPod.free') : t('mweb.common.paid');
}

/** "label · detail" from the optional place fields. */
export function podPlaceLabel(pod: HomePod): string {
  return [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
}

/**
 * Maps a meeting-platform code (e.g. GOOGLE_MEET) to a human label.
 *
 * The name table lives in @duncit/utils — it was duplicated here and in mWeb,
 * and the create-pod dropdown would have made a third copy. What stays local is
 * the only part that is copy rather than a product name.
 */
export function formatMeetingPlatform(value?: string | null, t: Translate = fallbackT): string {
  if (!value) return t('mweb.podDetails.online');
  // An explicit "Other" is a choice the host made, so it is named as one — it
  // used to render as "Online", which reads as "we do not know". mWeb twin.
  if (value === 'OTHER') return t('mweb.createPod.meetingPlatformOther');
  return meetingPlatformName(value);
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

export type PodStatus = 'LIVE' | 'UPCOMING' | 'ENDED';

/** The chip vocabulary this surface speaks, over the shared time rule. */
const STATUS_OF_PHASE: Record<PodPhase, PodStatus> = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'LIVE',
  PREVIOUS: 'ENDED',
};

/** Derives a pod's status from its start (and optional end) timestamp relative
 * to now. The start/end/tail rule itself lives in @duncit/utils, shared with
 * mWeb's podStatus and with the Home rails' Ongoing bucket. */
export function podStatus(start?: string | null, end?: string | null): PodStatus {
  return STATUS_OF_PHASE[podPhase(start, end)];
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

/** Full schedule label, e.g. "02 Jun 2026 · 07:00 PM → 09:00 PM", in the admin's
 * configured patterns and zone. */
export function podScheduleLabel(
  start?: string | null,
  end?: string | null,
  t: Translate = fallbackT,
): string {
  const label = formatDateTime(start);
  if (!label) return t('mweb.podDetails.datePending');
  const endLabel = end ? formatTime(end) : '';
  return endLabel ? `${label} → ${endLabel}` : label;
}

/** The mWeb origin this build shares links to — local in dev, production in a
 * release build. Hardcoding it meant a link tested locally opened production. */
export const POD_WEB_BASE = config.webUrl;

export interface PodSharable {
  pod_id: string;
  pod_title: string;
  club_slug?: string | null;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
  place_label?: string | null;
  place_detail?: string | null;
}

/** The pod page on the web, as this build addresses it. */
export const podWebUrl = (pod: PodSharable) =>
  pod.club_slug
    ? `${POD_WEB_BASE}/club/${pod.club_slug}/pod/${pod.pod_id}`
    : `${POD_WEB_BASE}/pod/${pod.pod_id}`;

/**
 * Share text for a pod — name + a deep link plus the date/time and venue, so a
 * recipient lands on the pod detail page with full context (not just the title).
 *
 * `links` carries the tracked short links the screen resolved for the pod and
 * its venue map; without them the plain URLs are used, which reads the same but
 * is not counted.
 */
export function podShareMessage(
  pod: PodSharable,
  links?: PodShareLinks,
): { message: string; url: string } {
  const url = links?.url ?? podWebUrl(pod);
  // Shape lives in @duncit/utils so mWeb shares the identical message (rule 27);
  // the date string is formatted here, through this surface's own clock.
  const message = buildPodShareMessage({
    title: pod.pod_title,
    whenText: pod.pod_date_time ? podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time) : null,
    venue: pod,
    url,
    mapUrl: links?.mapUrl,
  });
  return { message, url };
}
