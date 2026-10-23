import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { UserModel } from '@modules/access/user/user.model';
import { escapeRegExp } from '@utils/regex';
import { assertRoomMember, type ChatRoomRef } from './chat.access';

/** Everyone in a room, with what a notification about it says and links to. */
export interface RoomAudience {
  ids: string[];
  title: string;
  link: string;
}

const NONE: RoomAudience = { ids: [], title: '', link: '' };

/**
 * A room's members, one read per source: a pod's hosts, attendees and JOINED members; a club's admins, hosts and
 * followers. Duplicates are removed. The same people `isRoomMember` admits.
 */
export async function roomAudience(room: ChatRoomRef): Promise<RoomAudience> {
  if (!Types.ObjectId.isValid(room.id)) return NONE;
  if (room.kind === 'POD') {
    const pod = await PodModel.findById(room.id)
      .select('pod_title pod_hosts_id pod_attendees')
      .lean();
    if (!pod) return NONE;
    const joined = await PodMemberModel.find({ pod_id: pod._id, status: 'JOINED' }).select('user_id').lean();
    const ids = [
      ...(pod.pod_hosts_id || []).map(String),
      ...(pod.pod_attendees || []).map(String),
      ...joined.map((m) => String(m.user_id)),
    ];
    return { ids: [...new Set(ids)], title: pod.pod_title ?? '', link: `/chats/${room.id}` };
  }
  const club = await ClubModel.findOne({ _id: room.id, is_active: true })
    .select('club_name admin_user_ids host_ids')
    .lean();
  if (!club) return NONE;
  const followers = await ClubFollowerModel.find({ club_id: room.id }).select('user_id').lean();
  const ids = [
    ...(club.admin_user_ids || []).map(String),
    ...(club.host_ids || []).map(String),
    ...followers.map((f) => String(f.user_id)),
  ];
  return { ids: [...new Set(ids)], title: club.club_name ?? '', link: `/chats/club/${room.id}` };
}

/** Most people a mention may name in one message. */
export const MAX_MENTIONS = 20;

/**
 * The mentions a sender may make: unique, valid ids of the room's members,
 * never the sender. Anything else is refused rather than silently dropped, so
 * a client that shows a mention never sends one nobody receives.
 */
export function validMentions(requested: ReadonlyArray<string> | null | undefined, audience: ReadonlyArray<string>, senderId: string) {
  const unique = [...new Set((requested ?? []).map(String))].filter((id) => id !== senderId);
  if (unique.length > MAX_MENTIONS) return { ok: false as const, reason: 'TOO_MANY' as const };
  const members = new Set(audience);
  if (unique.some((id) => !members.has(id))) return { ok: false as const, reason: 'NOT_MEMBER' as const };
  return { ok: true as const, ids: unique };
}

const DEFAULT_MEMBER_LIMIT = 20;
const MAX_MEMBER_LIMIT = 50;

/**
 * A club room's members for the @ list, members only: its admins, hosts and
 * followers whose first or last name starts with `search`, at most `limit`.
 * Ids are read once (indexed by club), then ONE user query filters and caps.
 */
export async function clubChatMembers(clubId: string, userId: string, search?: string | null, limit?: number | null) {
  await assertRoomMember({ kind: 'CLUB', id: clubId }, userId);
  const { ids } = await roomAudience({ kind: 'CLUB', id: clubId });
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return [];
  const cap = Math.min(MAX_MEMBER_LIMIT, Math.max(1, limit ?? DEFAULT_MEMBER_LIMIT));
  const filter: Record<string, unknown> = { _id: { $in: valid } };
  const term = (search ?? '').trim();
  if (term) {
    const pattern = new RegExp(`^${escapeRegExp(term)}`, 'i');
    filter.$or = [{ 'profile.first_name': pattern }, { 'profile.last_name': pattern }];
  }
  const users = await UserModel.find(filter)
    .select('profile.first_name profile.last_name profile.profile_photo')
    .sort({ 'profile.first_name': 1 })
    .limit(cap)
    .lean<{ _id: unknown; profile?: { first_name?: string; last_name?: string; profile_photo?: string } }[]>();
  return users.map((u) => ({
    user_id: String(u._id),
    full_name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'Member',
    profile_photo: u.profile?.profile_photo || null,
  }));
}
