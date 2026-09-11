import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { appDate, appTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import { logs } from '@observability/log';

/**
 * "Ask my club admin for help" — the host of a pod, or the venue it runs at,
 * pings every admin of the pod's club with the pod and a way to reach them.
 *
 * The card beside it already carries the admin's number, so this is not the
 * only way to reach them: it is the one that lands in their mail and WhatsApp
 * with the pod attached, and the one that leaves a trace in the Logs console.
 *
 * One request per pod, per side, per day. The WhatsApp log is the record — every
 * outcome writes a row there, sent or skipped — so the guard needs no collection
 * of its own, and the email leg (which has no idempotency) cannot be pressed
 * into a flood.
 */

export type PodHelpSide = 'HOST' | 'VENUE';
export type PodHelpStatus = 'SENT' | 'ALREADY_REQUESTED' | 'NO_CLUB_ADMIN';

const EVENT: Readonly<Record<PodHelpSide, string>> = {
  HOST: 'CLUB_ADMIN_HOST_HELP',
  VENUE: 'CLUB_ADMIN_VENUE_HELP',
};

const CONTACT_FIELDS =
  'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

const fail = (code: string, message: string) =>
  new GraphQLError(message, { extensions: { code } });

const nameOf = (user: any): string =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

/** A number the admin can dial straight from the message, else the address. */
function contactOf(user: any): string {
  const number = destinationFor(user ?? {});
  return number ? `+${number}` : String(user?.auth?.email ?? '');
}

interface Requester {
  /** What the admin reads as "who is asking" — the host's name or the venue's. */
  who: string;
  contact: string;
}

/** The caller as the side they asked from, or FORBIDDEN. */
async function requesterFor(pod: any, side: PodHelpSide, callerId: string): Promise<Requester> {
  const caller = await UserModel.findById(callerId).select(CONTACT_FIELDS).lean();
  if (side === 'HOST') {
    const hostIds: string[] = (pod.pod_hosts_id ?? []).map(String);
    if (!hostIds.includes(callerId)) throw fail('FORBIDDEN', 'Only the host of this pod can ask for help as its host');
    return { who: nameOf(caller) || 'Your host', contact: contactOf(caller) };
  }
  const venue: any = pod.venue_id
    ? await VenueModel.findById(pod.venue_id).select('owner_user_id venue_name').lean()
    : null;
  if (String(venue?.owner_user_id ?? '') !== callerId) {
    throw fail('FORBIDDEN', 'Only the venue this pod runs at can ask for help as its venue');
  }
  return { who: venue.venue_name || nameOf(caller), contact: contactOf(caller) };
}

/** Today in UTC — the day a request is counted against. */
const dayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Whether this side already asked about this pod today.
 *
 * Bounded by `created_at` on purpose: the only compound index on the log is
 * partial on `holds_slot`, which a query without that field cannot use, so the
 * day bound is what lets the `created_at` index answer instead of a scan.
 */
const askedToday = (event: string, entityId: string, day: string) =>
  WaMessageLogModel.exists({
    event_key: event,
    entity_id: entityId,
    created_at: { $gte: new Date(`${day}T00:00:00.000Z`) },
  });

export async function requestPodClubAdminHelp(
  podDocId: string,
  side: PodHelpSide,
  callerId: string
): Promise<{ status: PodHelpStatus; notified: number }> {
  if (!Types.ObjectId.isValid(podDocId)) throw fail('BAD_USER_INPUT', 'Invalid pod id');
  const pod: any = await PodModel.findById(podDocId)
    .select('pod_title pod_date_time pod_hosts_id venue_id club_id pod_images_and_videos')
    .lean();
  if (!pod) throw fail('NOT_FOUND', 'Pod not found');

  const requester = await requesterFor(pod, side, callerId);
  const day = dayKey();
  const entityId = `${podDocId}:${side}:${day}`;
  if (await askedToday(EVENT[side], entityId, day)) {
    return { status: 'ALREADY_REQUESTED', notified: 0 };
  }

  const club: any = pod.club_id
    ? await ClubModel.findById(pod.club_id).select('admin_user_ids').lean()
    : null;
  const adminIds: string[] = (club?.admin_user_ids ?? []).map(String);
  if (adminIds.length === 0) return { status: 'NO_CLUB_ADMIN', notified: 0 };

  const [admins, urls] = await Promise.all([
    UserModel.find({ _id: { $in: adminIds } }).select(CONTACT_FIELDS).lean(),
    getUrlConfigs(),
  ]);
  const appUrl = `${trimTrailingSlash(urls.partnersUrl)}/club-admin/clubs/${String(pod.club_id)}/pods/${podDocId}`;
  const inputs: NotifyInput[] = admins.map((admin: any) => {
    const name = nameOf(admin) || 'there';
    return {
      // Indexed rather than a local: check-whatsapp resolves `EVENT[side]` to
      // both scenarios and holds the six values below to each one's arity.
      event: EVENT[side],
      entityId,
      user: admin,
      name,
      assets: podImageAssets(pod.pod_images_and_videos),
      params: [
        name,
        pod.pod_title,
        appDate(pod.pod_date_time),
        appTime(pod.pod_date_time),
        requester.who,
        requester.contact,
      ],
      vars: { app_url: appUrl },
    };
  });
  await notifyEach(inputs);
  logs.server.info('pod-help', 'request', {
    pod_id: podDocId,
    side,
    recipients: inputs.length,
    msg: 'club admin help requested',
  });
  return { status: 'SENT', notified: inputs.length };
}
