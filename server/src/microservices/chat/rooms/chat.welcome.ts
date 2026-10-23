import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import type { ChatRoomRef } from './chat.access';
import { ChatMuteModel, claimChatNotify } from './chatState.model';

/**
 * What happens the moment someone becomes a member of a chat room — by booking
 * a pod (free, paid or rejoined) or following a club:
 *
 *  - any mute they left on this room from an earlier membership is cleared, so
 *    every new message alerts them from now on (membership itself is read per
 *    message by `roomAudience`, so nothing else has to be switched on);
 *  - one in-app notification (inbox + push) says they joined and opens the room.
 *
 * Once per join: `joinKey` names this membership event (the booking or the
 * follow row, plus when it happened), claimed first so a retried payment
 * finalize or a replayed request never welcomes twice. A rejoin is a new event.
 * Fire-and-forget: a failure is logged and never fails the join.
 */
export async function welcomeToChatRoom(userId: string, room: ChatRoomRef, joinKey: string): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(room.id) || !Types.ObjectId.isValid(userId)) return;
    if (!(await claimChatNotify(`chat-join:${joinKey}`))) return;
    await ChatMuteModel.deleteOne({ user_id: String(userId), room_kind: room.kind, room_id: room.id });

    const title = await roomName(room);
    if (title === null) return;
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title: title ? `You joined the ${title} chat` : 'You joined the chat',
      body: "You'll get a notification for every new message here. Say hi to the group!",
      scope: 'USER',
      target_user_ids: [String(userId)],
      link_url: room.kind === 'POD' ? `/chats/${room.id}` : `/chats/club/${room.id}`,
      silent: false,
    });
  } catch (error) {
    logs.server.warn('chat.welcome', 'welcomeToChatRoom', { room: `${room.kind}:${room.id}`, error });
  }
}

/** The room's display name, '' when it has none, null when the room is gone. */
async function roomName(room: ChatRoomRef): Promise<string | null> {
  if (room.kind === 'POD') {
    const pod = await PodModel.findById(room.id).select('pod_title').lean();
    return pod ? (pod.pod_title ?? '') : null;
  }
  const club = await ClubModel.findOne({ _id: room.id, is_active: true }).select('club_name').lean();
  return club ? (club.club_name ?? '') : null;
}

/** The chat room a booking of `podId` belongs to: the pod's own room. */
export async function podChatRoomOf(podId: unknown): Promise<ChatRoomRef | null> {
  if (!Types.ObjectId.isValid(String(podId))) return null;
  const pod = await PodModel.findById(podId).select('_id').lean();
  if (!pod) return null;
  return { kind: 'POD', id: String(pod._id) };
}

/** Welcome a member to the chat of the pod they just booked. */
export async function welcomeToPodChat(userId: string, podId: unknown, joinKey: string): Promise<void> {
  try {
    const room = await podChatRoomOf(podId);
    if (room) await welcomeToChatRoom(userId, room, joinKey);
  } catch (error) {
    logs.server.warn('chat.welcome', 'welcomeToPodChat', { pod_id: String(podId), error });
  }
}
