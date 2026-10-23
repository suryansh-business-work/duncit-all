import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { UserBlockModel } from '@modules/access/block/userBlock.model';

/** Which room a message lives in: a pod's or a club's. */
export type ChatRoomRef = { kind: 'POD'; id: string } | { kind: 'CLUB'; id: string };

/** The socket.io room name a chat room broadcasts to. */
export const socketRoomOf = (room: ChatRoomRef) =>
  room.kind === 'POD' ? `pod:${room.id}` : `club:${room.id}`;

/** The room a stored message belongs to. */
export const roomOfMessage = (msg: { pod_id?: string | null; club_id?: string | null }): ChatRoomRef =>
  msg.club_id ? { kind: 'CLUB', id: msg.club_id } : { kind: 'POD', id: String(msg.pod_id) };

const notMember = (room: ChatRoomRef) =>
  new GraphQLError(room.kind === 'POD' ? 'Not a pod member' : 'Join this club to use its chat', {
    extensions: { code: 'FORBIDDEN' },
  });

/** A pod's chat is its hosts, its attendees and anyone JOINED to it. */
export async function isPodMember(podId: string, userId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(podId)) return false;
  const pod = await PodModel.findById(podId).select('pod_hosts_id pod_attendees').lean();
  if (!pod) return false;
  const uid = String(userId);
  if ((pod.pod_hosts_id || []).map(String).includes(uid)) return true;
  if ((pod.pod_attendees || []).map(String).includes(uid)) return true;
  const m = await PodMemberModel.findOne({
    pod_id: pod._id,
    user_id: userId,
    status: 'JOINED',
  }).lean();
  return !!m;
}

/** The club's own people: its admins and linked hosts. They run the room. */
async function clubStaff(clubId: string): Promise<{ admins: string[]; hosts: string[] } | null> {
  if (!Types.ObjectId.isValid(clubId)) return null;
  const club = await ClubModel.findOne({ _id: clubId, is_active: true })
    .select('admin_user_ids host_ids')
    .lean();
  if (!club) return null;
  return {
    admins: (club.admin_user_ids || []).map(String),
    hosts: (club.host_ids || []).map(String),
  };
}

/** A club's chat is everyone who joined (followed) the club, plus its admins
 * and hosts. Unfollowing is leaving: the next read or post is refused. */
export async function isClubMember(clubId: string, userId: string): Promise<boolean> {
  const staff = await clubStaff(clubId);
  if (!staff) return false;
  const uid = String(userId);
  if (staff.admins.includes(uid) || staff.hosts.includes(uid)) return true;
  if (!Types.ObjectId.isValid(uid)) return false;
  return !!(await ClubFollowerModel.exists({ club_id: clubId, user_id: uid }));
}

export async function isRoomMember(room: ChatRoomRef, userId: string): Promise<boolean> {
  return room.kind === 'POD' ? isPodMember(room.id, userId) : isClubMember(room.id, userId);
}

export async function assertRoomMember(room: ChatRoomRef, userId: string): Promise<void> {
  if (!(await isRoomMember(room, userId))) throw notMember(room);
}

/** May this user remove someone else's message? A club's admins may, in their
 * club's room; a pod's hosts may, in their pod's room. */
export async function canModerateRoom(room: ChatRoomRef, userId: string): Promise<boolean> {
  const uid = String(userId);
  if (room.kind === 'CLUB') {
    const staff = await clubStaff(room.id);
    return !!staff && staff.admins.includes(uid);
  }
  if (!Types.ObjectId.isValid(room.id)) return false;
  const pod = await PodModel.findById(room.id).select('pod_hosts_id').lean();
  return !!pod && (pod.pod_hosts_id || []).map(String).includes(uid);
}

/** Everyone this user has blocked or is blocked by — their messages are kept
 * out of this user's view of any room, both ways, as everywhere else. */
export async function blockedPeerIds(userId: string): Promise<Set<string>> {
  if (!Types.ObjectId.isValid(userId)) return new Set();
  const me = new Types.ObjectId(userId);
  const rows = await UserBlockModel.find({
    unblocked_at: null,
    $or: [{ blocker_id: me }, { blocked_id: me }],
  })
    .select('blocker_id blocked_id')
    .lean();
  const peers = new Set<string>();
  for (const row of rows) {
    peers.add(String(row.blocker_id) === userId ? String(row.blocked_id) : String(row.blocker_id));
  }
  return peers;
}
