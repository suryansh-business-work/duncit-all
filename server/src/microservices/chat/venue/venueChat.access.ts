import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { isFreePod, PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';

/** A venue booking's chat, as one member sees it. */
export interface VenueChatThread {
  /** The pod the thread belongs to. */
  podId: string;
  podTitle: string;
  podDateTime: Date | null;
  /** A free pod: its host settles the venue directly, so the chat names no money. */
  podIsFree: boolean;
  venueId: string;
  venueName: string;
  venuePhoto: string;
  ownerId: string;
  hostIds: string[];
}

/** The socket.io room a thread broadcasts to. */
export const venueChatRoomOf = (podId: string) => `venue-chat:${podId}`;

const forbidden = () =>
  new GraphQLError('Only the pod hosts and the venue can use this chat', { extensions: { code: 'FORBIDDEN' } });

/**
 * The thread for a pod booked at a venue, or null when there is none (no such
 * pod, or a pod that is not at a venue).
 */
export async function venueChatThread(podId: string): Promise<VenueChatThread | null> {
  if (!Types.ObjectId.isValid(podId)) return null;
  const pod = await PodModel.findById(podId).select('pod_title pod_date_time pod_type pod_hosts_id venue_id').lean();
  if (!pod?.venue_id) return null;
  const venue = await VenueModel.findById(pod.venue_id).select('owner_user_id venue_name cover_image_url').lean();
  if (!venue) return null;
  return {
    podId: String(pod._id),
    podTitle: pod.pod_title ?? '',
    podDateTime: pod.pod_date_time ?? null,
    podIsFree: isFreePod(pod),
    venueId: String(venue._id),
    venueName: venue.venue_name ?? '',
    venuePhoto: venue.cover_image_url ?? '',
    ownerId: String(venue.owner_user_id),
    hostIds: (pod.pod_hosts_id || []).map(String),
  };
}

/** Which side this user is on in the thread, or null when they are on neither. */
export function sideOf(thread: VenueChatThread, userId: string): 'HOST' | 'VENUE' | null {
  const uid = String(userId);
  if (thread.ownerId === uid) return 'VENUE';
  return thread.hostIds.includes(uid) ? 'HOST' : null;
}

/** The thread and the caller's side, or FORBIDDEN — the same answer for a pod
 * that does not exist, so the check never tells an outsider which pods do. */
export async function assertVenueChatMember(podId: string, userId: string) {
  const thread = await venueChatThread(podId);
  const side = thread ? sideOf(thread, userId) : null;
  if (!thread || !side) throw forbidden();
  return { thread, side };
}

/** Everyone in the thread: the venue's owner and every host. */
export const threadMembers = (thread: VenueChatThread) => [...new Set([thread.ownerId, ...thread.hostIds])];
