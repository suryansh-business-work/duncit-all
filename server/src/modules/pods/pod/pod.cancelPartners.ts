import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import type { StoredMedia } from '@utils/media';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { podDateLabel, podTimeLabel } from './pod.shared';

/** The pod fields a partner cancellation notice reads. */
export interface CancelledPod {
  _id: Types.ObjectId;
  pod_title: string;
  pod_date_time: Date;
  venue_id?: Types.ObjectId | null;
  club_id?: Types.ObjectId | null;
  pod_images_and_videos?: StoredMedia[] | null;
}

/** Who cancelled, as the venue and club admin are told it. */
export type PartnerCancelInitiator = 'HOST' | 'VENUE_OWNER' | 'ADMIN' | 'CLUB_ADMIN' | 'SYSTEM';

const CANCELLED_BY: Record<PartnerCancelInitiator, string> = {
  HOST: 'the host',
  VENUE_OWNER: 'the venue',
  ADMIN: 'Duncit',
  CLUB_ADMIN: 'the club admin',
  // The auto-cancel sweep: the pod could not cover its costs in time.
  SYSTEM: 'Duncit (not enough bookings)',
};

/**
 * Tell the venue and the club admins that a pod they were part of is off.
 *
 * The attendee fan-out and the host's own notice already go out; the two
 * partners who had blocked a room and planned a session around the pod heard
 * nothing, and a venue kept the court ready for people who were never coming.
 *
 * Whoever cancelled is not told their own cancellation: a venue that cancelled
 * gets nothing, and neither does the club admin who pressed the button. Keyed
 * on the pod, which is cancelled once. Never throws — the money has moved.
 */
export async function notifyPartnersOfCancellation(
  doc: CancelledPod,
  initiatedBy: PartnerCancelInitiator,
  actorUserId: string
): Promise<void> {
  try {
    const [venue, club] = await Promise.all([
      doc.venue_id
        ? VenueModel.findById(doc.venue_id).select('owner_user_id').lean<{ owner_user_id?: Types.ObjectId | null }>()
        : null,
      doc.club_id
        ? ClubModel.findById(doc.club_id).select('admin_user_ids').lean<{ admin_user_ids?: Types.ObjectId[] }>()
        : null,
    ]);
    const venueOwnerId = initiatedBy === 'VENUE_OWNER' ? '' : (venue?.owner_user_id?.toString() ?? '');
    const adminIds = (club?.admin_user_ids ?? [])
      .map((id) => id.toString())
      .filter((id) => id && id !== actorUserId);
    const users = await loadNotifyRecipients([venueOwnerId, ...adminIds]);
    const by = CANCELLED_BY[initiatedBy];
    const date = podDateLabel(doc);
    const time = podTimeLabel(doc);
    const send = (event: string, userId: string): NotifyInput | null => {
      const user = users.get(userId);
      if (!user) return null;
      const name = recipientName(user);
      return {
        event,
        entityId: doc._id.toString(),
        user,
        name,
        assets: podImageAssets(doc.pod_images_and_videos),
        params: [name, doc.pod_title, date, time, by],
      };
    };
    const inputs = [
      venueOwnerId ? send('VENUE_POD_CANCELLED', venueOwnerId) : null,
      ...adminIds.map((id) => send('CLUB_ADMIN_POD_CANCELLED', id)),
    ].filter((input): input is NotifyInput => input !== null);
    if (inputs.length > 0) await notifyEach(inputs);
  } catch (error) {
    logs.server.error('pod', 'notifyPartnersOfCancellation', { error, pod_id: doc._id.toString() });
  }
}
