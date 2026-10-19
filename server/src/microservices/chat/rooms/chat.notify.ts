/**
 * What happens for every new chat message beyond the room broadcast, for the
 * room's members who are NOT looking at the room right now:
 *
 *  - an app-wide `chat:new` frame on their user socket, so an open app pings
 *    and shows a toast;
 *  - a push, so a closed app (or another device) shows a notification.
 *
 * Like WhatsApp, each message notifies, and every push for a room carries the
 * room's tag, so a device keeps one notification per room and refreshes it with
 * the latest line rather than stacking one per message. The apps hide a chat
 * push while they are in the foreground — the `chat:new` toast is that alert.
 *
 * Never the sender, never anyone either side has blocked, never a member who
 * muted the room — unless the message @-mentions them, which always alerts.
 *
 * Once per message: a unique claim on the message id is taken first, so a
 * retried or replayed call stops before anyone is alerted twice.
 * Fire-and-forget: a failure is logged and never fails the message.
 */
import { Types } from 'mongoose';
import { getIo, userRoom } from '@realtime/io';
import { logs } from '@observability/log';
import { blockedPeerIds, socketRoomOf, type ChatRoomRef } from './chat.access';
import { roomAudience } from './chat.members';
import { chatMuteService } from './chat.mute';
import { claimChatNotify } from './chatState.model';

/** The app-wide socket event; `@duncit/utils` CHAT_NEW_EVENT on the clients. */
export const CHAT_NEW_EVENT = 'chat:new';

/** Members with this room open on some device — they already see the message. */
async function presentIds(room: ChatRoomRef): Promise<Set<string>> {
  const present = new Set<string>();
  try {
    const sockets = await getIo().in(socketRoomOf(room)).fetchSockets();
    for (const socket of sockets) {
      for (const name of socket.rooms) if (name.startsWith('user:')) present.add(name.slice(5));
    }
  } catch {
    // No socket server (scripts, tests): nobody is present, alert everyone.
  }
  return present;
}

export interface NewChatMessage {
  room: ChatRoomRef;
  messageId: string;
  senderId: string;
  senderName: string;
  /** The line as a push shows it. */
  preview: string;
  /** TEXT / IMAGE / STICKER, so an app can word a photo in its own language. */
  type: string;
  /** Members the message @-mentions (already checked against the room). */
  mentions?: ReadonlyArray<string>;
}

/**
 * Who is alerted: members other than the sender, away from the room, not
 * blocked either way, and not muted — a mention cuts through a mute.
 */
export function alertTargets(opts: {
  members: ReadonlyArray<string>;
  senderId: string;
  present: ReadonlySet<string>;
  blocked: ReadonlySet<string>;
  muted: ReadonlySet<string>;
  mentioned: ReadonlySet<string>;
}): string[] {
  return [...new Set(opts.members)].filter(
    (id) =>
      id !== opts.senderId &&
      !opts.present.has(id) &&
      !opts.blocked.has(id) &&
      Types.ObjectId.isValid(id) &&
      (!opts.muted.has(id) || opts.mentioned.has(id))
  );
}

function emitChatNew(targets: string[], frame: Record<string, unknown>) {
  if (targets.length === 0) return;
  try {
    getIo()
      .to(targets.map(userRoom))
      .emit(CHAT_NEW_EVENT, frame);
  } catch {
    // Socket server not initialised (scripts, tests). The push still goes.
  }
}

export async function notifyNewChatMessage(msg: NewChatMessage): Promise<void> {
  const { room, senderId, senderName, preview } = msg;
  const roomKey = socketRoomOf(room);
  try {
    if (!(await claimChatNotify(`chat:${msg.messageId}`))) return;
    const { ids, title, link } = await roomAudience(room);
    const mentioned = new Set(msg.mentions ?? []);
    const [present, blocked, muted] = await Promise.all([
      presentIds(room),
      blockedPeerIds(senderId),
      chatMuteService.mutedUserIds(room.kind, room.id),
    ]);
    const targets = alertTargets({ members: ids, senderId, present, blocked, muted, mentioned });
    if (targets.length === 0) return;

    const frame = {
      room_kind: room.kind,
      room_id: room.id,
      message_id: msg.messageId,
      title,
      sender_name: senderName,
      preview,
      type: msg.type,
    };
    emitChatNew(targets.filter((id) => mentioned.has(id)), { ...frame, mentioned: true });
    emitChatNew(targets.filter((id) => !mentioned.has(id)), { ...frame, mentioned: false });

    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.fanOutPush(
      {
        _id: `chat:${msg.messageId}`,
        title,
        body: `${senderName}: ${preview}`,
        link_url: link,
        tag: `chat:${roomKey}`,
      },
      targets
    );
  } catch (error) {
    logs.server.warn('chat.notify', 'notifyNewChatMessage', { room: roomKey, error });
  }
}
