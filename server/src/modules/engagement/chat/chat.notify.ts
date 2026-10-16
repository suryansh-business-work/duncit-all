/**
 * A push for a new chat message, sent to the room's members who are NOT
 * looking at the room right now.
 *
 * Throttled twice so a lively room never turns into a buzzing phone: a member
 * hears about a room at most once per `PER_MEMBER_GAP_MS`, and a room fans out
 * at most once per `PER_ROOM_GAP_MS` (a busy club can have thousands of
 * members). Members who blocked the sender, or whom the sender blocked, are
 * never pushed about them. Fire-and-forget: a failed push is logged and never
 * fails the message that triggered it.
 */
import { Types } from 'mongoose';
import { getIo } from '@realtime/io';
import { logs } from '@observability/log';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { blockedPeerIds, socketRoomOf, type ChatRoomRef } from './chat.access';

const PER_MEMBER_GAP_MS = 10 * 60_000;
const PER_ROOM_GAP_MS = 60_000;
/** Bounded so a process that runs for weeks does not grow these maps forever. */
const MAX_TRACKED = 50_000;

const lastRoomPush = new Map<string, number>();
const lastMemberPush = new Map<string, number>();

function remember(map: Map<string, number>, key: string, at: number) {
  if (map.size >= MAX_TRACKED) map.clear();
  map.set(key, at);
}

async function roomMemberIds(room: ChatRoomRef): Promise<{ ids: string[]; title: string; link: string }> {
  if (room.kind === 'POD') {
    const pod = await PodModel.findById(room.id).select('pod_title pod_hosts_id pod_attendees').lean();
    if (!pod) return { ids: [], title: '', link: '' };
    const joined = await PodMemberModel.find({ pod_id: room.id, status: 'JOINED' }).select('user_id').lean();
    const ids = [
      ...(pod.pod_hosts_id || []).map(String),
      ...(pod.pod_attendees || []).map(String),
      ...joined.map((m) => String(m.user_id)),
    ];
    return { ids, title: pod.pod_title ?? '', link: `/chats/${room.id}` };
  }
  const club = await ClubModel.findById(room.id).select('club_name admin_user_ids host_ids').lean();
  if (!club) return { ids: [], title: '', link: '' };
  const followers = await ClubFollowerModel.find({ club_id: room.id }).select('user_id').lean();
  const ids = [
    ...(club.admin_user_ids || []).map(String),
    ...(club.host_ids || []).map(String),
    ...followers.map((f) => String(f.user_id)),
  ];
  return { ids, title: club.club_name ?? '', link: `/chats/club/${room.id}` };
}

/** Members with this room open on some device — they already see the message. */
async function presentIds(room: ChatRoomRef): Promise<Set<string>> {
  const present = new Set<string>();
  try {
    const sockets = await getIo().in(socketRoomOf(room)).fetchSockets();
    for (const socket of sockets) {
      for (const name of socket.rooms) if (name.startsWith('user:')) present.add(name.slice(5));
    }
  } catch {
    // No socket server (scripts, tests): nobody is present, push everyone.
  }
  return present;
}

export async function notifyNewChatMessage(opts: {
  room: ChatRoomRef;
  senderId: string;
  senderName: string;
  preview: string;
  now?: number;
}): Promise<void> {
  const { room, senderId, senderName, preview } = opts;
  const now = opts.now ?? Date.now();
  const roomKey = socketRoomOf(room);
  if (now - (lastRoomPush.get(roomKey) ?? 0) < PER_ROOM_GAP_MS) return;
  remember(lastRoomPush, roomKey, now);
  try {
    const { ids, title, link } = await roomMemberIds(room);
    const [present, blocked] = await Promise.all([presentIds(room), blockedPeerIds(senderId)]);
    const targets = [...new Set(ids)].filter((id) => {
      if (id === senderId || present.has(id) || blocked.has(id) || !Types.ObjectId.isValid(id)) {
        return false;
      }
      return now - (lastMemberPush.get(`${roomKey}:${id}`) ?? 0) >= PER_MEMBER_GAP_MS;
    });
    if (targets.length === 0) return;
    for (const id of targets) remember(lastMemberPush, `${roomKey}:${id}`, now);
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.fanOutPush(
      { _id: `chat:${roomKey}:${now}`, title, body: `${senderName}: ${preview}`, link_url: link },
      targets
    );
  } catch (error) {
    logs.server.warn('chat.notify', 'notifyNewChatMessage', { room: roomKey, error });
  }
}

/** Test seam: forget every throttle. */
export function resetChatNotifyThrottle() {
  lastRoomPush.clear();
  lastMemberPush.clear();
}
