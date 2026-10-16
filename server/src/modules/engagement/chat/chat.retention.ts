/**
 * The one place the chat retention rules are expressed server-side.
 *
 * - A pod's chat is deleted `pod_chat_retention_hours` (Admin > Pods > Pod
 *   Settings) after the pod ENDS — its end time, or start + the live tail when
 *   it has none, the same end every other pod deadline reads (`podLiveEnd`).
 * - A club never ends, so its chat ages out instead: a message older than
 *   `club_chat_retention_days` (Clubs > Club Settings) is deleted.
 *
 * The sweep that deletes and the dates the rooms show both read this module,
 * so the date a member is told is the date the sweep acts on.
 */
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import {
  cleanClubChatRetentionDays,
  cleanPodChatRetentionHours,
} from '@modules/platform/settings/settings.service';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export interface ChatRetention {
  podHours: number;
  clubDays: number;
}

export async function chatRetention(): Promise<ChatRetention> {
  const doc = await AppSettingsModel.findOne({ singleton_key: 'app' })
    .select('pod_chat_retention_hours club_chat_retention_days')
    .lean();
  return {
    podHours: cleanPodChatRetentionHours(doc?.pod_chat_retention_hours),
    clubDays: cleanClubChatRetentionDays(doc?.club_chat_retention_days),
  };
}

/** When a pod's chat is deleted. Null when the pod cannot be placed on a clock
 * (no usable start) — nothing to promise, so nothing is shown or swept. */
export function podChatDeletesAt(
  pod: { pod_date_time?: Date | string | null; pod_end_date_time?: Date | string | null },
  hours: number
): Date | null {
  const end = podLiveEnd(pod);
  return end ? new Date(end.getTime() + hours * HOUR_MS) : null;
}

/** Club messages created before this instant are past their retention. */
export function clubChatCutoff(days: number, now = Date.now()): Date {
  return new Date(now - days * DAY_MS);
}
