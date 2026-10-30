import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { notifyEach } from '@services/notify/notify.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { appDate, appTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import type { StoredMedia } from '@utils/media';
import { loadPodClubSlugMap, podNotificationLink } from './pod.service';

/** The pod fields a move notice reads. */
export interface MovedPod {
  _id: Types.ObjectId;
  pod_title: string;
  pod_date_time: Date;
  venue_id?: Types.ObjectId | null;
  pod_attendees?: readonly Types.ObjectId[] | null;
  pod_images_and_videos?: StoredMedia[] | null;
}

/** Where a pod with no venue happens. */
const ONLINE = 'Online';

/** What a booking is about: when it starts and where. */
export interface PodWhenWhere {
  pod_date_time?: Date | null;
  venue_id?: Types.ObjectId | string | null;
}

/** True when the start time or the venue moved — the two changes that send a
 * guest to the wrong place at the wrong time if nobody tells them. */
export function podWhenWhereChanged(before: PodWhenWhere, after: PodWhenWhere): boolean {
  const time = (value?: Date | null) => (value ? new Date(value).getTime() : 0);
  return (
    time(before.pod_date_time) !== time(after.pod_date_time) ||
    String(before.venue_id ?? '') !== String(after.venue_id ?? '')
  );
}

/**
 * Tell everyone booked on a pod that its date, time or venue moved — WhatsApp
 * and email from one set of values, plus an in-app row unless the caller has
 * already written its own.
 *
 * Keyed on the pod AND the new slot, so a pod moved twice tells people twice
 * and a retried save tells them once. Never throws: the move is already saved.
 */
export async function notifyPodRescheduled(pod: MovedPod, opts: { inApp?: boolean } = {}): Promise<void> {
  try {
    const attendees: string[] = (pod.pod_attendees ?? [])
      .map(String)
      .filter((id: string) => Types.ObjectId.isValid(id));
    if (attendees.length === 0) return;
    const [users, venue, urls, slugById] = await Promise.all([
      loadNotifyRecipients(attendees),
      pod.venue_id ? VenueModel.findById(pod.venue_id).select('venue_name').lean() : null,
      getUrlConfigs(),
      loadPodClubSlugMap([pod]),
    ]);
    const path = podNotificationLink(pod, slugById);
    const link = `${trimTrailingSlash(urls.mwebUrl)}${path || ''}`;
    // A virtual pod has no venue; a blank value would be refused by the funnel.
    const venueName = (venue as { venue_name?: string } | null)?.venue_name || ONLINE;
    const date = appDate(pod.pod_date_time);
    const time = appTime(pod.pod_date_time);
    const entityId = `${pod._id.toString()}:${new Date(pod.pod_date_time).getTime()}:${pod.venue_id?.toString() ?? ''}`;

    if (opts.inApp !== false) {
      await notificationService
        .create({
          title: `${pod.pod_title} has moved`,
          body: `${pod.pod_title} now runs at ${venueName} on ${date}, ${time}. Your spot moved with it.`,
          image_url: pod.pod_images_and_videos?.[0]?.url ?? null,
          link_url: path,
          scope: 'USER',
          target_user_ids: attendees,
        })
        .catch((error: unknown) => logs.server.warn('pod', 'rescheduleInApp', { error, pod_id: String(pod._id) }));
    }

    await notifyEach(
      attendees.map((id) => {
        const user = users.get(id) ?? null;
        const name = recipientName(user);
        return {
          event: 'USER_POD_RESCHEDULED',
          entityId,
          user,
          name,
          assets: podImageAssets(pod.pod_images_and_videos),
          params: [name, pod.pod_title, date, time, venueName, link],
        };
      })
    );
  } catch (error) {
    logs.server.error('pod', 'notifyPodRescheduled', { error, pod_id: pod._id.toString() });
  }
}
