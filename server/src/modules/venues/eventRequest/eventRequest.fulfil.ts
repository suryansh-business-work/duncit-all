import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { appDate, appTime } from '@utils/app-time';
import { podLink } from '@modules/venues/venueFood/venueSubscriber.service';
import { EventRequestModel, type EventRequestTarget } from './eventRequest.model';

/**
 * A pod just went live: every OPEN request to its venue or to one of its hosts
 * is answered. Each is closed as FULFILLED by this pod and its member is told
 * in the app — beside, not instead of, the venue-subscriber announcement.
 *
 * Idempotent: only OPEN rows move, and only the rows THIS pod closed are told,
 * so an approval replayed (or two pods going live at once) never tells a member
 * twice. Never throws — a failure here must not undo or hold open a booking.
 */

const LOG = 'event-request';

export interface PodLiveFacts {
  podId: string;
  podTitle: string;
  venueId?: Types.ObjectId | string | null;
  venueName?: string;
  hostIds: readonly unknown[];
  hostName?: string;
  date: string;
  time: string;
}

interface ClosedRow {
  requester_id: Types.ObjectId;
  target_type: EventRequestTarget;
}

const toObjectIds = (ids: readonly unknown[]) =>
  ids.map(String).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

function targetsOf(facts: PodLiveFacts): Record<string, unknown>[] {
  const targets: Record<string, unknown>[] = [];
  if (facts.venueId && Types.ObjectId.isValid(String(facts.venueId))) {
    targets.push({ target_type: 'VENUE', target_id: new Types.ObjectId(String(facts.venueId)) });
  }
  const hosts = toObjectIds(facts.hostIds);
  if (hosts.length > 0) targets.push({ target_type: 'HOST', target_id: { $in: hosts } });
  return targets;
}

async function tellRequesters(rows: readonly ClosedRow[], facts: PodLiveFacts) {
  const link = await podLink(facts.podId);
  const { notificationService } = await import('@modules/engagement/notification/notification.service');
  const body = `${facts.podTitle} · ${facts.date}, ${facts.time}`;
  // One note per kind of ask, so each reads as the answer to what was asked.
  const groups: [EventRequestTarget, string][] = [
    ['VENUE', `You asked for an event at ${facts.venueName ?? 'this venue'} — it's live`],
    ['HOST', `You asked ${facts.hostName ?? 'a host'} for an event — it's live`],
  ];
  for (const [type, title] of groups) {
    const userIds = [...new Set(rows.filter((row) => row.target_type === type).map((row) => String(row.requester_id)))];
    if (userIds.length === 0) continue;
    // eslint-disable-next-line no-await-in-loop
    await notificationService.create({
      title,
      body,
      image_url: null,
      link_url: link,
      scope: 'USER',
      target_user_ids: userIds,
    });
  }
}

async function run(facts: PodLiveFacts) {
  const targets = targetsOf(facts);
  if (targets.length === 0) return;
  const podId = new Types.ObjectId(facts.podId);
  const result = await EventRequestModel.updateMany(
    { status: 'OPEN', $or: targets },
    { $set: { status: 'FULFILLED', fulfilled_pod_id: podId, closed_at: new Date(), closed_by_id: null } }
  );
  if (result.modifiedCount === 0) return;
  const closed: ClosedRow[] = await EventRequestModel.find({ fulfilled_pod_id: podId, $or: targets })
    .select('requester_id target_type')
    .lean();
  await tellRequesters(closed, facts);
  logs.server.info(LOG, 'fulfil', { podId: facts.podId, closed: result.modifiedCount });
}

/** Queue the close-and-tell for a pod that just went live; answers at once. */
export function fulfilEventRequests(facts: PodLiveFacts): void {
  if (!Types.ObjectId.isValid(facts.podId)) return;
  run(facts).catch((error: unknown) => logs.server.error(LOG, 'fulfil', { error, podId: facts.podId }));
}

/** The few pod fields a pod that went live without a venue slot hands over. */
export interface LivePodRow {
  _id: unknown;
  pod_title: string;
  venue_id?: Types.ObjectId | string | null;
  pod_hosts_id: readonly unknown[];
  pod_date_time: Date;
}

/**
 * For a pod live from birth with no venue slot to approve — a virtual pod — the
 * slot hooks never run, so the pod funnel answers its hosts' requests here.
 * Looks the lead host's name up itself; queues and returns, never throws.
 */
export function fulfilEventRequestsForPod(pod: Readonly<LivePodRow>): void {
  const podId = String(pod._id);
  const name = async () => {
    const { UserModel } = await import('@modules/access/user/user.model');
    const lead = await UserModel.findById(pod.pod_hosts_id[0]).select('profile.first_name profile.last_name').lean();
    const profile = (lead as { profile?: { first_name?: string; last_name?: string } } | null)?.profile;
    return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || undefined;
  };
  name()
    .then((hostName) =>
      fulfilEventRequests({
        podId,
        podTitle: pod.pod_title,
        venueId: pod.venue_id ?? null,
        hostIds: pod.pod_hosts_id,
        hostName,
        date: appDate(pod.pod_date_time),
        time: appTime(pod.pod_date_time),
      })
    )
    .catch((error: unknown) => logs.server.error(LOG, 'fulfilForPod', { error, podId }));
}
